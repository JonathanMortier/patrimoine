import { describe, expect, it, beforeEach } from 'vitest'
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

import { deleteDb } from '../../db'
import { setup, lock } from '../../crypto/security'
import { monthRepo, newMonth } from '../../db/repos/months'
import { creditsRepo } from '../../db/repos/credits'
import { constantesRepo } from '../../db/repos/constantes'
import {
  BackupError,
  collectBackupData,
  createBackupFile,
  createBackupJson,
  parseBackupFile,
  parseBackupString,
  restoreBackupData,
  backupFileName,
  MAX_PBKDF2_ITERATIONS,
} from '../backup'

const ITER = 2_000

async function seed(): Promise<void> {
  const m = newMonth('2026-08')
  m.bourse.cto = 12345
  m.horsImmo.compteCourantCa = 6400
  await monthRepo.save(m)
  await creditsRepo.save({
    id: 'loan-1',
    nom: 'Nardouzans',
    numero: 1353608,
    dateDepart: '2020-10-05',
    dateFin: '2027-10-04',
    taux: 0.006,
    mensualite: 667.48,
    montant: 54894,
    restant: 5328.13,
    pctRembourse: 90.29,
  })
  await constantesRepo.save({ ...(await constantesRepo.get()), btcUsd: 82000 })
}

beforeEach(async () => {
  lock()
  await deleteDb('patrimoine')
})

describe('backup : chiffrement autonome', () => {
  it('construit et relit un fichier avec le bon mot de passe', async () => {
    await setup('motdepasse', ITER)
    await seed()

    const data = await collectBackupData()
    expect(data.months).toHaveLength(1)
    expect(data.credits).toHaveLength(1)
    expect(data.constantes.btcUsd).toBe(82000)

    const json = await createBackupJson(data, 'import-pw', ITER)
    const round = await parseBackupString(json, 'import-pw')
    expect(round.months[0].bourse.cto).toBe(12345)
    expect(round.credits[0].numero).toBe(1353608)

    const parsed = await parseBackupFile(JSON.parse(json) as never, 'import-pw')
    expect(parsed.exportedAt).toBeDefined()
  })

  it('refuse un mauvais mot de passe ou un fichier altéré', async () => {
    const data = await createBackupFile(JSON.stringify({ constantes: {} }), 'pw', ITER)
    await expect(parseBackupFile(data, 'mauvais')).rejects.toThrow(BackupError)
    const tampered = { ...data, payload: data.payload.slice(0, -4) + 'AAAA' }
    await expect(parseBackupFile(tampered, 'pw')).rejects.toThrow()
  })

  it('refuse un nombre d’itérations PBKDF2 hors bornes (anti-DoS)', async () => {
    const data = await createBackupFile(JSON.stringify({ exportedAt: 'x' }), 'pw', ITER)
    await expect(parseBackupFile({ ...data, iterations: 0 }, 'pw')).rejects.toThrow(BackupError)
    await expect(parseBackupFile({ ...data, iterations: -5 }, 'pw')).rejects.toThrow(BackupError)
    await expect(parseBackupFile({ ...data, iterations: 1.5 }, 'pw')).rejects.toThrow(BackupError)
    await expect(parseBackupFile({ ...data, iterations: MAX_PBKDF2_ITERATIONS + 1 }, 'pw')).rejects.toThrow(BackupError)
  })

  it('rejette une sauvegarde restaurée dont la structure est invalide', async () => {
    await setup('motdepasse', ITER)
    const validConstantes = {
      btcEur: 0, btcUsd: 77429, eth: 0, sol: 0, convUsdEur: 1.14, plafondPea: 150000,
      dateOuverturePea: '', tauxRendement: 0.07, mensualiteTradeRep: 710, mensualiteFortuneo: 600,
      googleClientId: '',
    }
    await expect(restoreBackupData(null)).rejects.toThrow(BackupError)
    await expect(restoreBackupData('x')).rejects.toThrow(BackupError)
    await expect(restoreBackupData({ exportedAt: 'x', constantes: {}, months: [], credits: [] })).rejects.toThrow(BackupError)
    await expect(restoreBackupData({ exportedAt: 'x', constantes: validConstantes, months: [{ id: 'garbage', bourse: {} }], credits: [] })).rejects.toThrow(BackupError)
    await expect(restoreBackupData({ exportedAt: 'x', constantes: validConstantes, months: [{ id: '2026-01', bourse: { cto: 'NaN' } }], credits: [] })).rejects.toThrow(BackupError)
    await expect(restoreBackupData({ exportedAt: 'x', constantes: validConstantes, months: [], credits: [{ nom: '' }] })).rejects.toThrow(BackupError)
  })

  it('restaure : remplace les mois, prêts et constantes', async () => {
    await setup('motdepasse', ITER)
    await seed()

    const backup = await parseBackupString(await createBackupJson(await collectBackupData(), 'pw', ITER), 'pw')

    lock()
    await deleteDb('patrimoine')
    await setup('newpass', ITER)

    expect(await monthRepo.all()).toHaveLength(0)
    await restoreBackupData(backup)

    const months = await monthRepo.all()
    expect(months).toHaveLength(1)
    expect(months[0].bourse.cto).toBe(12345)
    expect(await creditsRepo.all()).toHaveLength(1)
    expect((await constantesRepo.get()).btcUsd).toBe(82000)
  })

  it('génère un nom de fichier daté patrimoine-backup-YYYY-MM-DD.json', () => {
    expect(backupFileName(new Date(2026, 8, 5))).toBe('patrimoine-backup-2026-09-05.json')
  })
})