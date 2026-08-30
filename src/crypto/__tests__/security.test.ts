import { beforeEach, describe, expect, it } from 'vitest'
import { deleteDb, readRecord } from '../../db'
import { STORES } from '../../db/schema'
import { readSecurityMeta } from '../../db/securityStore'
import { monthRepo, newMonth } from '../../db/repos/months'
import {
  LockedError,
  PasswordError,
  changePassword,
  isUnlocked,
  lock,
  securityStatus,
  sessionKey,
  setup,
  unlock,
} from '../security'

const ITER = 2_000

beforeEach(async () => {
  lock()
  await deleteDb('patrimoine')
})

describe('cycle initial', () => {
  it('démarre non initialisé puis setup déverrouille', async () => {
    expect(await securityStatus()).toBe('uninitialized')
    await setup('motdepasse', ITER)
    expect(await securityStatus()).toBe('unlocked')
    expect(isUnlocked()).toBe(true)
    expect(sessionKey()).toBeDefined()
  })

  it('refuse un mot de passe trop court et un double setup', async () => {
    await expect(setup('abc', ITER)).rejects.toThrow(PasswordError)
    await setup('motdepasse', ITER)
    await expect(setup('motdepasse', ITER)).rejects.toThrow(PasswordError)
  })

  it('stocker chiffré : le payload ne contient pas le JSON en clair', async () => {
    await setup('motdepasse', ITER)
    const month = newMonth('2026-08')
    month.bourse.cto = 12345
    await monthRepo.save(month)

    const raw = await readRecord(STORES.months, '2026-08')
    expect(raw?.includes('.')).toBe(true)
    expect(raw?.includes('"bourse"')).toBe(false)
    expect(raw?.includes('12345')).toBe(false)
  })
})

describe('verrouillage / déverrouillage', () => {
  it('verrouille et refuse les accès tant que verrouillé', async () => {
    await setup('motdepasse', ITER)
    const month = newMonth('2026-08')
    await monthRepo.save(month)

    lock()
    expect(await securityStatus()).toBe('locked')
    expect(isUnlocked()).toBe(false)
    await expect(monthRepo.get('2026-08')).rejects.toThrow(LockedError)
    await expect(monthRepo.save(newMonth('2026-09'))).rejects.toThrow(LockedError)
  })

  it('mauvais mot de passe reste verrouillé ; le bon déverrouille et déchiffre', async () => {
    await setup('motdepasse', ITER)
    const month = newMonth('2026-08')
    month.horsImmo.compteCourant = 6400
    await monthRepo.save(month)
    lock()

    await expect(unlock('mauvais')).rejects.toThrow(PasswordError)
    expect(await securityStatus()).toBe('locked')

    await unlock('motdepasse')
    expect(await securityStatus()).toBe('unlocked')
    expect((await monthRepo.get('2026-08'))?.horsImmo.compteCourant).toBe(6400)
  })

  it('changePassword est refusé tant que verrouillé', async () => {
    await setup('motdepasse', ITER)
    lock()
    await expect(changePassword('motdepasse', 'nouveau', ITER)).rejects.toThrow(LockedError)
  })
})

describe('changement de mot de passe', () => {
  it('re-protège la DEK sans re-chiffrer les données ; l’ancien mot de passe devient invalide', async () => {
    await setup('motdepasse', ITER)
    const month = newMonth('2026-08')
    month.crypto.btc = 0.5
    await monthRepo.save(month)

    const rawBefore = await readRecord(STORES.months, '2026-08')

    await changePassword('motdepasse', 'nouveau123', ITER)

    // Les données ne sont pas ré-chiffrées (même payload).
    expect(await readRecord(STORES.months, '2026-08')).toBe(rawBefore)

    lock()
    await expect(unlock('motdepasse')).rejects.toThrow(PasswordError)
    await unlock('nouveau123')
    expect(await securityStatus()).toBe('unlocked')
    expect((await monthRepo.get('2026-08'))?.crypto.btc).toBe(0.5)
  })
})

describe('coexistence en clair et chiffré', () => {
  it('les métadonnées de sécurité restent lisibles sans déverrouillage', async () => {
    await setup('motdepasse', ITER)
    lock()
    expect(await securityStatus()).toBe('locked')
    const meta = await readSecurityMeta()
    expect(meta?.wrappedDek.data.length).toBeGreaterThan(0)
    expect(meta?.salt.length).toBeGreaterThan(0)
  })
})