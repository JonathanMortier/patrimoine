import {
  decryptData,
  deriveKek,
  encryptData,
  generateDek,
  unwrapDek,
  wrapDek,
} from '../crypto/aes'
import { PBKDF2_ITERATIONS, SALT_BYTES } from '../crypto/constants'
import { base64ToBytes, bytesToBase64, fromText, randomBytes, toText } from '../crypto/util'
import type { WrappedKey } from '../db/securityStore'
import type { Constantes, Loan, MonthRecord } from '../db/schema'
import { constantesRepo } from '../db/repos/constantes'
import { creditsRepo, loanKey } from '../db/repos/credits'
import { monthRepo } from '../db/repos/months'

export const BACKUP_FILE_PREFIX = 'patrimoine-backup'
export const BACKUP_APP = 'patrimoine'

export class BackupError extends Error {}

/** Fichier de sauvegarde chiffré, autonome : le sel, le KDF et la DEK wrappée
 *  sont embarqués — il se déchiffre sur n'importe quel appareil avec le mot de
 *  passe (même mécanisme que la base : PBKDF2 + AES-256-GCM). */
export interface BackupFile {
  app: string
  kind: 'patrimoine-backup'
  version: 1
  createdAt: string
  iterations: number
  salt: string
  wrappedDek: WrappedKey
  payload: string
}

/** Contenu en clair d'une sauvegarde (sérialisé en JSON avant chiffrement). */
export interface BackupData {
  exportedAt: string
  constantes: Constantes
  months: MonthRecord[]
  credits: Loan[]
}

export function backupFileName(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${BACKUP_FILE_PREFIX}-${y}-${m}-${d}.json`
}

export async function collectBackupData(): Promise<BackupData> {
  const [constantes, months, credits] = await Promise.all([
    constantesRepo.get(),
    monthRepo.all(),
    creditsRepo.all(),
  ])
  return { exportedAt: new Date().toISOString(), constantes, months, credits }
}

export async function createBackupFile(
  text: string,
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<BackupFile> {
  const salt = randomBytes(SALT_BYTES)
  const kek = await deriveKek(password, salt, iterations)
  const dek = await generateDek()
  const wrappedDek = await wrapDek(dek, kek)
  const payload = await encryptData(toText(text), dek)
  return {
    app: BACKUP_APP,
    kind: 'patrimoine-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    iterations,
    salt: bytesToBase64(salt),
    wrappedDek,
    payload,
  }
}

export async function createBackupJson(
  data: BackupData,
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<string> {
  return JSON.stringify(await createBackupFile(JSON.stringify(data), password, iterations))
}

export async function parseBackupFile(
  file: BackupFile,
  password: string,
): Promise<BackupData> {
  if (file.kind !== 'patrimoine-backup' || file.version !== 1) {
    throw new BackupError('Fichier de sauvegarde invalide.')
  }
  let kek: CryptoKey
  try {
    kek = await deriveKek(password, base64ToBytes(file.salt), file.iterations)
  } catch {
    throw new BackupError('Mot de passe incorrect ou fichier altéré.')
  }
  let dek: CryptoKey
  try {
    dek = await unwrapDek(file.wrappedDek, kek)
  } catch {
    throw new BackupError('Mot de passe incorrect ou fichier altéré.')
  }
  const plain = fromText(await decryptData(file.payload, dek))
  return JSON.parse(plain) as BackupData
}

export async function parseBackupString(
  json: string,
  password: string,
): Promise<BackupData> {
  const file = JSON.parse(json) as BackupFile
  if (!file || typeof file !== 'object') throw new BackupError('Fichier de sauvegarde invalide.')
  return parseBackupFile(file, password)
}

/** Remplace les données courantes par celles de la sauvegarde (chiffrées à
 *  l'écriture sous la DEK de session active). */
export async function restoreBackupData(data: BackupData): Promise<void> {
  for (const id of await monthRepo.ids()) await monthRepo.remove(id)
  for (const month of data.months) await monthRepo.save(month)

  const existingCredits = await creditsRepo.all()
  for (const credit of existingCredits) await creditsRepo.remove(loanKey(credit))
  for (const credit of data.credits) await creditsRepo.save(credit)

  await constantesRepo.save(data.constantes)
}