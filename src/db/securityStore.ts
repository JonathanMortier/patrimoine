import { readRecord, writeRecord } from './index'
import { STORES } from './schema'

export interface WrappedKey {
  iv: string
  data: string
}

/**
 * Métadonnées de sécurité, stockées EN CLAIR (non sensibles) : le sel, le
 * nombre d'itérations PBKDF2, le vérifier (chiffré par la KEK) et la DEK
 * wrappée (chiffrée par la KEK). Rien ici ne permet de retrouver les données.
 */
export interface SecurityMeta {
  version: 1
  salt: string
  iterations: number
  verifier: string
  wrappedDek: WrappedKey
}

const KEY = 'meta'

export async function readSecurityMeta(): Promise<SecurityMeta | undefined> {
  const raw = await readRecord(STORES.security, KEY)
  return raw === undefined ? undefined : (JSON.parse(raw) as SecurityMeta)
}

export async function writeSecurityMeta(meta: SecurityMeta): Promise<void> {
  await writeRecord(STORES.security, KEY, JSON.stringify(meta))
}