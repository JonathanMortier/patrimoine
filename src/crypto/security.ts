import {
  checkVerifier,
  deriveKek,
  generateDek,
  makeVerifier,
  unwrapDek,
  wrapDek,
} from './aes'
import { createAesCodec } from './codec'
import { PBKDF2_ITERATIONS, SALT_BYTES } from './constants'
import { readSecurityMeta, writeSecurityMeta } from '../db/securityStore'
import { setActiveCodec } from '../db/codec'
import { base64ToBytes, bytesToBase64, randomBytes } from './util'

export class LockedError extends Error {
  constructor(message = 'Application verrouillée.') {
    super(message)
  }
}

export class PasswordError extends Error {
  constructor(message: string) {
    super(message)
  }
}

let dek: CryptoKey | null = null
let codecInstalled = false

export function isUnlocked(): boolean {
  return dek !== null
}

export function sessionKey(): CryptoKey {
  if (!dek) throw new LockedError()
  return dek
}

function installAesCodec(): void {
  if (codecInstalled) return
  setActiveCodec(createAesCodec(sessionKey))
  codecInstalled = true
}

export function lock(): void {
  dek = null
}

export async function securityStatus(): Promise<'uninitialized' | 'locked' | 'unlocked'> {
  if (isUnlocked()) return 'unlocked'
  return (await readSecurityMeta()) ? 'locked' : 'uninitialized'
}

function assertPassword(password: string): void {
  if (password.length < 4) throw new PasswordError('Le mot de passe doit faire au moins 4 caractères.')
}

export async function setup(password: string, iterations = PBKDF2_ITERATIONS): Promise<void> {
  assertPassword(password)
  if (await readSecurityMeta()) throw new PasswordError('Un mot de passe existe déjà.')
  const salt = randomBytes(SALT_BYTES)
  const kek = await deriveKek(password, salt, iterations)
  const newDek = await generateDek()
  const wrappedDek = await wrapDek(newDek, kek)
  const verifier = await makeVerifier(kek)
  await writeSecurityMeta({
    version: 1,
    salt: bytesToBase64(salt),
    iterations,
    verifier,
    wrappedDek,
  })
  dek = newDek
  installAesCodec()
}

export async function unlock(password: string): Promise<void> {
  const meta = await readSecurityMeta()
  if (!meta) throw new PasswordError('Aucun mot de passe n’est défini.')
  const kek = await deriveKek(password, base64ToBytes(meta.salt), meta.iterations)
  if (!(await checkVerifier(meta.verifier, kek))) {
    throw new PasswordError('Mot de passe incorrect.')
  }
  const newDek = await unwrapDek(meta.wrappedDek, kek)
  dek = newDek
  installAesCodec()
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<void> {
  assertPassword(newPassword)
  if (!isUnlocked()) throw new LockedError()
  const meta = await readSecurityMeta()
  if (!meta) throw new PasswordError('Aucun mot de passe n’est défini.')

  const oldKek = await deriveKek(oldPassword, base64ToBytes(meta.salt), meta.iterations)
  if (!(await checkVerifier(meta.verifier, oldKek))) {
    throw new PasswordError('Ancien mot de passe incorrect.')
  }
  // Seule la DEK wrappée est recalculée : les données ne sont pas ré-chiffrées.
  const currentDek = await unwrapDek(meta.wrappedDek, oldKek)
  const salt = randomBytes(SALT_BYTES)
  const newKek = await deriveKek(newPassword, salt, iterations)
  await writeSecurityMeta({
    version: 1,
    salt: bytesToBase64(salt),
    iterations,
    verifier: await makeVerifier(newKek),
    wrappedDek: await wrapDek(currentDek, newKek),
  })
}