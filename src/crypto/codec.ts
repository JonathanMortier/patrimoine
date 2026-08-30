import { decryptData, encryptData } from './aes'
import type { PayloadCodec } from '../db/codec'
import { fromText, toText } from './util'

/**
 * Codec AES-256-GCM. La clé est fournie au travers de `getKey`, qui renvoie la
 * DEK de session ou lève une LockedError si l'app est verrouillée : aucune
 * écriture en clair n'est alors possible.
 */
export function createAesCodec(getKey: () => CryptoKey): PayloadCodec {
  return {
    async encode(value: unknown): Promise<string> {
      return encryptData(toText(JSON.stringify(value)), getKey())
    },

    async decode<T>(payload: string): Promise<T> {
      const data = await decryptData(payload, getKey())
      return JSON.parse(fromText(data)) as T
    },
  }
}