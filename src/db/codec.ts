/**
 * Couche d'encodage du payload des enregistrements.
 *
 * Par défaut : codec "identité" (JSON en clair). Dès que la couche sécurité
 * s'installe (setup/unlock), un codec AES-256-GCM est activé via
 * `setActiveCodec` — les repositories n'ont pas à changer.
 */
export interface PayloadCodec {
  encode(value: unknown): Promise<string>
  decode<T>(payload: string): Promise<T>
}

class PassthroughCodec implements PayloadCodec {
  async encode(value: unknown): Promise<string> {
    return JSON.stringify(value)
  }

  async decode<T>(payload: string): Promise<T> {
    return JSON.parse(payload) as T
  }
}

let active: PayloadCodec = new PassthroughCodec()

export function setActiveCodec(codec: PayloadCodec): void {
  active = codec
}

export function encodePayload(value: unknown): Promise<string> {
  return active.encode(value)
}

export function decodePayload<T>(payload: string): Promise<T> {
  return active.decode<T>(payload)
}