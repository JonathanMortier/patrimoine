import { AES_NAME, DEK_BYTES, IV_BYTES, VERIFIER_PLAINTEXT } from './constants'
import { base64ToBytes, bufferOf, bytesToBase64, fromText, randomBytes, toText } from './util'
import type { WrappedKey } from '../db/securityStore'

function importAesKey(bytes: Uint8Array, extractable: boolean): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', bufferOf(bytes), AES_NAME, extractable, [
    'encrypt',
    'decrypt',
  ])
}

export function generateDek(): Promise<CryptoKey> {
  return importAesKey(randomBytes(DEK_BYTES), true)
}

export async function deriveKek(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', bufferOf(toText(password)), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: bufferOf(salt), iterations },
    material,
    DEK_BYTES * 8,
  )
  return importAesKey(new Uint8Array(bits), false)
}

export async function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<WrappedKey> {
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', dek))
  const iv = randomBytes(IV_BYTES)
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: AES_NAME, iv: bufferOf(iv) }, kek, bufferOf(raw)),
  )
  return { iv: bytesToBase64(iv), data: bytesToBase64(ct) }
}

export async function unwrapDek(wrapped: WrappedKey, kek: CryptoKey): Promise<CryptoKey> {
  const plain = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: AES_NAME, iv: bufferOf(base64ToBytes(wrapped.iv)) },
      kek,
      bufferOf(base64ToBytes(wrapped.data)),
    ),
  )
  return importAesKey(plain, true)
}

export async function encryptData(data: Uint8Array, key: CryptoKey): Promise<string> {
  const iv = randomBytes(IV_BYTES)
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: AES_NAME, iv: bufferOf(iv) }, key, bufferOf(data)),
  )
  return `${bytesToBase64(iv)}.${bytesToBase64(ct)}`
}

export async function decryptData(payload: string, key: CryptoKey): Promise<Uint8Array> {
  const sep = payload.indexOf('.')
  if (sep === -1) throw new Error('Payload chiffré invalide.')
  const iv = base64ToBytes(payload.slice(0, sep))
  const ct = base64ToBytes(payload.slice(sep + 1))
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: AES_NAME, iv: bufferOf(iv) }, key, bufferOf(ct)),
  )
}

export async function makeVerifier(kek: CryptoKey): Promise<string> {
  return encryptData(toText(VERIFIER_PLAINTEXT), kek)
}

export async function checkVerifier(payload: string, kek: CryptoKey): Promise<boolean> {
  try {
    return fromText(await decryptData(payload, kek)) === VERIFIER_PLAINTEXT
  } catch {
    return false
  }
}