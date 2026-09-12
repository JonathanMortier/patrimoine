import { describe, expect, it } from 'vitest'
import { dashboardSeries, missingMonths } from '../dashboard'
import { newMonth } from '../../db/repos/months'
import { DEFAULT_CONSTANTES } from '../../db/repos/constantes'
import { currentMonthId, addMonths } from '../../utils/date'

const CONST = { ...DEFAULT_CONSTANTES, convUsdEur: 1.14, btcEur: 50000, btcUsd: 77429 }

function month(id: string, overrides: Partial<{
  cto: number; pea: number; livretA: number; compteCourantCa: number
  investi: number; soldeDispo: number; revenuBrut: number; fiscalite: number
  tradeRep: number; ledger: number; hotWalletPrincipalUSD: number; btc: number
}> = {}) {
  const m = newMonth(id)
  if (overrides.cto !== undefined) m.bourse.cto = overrides.cto
  if (overrides.pea !== undefined) m.bourse.pea = overrides.pea
  if (overrides.compteCourantCa !== undefined) m.horsImmo.compteCourantCa = overrides.compteCourantCa
  if (overrides.livretA !== undefined) m.horsImmo.livretA = overrides.livretA
  if (overrides.investi !== undefined) m.crowdlending.investi = overrides.investi
  if (overrides.soldeDispo !== undefined) m.crowdlending.soldeDispo = overrides.soldeDispo
  if (overrides.revenuBrut !== undefined) m.crowdlending.revenuBrut = overrides.revenuBrut
  if (overrides.tradeRep !== undefined) m.crypto.tradeRep = overrides.tradeRep
  if (overrides.ledger !== undefined) m.crypto.ledger = overrides.ledger
  if (overrides.hotWalletPrincipalUSD !== undefined) m.crypto.hotWalletPrincipalUSD = overrides.hotWalletPrincipalUSD
  if (overrides.btc !== undefined) m.crypto.btc = overrides.btc
  return m
}

describe('dashboardSeries', () => {
  it('renvoie un tableau vide si aucun mois', () => {
    expect(dashboardSeries([], CONST)).toEqual([])
  })

  it('trie les mois et calcule totaux + variation', () => {
    const a = month('2026-06', { cto: 1000, pea: 500, compteCourantCa: 500, livretA: 2000 })
    const b = month('2026-07', { cto: 1000, pea: 500, compteCourantCa: 500, livretA: 2000 })
    const s = dashboardSeries([b, a], CONST)

    expect(s.map((p) => p.id)).toEqual(['2026-06', '2026-07'])
    expect(s[0].short).toBe('06/26')
    expect(s[0].variation).toBeNull()
    expect(s[1].variation).toBe(0)

    const expectedHorsImmo = 1000 + 500 + 0 + 0 + 0 + 500 + 2000
    expect(s[0].horsImmo).toBeCloseTo(expectedHorsImmo, 4)
    expect(s[1].horsImmo).toBeCloseTo(expectedHorsImmo, 4)
  })

  it('renseigne partBtc si btcEur fourni', () => {
    const m = month('2026-08', { tradeRep: 100, ledger: 200, hotWalletPrincipalUSD: 114, btc: 0.1 })
    m.crypto.hotWalletLedgerUSD = 0
    const s = dashboardSeries([m], CONST)
    const cryptoTotal = 300 + 100
    expect(s[0].partBtc).toBeCloseTo((0.1 * 50000) / cryptoTotal, 5)
  })

  it('calcule les variations par domaine vs mois précédent', () => {
    const a = month('2026-06', { cto: 1000, pea: 500, investi: 400, tradeRep: 100 })
    const b = month('2026-07', { cto: 1500, pea: 600, investi: 500, tradeRep: 80 })
    const s = dashboardSeries([b, a], CONST)

    expect(s[0].bourseVar).toBeNull()
    expect(s[0].assuranceVieVar).toBeNull()
    expect(s[0].crowdlendingVar).toBeNull()
    expect(s[0].cryptoVar).toBeNull()

    expect(s[1].bourseVar).toBe(600)
    expect(s[1].assuranceVieVar).toBe(0)
    expect(s[1].crowdlendingVar).toBe(100)
    expect(s[1].cryptoVar).toBe(-20)
  })

  it('labels courts sont au format MM/YY', () => {
    const m = month('2026-01')
    const s = dashboardSeries([m], CONST)
    expect(s[0].short).toBe('01/26')
  })
})

describe('missingMonths', () => {
  it('renvoie les mois manquants sur les 12 derniers', () => {
    const ids = [addMonths(currentMonthId(), -2)]
    const missing = missingMonths(ids)
    expect(missing).toContain(currentMonthId())
    expect(missing).toContain(addMonths(currentMonthId(), -1))
    expect(missing).not.toContain(ids[0])
  })

  it('renvoie tableau vide si tous les mois présents', () => {
    const ids: string[] = []
    for (let i = 0; i < 12; i++) ids.push(addMonths(currentMonthId(), -i))
    expect(missingMonths(ids)).toEqual([])
  })
})
