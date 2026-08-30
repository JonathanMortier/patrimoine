import { describe, expect, it } from 'vitest'
import { newMonth } from '../../db/repos/months'
import { DEFAULT_CONSTANTES } from '../../db/repos/constantes'
import { applyValues, buildFieldsHtml, groupTotal, monthLive, parseAmount } from '../fields'
import { currentMonthId } from '../../utils/date'

const conf = { ...DEFAULT_CONSTANTES, convUsdEur: 1.14, btcEur: 50000 }

describe('parseAmount', () => {
  it('accepte point et virgule décimale, ignore espaces et symboles', () => {
    expect(parseAmount('11844.02')).toBeCloseTo(11844.02, 5)
    expect(parseAmount('11 844,02 €')).toBeCloseTo(11844.02, 5)
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('abc')).toBe(0)
  })
})

describe('buildFieldsHtml', () => {
  it('génère un input pour chaque champ du schéma', () => {
    const m = newMonth('2026-08')
    m.bourse.cto = 16913.84
    m.horsImmo.livrets = 17502.76
    const html = buildFieldsHtml(m)
    expect(html).toContain('name="bourse.cto"')
    expect(html).toContain('name="crypto.hotWalletPrincipalUSD"')
    expect(html).toContain('name="horsImmo.livrets"')
    expect(html).toContain('16913.84')
    expect(html).toContain('17502.76')
  })
})

describe('applyValues', () => {
  it('applique les valeurs (décimales FR) au bon chemin', () => {
    const m = newMonth('2026-08')
    applyValues(m, {
      'bourse.cto': '11844',
      'bourse.pea': '29496,56',
      'horsImmo.livrets': '',
      'crypto.btc': '0,15',
    })
    expect(m.bourse.cto).toBe(11844)
    expect(m.bourse.pea).toBeCloseTo(29496.56, 4)
    expect(m.horsImmo.livrets).toBe(0)
    expect(m.crypto.btc).toBeCloseTo(0.15, 5)
    expect(m.id).toBe('2026-08')
  })
  it('ignore les chemins inconnus', () => {
    const m = newMonth('2026-01')
    applyValues(m, { 'bourse.zz': '99' })
    expect((m.bourse as unknown as Record<string, number>).zz).toBeUndefined()
  })
})

describe('groupTotal', () => {
  it('totalise chaque domaine', () => {
    const m = newMonth('2026-08')
    m.bourse = { cto: 16913.84, privateMk: 467.14, pea: 34312.95 }
    m.crypto = { tradeRep: 202.18, binance: 0, ledger: 6963.28, hotWalletPrincipalUSD: 7530.98, hotWalletLedgerUSD: 1744.45, defiUSD: 1740.55, btc: 0.15 }
    expect(groupTotal('bourse', m, conf)).toBeCloseTo(51693.93, 4)
    expect(groupTotal('crypto', m, conf)).toBeCloseTo(202.18 + 0 + 6963.28 + (7530.98 + 1744.45 + 1740.55) / 1.14, 4)
    expect(groupTotal('horsImmo', m, conf)).toBe(0)
  })
})

describe('monthLive', () => {
  it('reconstruit le hors immo et la variation', () => {
    const a = newMonth('2026-08')
    a.bourse = { cto: 16913.84, privateMk: 467.14, pea: 34312.95 }
    a.assuranceVie = { livretVie: 150.33, multiVie: 39306.06, cashFortuneo: 16370, linxea: 2491.1, scpi: 15150, investCumule: 0 }
    a.crowdlending = { investi: 8579.92, soldeDispo: 28.58, revenuBrut: 48.88 }
    a.crypto = { tradeRep: 202.18, binance: 0, ledger: 6963.28, hotWalletPrincipalUSD: 7530.98, hotWalletLedgerUSD: 1744.45, defiUSD: 1740.55, btc: 0.15 }
    a.horsImmo = { compteCourant: 10341.02, livrets: 17502.76 }

    const noPrev = monthLive(a, conf, null)
    const expected =
      10341.02 +
      17502.76 +
      (16913.84 + 467.14 + 34312.95) +
      (150.33 + 39306.06 + 16370 + 2491.1 + 15150) +
      (8579.92 + 28.58) +
      (202.18 + 6963.28 + (7530.98 + 1744.45 + 1740.55) / 1.14)
    expect(noPrev.horsImmoTotal).toBeCloseTo(expected, 2)
    expect(noPrev.variation).toBeNull()

    const withPrev = monthLive(a, conf, 181064.5)
    expect(withPrev.variation).toBeCloseTo(expected - 181064.5, 4)
    expect(withPrev.derived.partBtc).not.toBeNull()
  })
})

it('exports stables : currentMonthId reste accessible', () => {
  expect(currentMonthId()).toMatch(/^\d{4}-\d{2}$/)
})