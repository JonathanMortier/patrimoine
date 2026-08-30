import { describe, it, expect, beforeEach } from 'vitest'
import { deleteDb } from '../index'
import { monthRepo, newMonth } from '../repos/months'
import { constantesRepo, DEFAULT_CONSTANTES } from '../repos/constantes'
import { creditsRepo, loanKey } from '../repos/credits'
import { patrimoineRepo } from '../repos/patrimoine'
import type { Loan } from '../schema'

describe('repositories', () => {
  beforeEach(async () => {
    await deleteDb('patrimoine')
  })

  describe('monthRepo', () => {
    it('returns undefined for a missing month, then saves and reads it', async () => {
      expect(await monthRepo.get('2026-08')).toBeUndefined()

      const month = newMonth('2026-08')
      month.bourse.cto = 12500
      month.horsImmo.compteCourant = 4320.5

      await monthRepo.save(month)

      const read = await monthRepo.get('2026-08')
      expect(read?.bourse.cto).toBe(12500)
      expect(read?.horsImmo.compteCourant).toBe(4320.5)
    })

    it('stores records in chronological order', async () => {
      const a = newMonth('2026-01')
      const b = newMonth('2025-11')
      const c = newMonth('2026-08')
      await monthRepo.save(c)
      await monthRepo.save(a)
      await monthRepo.save(b)

      expect(await monthRepo.ids()).toEqual(['2025-11', '2026-01', '2026-08'])
      expect((await monthRepo.all()).map((m) => m.id)).toEqual([
        '2025-11',
        '2026-01',
        '2026-08',
      ])
    })

    it('removes a month', async () => {
      await monthRepo.save(newMonth('2026-08'))
      await monthRepo.remove('2026-08')
      expect(await monthRepo.get('2026-08')).toBeUndefined()
    })

    it('rejects invalid month ids', async () => {
      await expect(monthRepo.save({ ...newMonth('2026-08'), id: '2026-13' })).rejects.toThrow()
      await expect(monthRepo.get('bad')).rejects.toThrow()
    })
  })

  describe('constantesRepo', () => {
    it('returns defaults when empty', async () => {
      expect(await constantesRepo.get()).toEqual(DEFAULT_CONSTANTES)
    })

    it('saves and reads back custom values without mutating defaults', async () => {
      await constantesRepo.save({ ...DEFAULT_CONSTANTES, tauxRendement: 0.05, btcEur: 75000 })
      const read = await constantesRepo.get()
      expect(read.tauxRendement).toBe(0.05)
      expect(read.btcEur).toBe(75000)
      expect(read.mensualiteTradeRep).toBe(710)
      expect(DEFAULT_CONSTANTES.tauxRendement).toBe(0.07)
    })
  })

  describe('creditsRepo', () => {
    it('saves, lists sorted by date départ, and removes a loan', async () => {
      const later: Loan = {
        id: 'n2',
        nom: 'Nardouzans 2',
        numero: 1,
        dateDepart: '2023-06-01',
        dateFin: '2033-06-01',
        taux: 0.015,
        mensualite: 850,
        montant: 200000,
        restant: 120000,
        pctRembourse: 40,
      }
      const earlier: Loan = {
        id: 'b3',
        nom: 'Blanche 3',
        numero: 2,
        dateDepart: '2022-01-01',
        dateFin: '2032-01-01',
        taux: 0.012,
        mensualite: 700,
        montant: 150000,
        restant: 90000,
        pctRembourse: 40,
      }

      await creditsRepo.save(later)
      await creditsRepo.save(earlier)

      expect((await creditsRepo.all()).map((l) => l.id)).toEqual(['b3', 'n2'])
      expect(await creditsRepo.get(loanKey(earlier))).toMatchObject({ nom: 'Blanche 3' })

      await creditsRepo.remove(loanKey(earlier))
      expect(await creditsRepo.get(loanKey(earlier))).toBeUndefined()
      expect(await creditsRepo.get(loanKey(later))).toBeDefined()
    })
  })

  describe('patrimoineRepo', () => {
    it('saves accounts keyed by catégorie and lists them sorted', async () => {
      await patrimoineRepo.save({ categorie: 'livretA', societe: 'Caisse Épargne', montant: 12000 })
      await patrimoineRepo.save({ categorie: 'compteCourant', societe: 'Fortuneo', montant: 1500 })

      expect((await patrimoineRepo.all()).map((a) => a.categorie)).toEqual([
        'compteCourant',
        'livretA',
      ])
      expect(await patrimoineRepo.get('compteCourant')).toMatchObject({ montant: 1500 })

      await patrimoineRepo.remove('livretA')
      expect(await patrimoineRepo.get('livretA')).toBeUndefined()
    })
  })
})