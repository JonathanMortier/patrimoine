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
import { emptyMonth, monthRepo, normalizeMonth } from '../db/repos/months'
import { assertMonthId } from '../utils/date'

export const BACKUP_FILE_PREFIX = 'patrimoine-backup'
export const BACKUP_APP = 'patrimoine'

/** Taille max d'un fichier de sauvegarde (Mo) — borne mémoire/CPU du déchiffrement. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024

/** Borne haute du KDF : au-delà, on refuse (protection contre un fichier forgé). */
export const MAX_PBKDF2_ITERATIONS = 2_000_000

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
  if (typeof file !== 'object' || file === null || typeof password !== 'string') {
    throw new BackupError('Fichier de sauvegarde invalide.')
  }
  if (file.kind !== 'patrimoine-backup' || file.version !== 1 || file.app !== BACKUP_APP) {
    throw new BackupError('Fichier de sauvegarde invalide.')
  }
  if (
    !Number.isInteger(file.iterations) ||
    file.iterations < 1 ||
    file.iterations > MAX_PBKDF2_ITERATIONS ||
    typeof file.salt !== 'string'
  ) {
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
  let parsed: unknown
  try {
    parsed = JSON.parse(plain)
  } catch {
    throw new BackupError('Fichier de sauvegarde invalide.')
  }
  return validateBackupData(parsed)
}

export async function parseBackupString(
  json: string,
  password: string,
): Promise<BackupData> {
  let file: unknown
  try {
    file = JSON.parse(json)
  } catch {
    throw new BackupError('Fichier de sauvegarde invalide.')
  }
  if (!file || typeof file !== 'object') throw new BackupError('Fichier de sauvegarde invalide.')
  return parseBackupFile(file as BackupFile, password)
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

const MONTH_DOMAINS: (keyof MonthRecord)[] = ['bourse', 'assuranceVie', 'crowdlending', 'crypto', 'horsImmo']

function validateMonths(raw: unknown): MonthRecord[] {
  if (!Array.isArray(raw)) throw new BackupError('Sauvegarde invalide : liste des mois absente.')
  return raw.map((m) => {
    if (typeof m !== 'object' || m === null || typeof (m as MonthRecord).id !== 'string') {
      throw new BackupError('Sauvegarde invalide : mois mal formé.')
    }
    try {
      assertMonthId((m as MonthRecord).id)
    } catch {
      throw new BackupError('Sauvegarde invalide : mois mal formé.')
    }
    const record = m as MonthRecord
    for (const domain of MONTH_DOMAINS) {
      const domainValue = record[domain]
      if (typeof domainValue !== 'object' || domainValue === null) {
        throw new BackupError('Sauvegarde invalide : mois mal formé.')
      }
    }
    const month = normalizeMonth(record)
    for (const domain of MONTH_DOMAINS) {
      for (const key of Object.keys(emptyMonth()[domain] as object)) {
        const value = (month[domain] as unknown as Record<string, unknown>)[key]
        if (!isFiniteNumber(value)) {
          throw new BackupError(`Sauvegarde invalide : valeur non numérique dans un mois (${domain}.${key}).`)
        }
      }
    }
    return month
  })
}

function validateCredits(raw: unknown): Loan[] {
  if (!Array.isArray(raw)) throw new BackupError('Sauvegarde invalide : liste des prêts absente.')
  return raw.map((c) => {
    if (typeof c !== 'object' || c === null) throw new BackupError('Sauvegarde invalide : prêt mal formé.')
    const loan = c as Partial<Loan>
    if (typeof loan.nom !== 'string' || loan.nom.length === 0) {
      throw new BackupError('Sauvegarde invalide : prêt sans nom.')
    }
    for (const key of ['numero', 'taux', 'mensualite', 'montant', 'restant', 'pctRembourse'] as const) {
      if (!isFiniteNumber(loan[key])) {
        throw new BackupError(`Sauvegarde invalide : « ${loan.nom} » — ${key} non numérique.`)
      }
    }
    if (typeof loan.dateDepart !== 'string' || typeof loan.dateFin !== 'string') {
      throw new BackupError(`Sauvegarde invalide : « ${loan.nom} » — dates absentes.`)
    }
    const numero = loan.numero as number
    return {
      id: typeof loan.id === 'string' && loan.id !== '' ? loan.id : `${loan.nom}-${numero}`,
      nom: loan.nom,
      numero,
      dateDepart: loan.dateDepart,
      dateFin: loan.dateFin,
      taux: loan.taux as number,
      mensualite: loan.mensualite as number,
      montant: loan.montant as number,
      restant: loan.restant as number,
      pctRembourse: loan.pctRembourse as number,
    }
  })
}

const CONSTANTES_NUMERIC: (keyof Constantes)[] = [
  'btcEur', 'btcUsd', 'eth', 'sol', 'convUsdEur', 'plafondPea',
  'tauxRendement', 'mensualiteTradeRep', 'mensualiteFortuneo',
]

function validateConstantes(raw: unknown): Constantes {
  if (typeof raw !== 'object' || raw === null) throw new BackupError('Sauvegarde invalide : constantes absentes.')
  const constantes = raw as Partial<Constantes>
  for (const key of CONSTANTES_NUMERIC) {
    if (!isFiniteNumber(constantes[key])) {
      throw new BackupError(`Sauvegarde invalide : constante ${key} non numérique.`)
    }
  }
  if (typeof constantes.dateOuverturePea !== 'string' || typeof constantes.googleClientId !== 'string') {
    throw new BackupError('Sauvegarde invalide : constantes texte absentes.')
  }
  return constantes as Constantes
}

/** Valide et assainit le contenu déchiffré avant toute écriture en base. */
export function validateBackupData(data: unknown): BackupData {
  if (typeof data !== 'object' || data === null) throw new BackupError('Sauvegarde invalide.')
  const raw = data as Partial<BackupData>
  if (typeof raw.exportedAt !== 'string') throw new BackupError('Sauvegarde invalide : date d’export absente.')
  return {
    exportedAt: raw.exportedAt,
    constantes: validateConstantes(raw.constantes),
    months: validateMonths(raw.months),
    credits: validateCredits(raw.credits),
  }
}

/** Remplace les données courantes par celles de la sauvegarde (chiffrées à
 *  l'écriture sous la DEK de session active). La structure est validée avant
 *  toute écriture. */
export async function restoreBackupData(data: unknown): Promise<void> {
  const backup = validateBackupData(data)

  for (const id of await monthRepo.ids()) await monthRepo.remove(id)
  for (const month of backup.months) await monthRepo.save(month)

  const existingCredits = await creditsRepo.all()
  for (const credit of existingCredits) await creditsRepo.remove(loanKey(credit))
  for (const credit of backup.credits) await creditsRepo.save(credit)

  await constantesRepo.save(backup.constantes)
}
