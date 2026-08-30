import { describe, expect, it } from 'vitest'
import {
  deriveKek,
  generateDek,
  wrapDek,
  unwrapDek,
  encryptData,
  decryptData,
  makeVerifier,
  checkVerifier,
} from '../aes'
import { fromText, toText } from '../util'

describe('AES helpers', () => {
  it('chiffre/déchiffre un roundtrip', async () => {
    const key = await generateDek()
    const ct = await encryptData(toText('soldes secrets € 1234,56'), key)
    expect(ct).not.toContain('soldes')
    expect(fromText(await decryptData(ct, key))).toBe('soldes secrets € 1234,56')
  })

  it('produit des IV aléatoires (deux chiffrés d’un même texte diffèrent)', async () => {
    const key = await generateDek()
    const a = await encryptData(toText('x'), key)
    const b = await encryptData(toText('x'), key)
    expect(a).not.toBe(b)
  })

  it('rejette un payload altéré ou invalide', async () => {
    const key = await generateDek()
    const ct = await encryptData(toText('data'), key)
    const flipped = ct.slice(0, -1) + (ct.endsWith('A') ? 'B' : 'A')
    await expect(decryptData(flipped, key)).rejects.toThrow()
    await expect(decryptData('zzzz.yyyy', key)).rejects.toThrow()
  })

  it('deriveKek est déterministe pour les mêmes paramètres', async () => {
    const salt = new Uint8Array(16)
    const k1 = await deriveKek('motdepasse', salt, 1000)
    const k2 = await deriveKek('motdepasse', salt, 1000)
    const ct = await encryptData(toText('stable'), k1)
    expect(fromText(await decryptData(ct, k2))).toBe('stable')
  })

  it('wrap/unwrap DEK roundtrip ; un mauvais mot de passe échoue', async () => {
    const salt = new Uint8Array(16)
    const kek = await deriveKek('pw', salt, 1000)
    const dek = await generateDek()
    const wrapped = await wrapDek(dek, kek)

    const unwrapped = await unwrapDek(wrapped, kek)
    const ct = await encryptData(toText('secret'), dek)
    expect(fromText(await decryptData(ct, unwrapped))).toBe('secret')

    const badKek = await deriveKek('other', salt, 1000)
    await expect(unwrapDek(wrapped, badKek)).rejects.toThrow()
  })

  it('vérifier valide le bon mot de passe et refuse le mauvais', async () => {
    const salt = new Uint8Array(16)
    const goodKek = await deriveKek('pw', salt, 1000)
    const badKek = await deriveKek('bad', salt, 1000)
    const verifier = await makeVerifier(goodKek)
    expect(await checkVerifier(verifier, goodKek)).toBe(true)
    expect(await checkVerifier(verifier, badKek)).toBe(false)
  })
})