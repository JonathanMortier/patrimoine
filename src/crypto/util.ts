export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function toText(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function fromText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n))
}

export function bufferOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer as ArrayBuffer
}