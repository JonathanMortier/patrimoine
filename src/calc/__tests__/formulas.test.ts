import { describe, expect, it } from 'vitest'

import { bourseTotal, annualizeAPY } from '../bourse'
import { assuranceVieTotal } from '../assuranceVie'
import { crowdlendingApy, crowdlendingTotals, FISCALITE_RATE } from '../crowdlending'
import { cryptoBtcPart, cryptoTotals } from '../crypto'
import { horsImmoTotal, horsImmoVariation } from '../horsImmo'
import { computeMonthTotal, computeYearTotal, projectObjectif, withdrawalMonthly } from '../projection'
import { dateUnderPrincipal, monthsUnderPrincipal, monthlyReimbursement, pctRembourse, totals } from '../credits'
import { computeDerivedMonth } from '../index'
import { edate, diffDaysISO } from '../../utils/date'
import type { Constantes, MonthRecord } from '../../db/schema'

const C: Constantes = {
  btcEur: 52877.21,
  btcUsd: 0,
  eth: 1980,
  sol: 77.21,
  convUsdEur: 1.14,
  plafondPea: 150000,
  dateOuverturePea: '2024-08-01',
  tauxRendement: 0.07,
  mensualiteTradeRep: 710,
  mensualiteFortuneo: 600,
}

describe('horsImmo', () => {
  it('total = somme des comptes et domaines', () => {
    expect(horsImmoTotal({ compteCourant: 1000, livrets: 2000, bourse: 3000, assuranceVie: 4000, crowdlending: 500, crypto: 600 })).toBe(11100)
  })
  it('variation = différence vs mois précédent, null sans précédent', () => {
    expect(horsImmoVariation(120, 100)).toBe(20)
    expect(horsImmoVariation(120, null)).toBeNull()
  })
})

describe('crowdlending', () => {
  it('total = investi + solde dispo', () => {
    const t = crowdlendingTotals({ investi: 7000, soldeDispo: 300, revenuBrut: 50, fiscalite: 0 })
    expect(t.total).toBe(7300)
  })
  it("fiscalité = 30 % du brut, net = brut − fisc", () => {
    const t = crowdlendingTotals({ investi: 0, soldeDispo: 0, revenuBrut: 100, fiscalite: 0 })
    expect(FISCALITE_RATE).toBe(0.3)
    expect(t.fiscalite).toBe(30)
    expect(t.net).toBe(70)
  })
  it('fiscalité saisie : net = brut − fiscalité', () => {
    const t = crowdlendingTotals({ investi: 0, soldeDispo: 0, revenuBrut: 11.33, fiscalite: 2.5 })
    expect(t.fiscalite).toBe(2.5)
    expect(t.net).toBeCloseTo(8.83, 6)
  })
  it('apy : (total−base)/base × 365/jours', () => {
    expect(crowdlendingApy(7760, 7600, '2025-03-01', '2025-04-01')).toBeCloseTo(((7760 - 7600) / 7600) * 100 * (365 / 31), 8)
    expect(crowdlendingApy(7600, 7600, '2025-03-01', '2025-04-01')).toBe(0)
    expect(crowdlendingApy(0, 0, '2025-03-01', '2025-04-01')).toBe(0)
  })
})

describe('assuranceVie', () => {
  it('total = somme des comptes', () => {
    expect(assuranceVieTotal({ livretVie: 10, multiVie: 20, cashFortuneo: 30, linxea: 40, scpi: 50 })).toBe(150)
  })
})

describe('crypto', () => {
  it('total € = Σ wallets € + Σ wallets $ ÷ CONV', () => {
    const t = cryptoTotals({ tradeRep: 205.52, binance: 0, ledger: 4513.6, hotWalletPrincipalUSD: 6826.92, hotWalletLedgerUSD: 3080.42, defiUSD: 1536.72, btc: 0 }, 1.14)
    expect(t.totalEur).toBeCloseTo(205.52 + 4513.6 + (6826.92 + 3080.42 + 1536.72) / 1.14, 8)
  })
  it('part BTC = btceur/total', () => {
    expect(cryptoBtcPart(0.14, 52877.21, 14757.77)).toBeCloseTo((0.14 * 52877.21) / 14757.77, 8)
    expect(cryptoBtcPart(0.1, 1, 0)).toBeNull()
  })
})

describe('bourse', () => {
  it('total = CTO + Private Market + PEA', () => {
    expect(bourseTotal({ cto: 100, privateMk: 200, pea: 300, plusValue: 0 })).toBe(600)
  })
  it('apy = rendement × 365/jours depuis le 1er janvier', () => {
    expect(annualizeAPY(-2.39730272109317, 120)).toBeCloseTo(-2.39730272109317 * (365 / 120), 8)
  })
})

describe('projection', () => {
  it('compute_year_total = base×(1+taux) + 12×invest', () => {
    expect(computeYearTotal(15720, 0.07, 15720)).toBeCloseTo(32540.4, 6)
  })
  it('compute_month_total = base×(1+taux/12) + invest', () => {
    expect(computeMonthTotal(32540.4, 0.07, 1310)).toBeCloseTo(32540.4 * (1 + 0.07 / 12) + 1310, 6)
  })
  it('suite objectif : plus-value cumulée = objectif − versements cumulés', () => {
    const p = projectObjectif({ startYear: 2024, baseValue: 0, investMensuel: 1310, taux: 0.07, years: 3 })
    expect(p[0].objectif).toBeCloseTo(15720, 4)
    expect(p[1].objectif).toBeCloseTo(32540.4, 4)
    expect(p[2].objectif).toBeCloseTo(50538.23, 2)
    expect(p[0].plusValue).toBe(0)
    expect(p[1].plusValue).toBeCloseTo(1100.4, 6)
    expect(p[2].plusValue).toBeCloseTo(3378.23, 2)
    expect(p[2].evolPlusValue).toBeCloseTo(2277.83, 2)
  })
  it('retrait 4 % : capital×0.04/12', () => {
    expect(withdrawalMonthly(1131222.89, 0.04)).toBeCloseTo(3770.74, 2)
  })
})

describe('credits', () => {
  it('% remboursé = (montant − restant) / montant', () => {
    expect(pctRembourse({ montant: 54894, restant: 5992.61 })).toBeCloseTo((54894 - 5992.61) / 54894, 8)
    expect(pctRembourse({ montant: 0, restant: 0 })).toBe(0)
  })
  it('mensualités totales = somme des échéances', () => {
    expect(monthlyReimbursement([{ mensualite: 740.75 }, { mensualite: 1194.83 }])).toBeCloseTo(1935.58, 6)
  })
  it('totaux agrégés', () => {
    const t = totals([{ montant: 54894, restant: 5992.61 }, { montant: 70000, restant: 68620.98 }])
    expect(t.emprunt).toBe(124894)
    expect(t.restant).toBeCloseTo(74613.59, 6)
    expect(t.pct).toBeCloseTo(0.4026, 4)
  })
  it('mois pour passer sous le palier : INT(ratio + 1)', () => {
    expect(monthsUnderPrincipal(400000, 2000, 250000)).toBe(76)
    expect(monthsUnderPrincipal(200000, 2000, 250000)).toBe(0)
  })
  it('date = EDATE(depuis, mois), bornée au dernier jour du mois', () => {
    expect(dateUnderPrincipal('2026-08-30', 47)).toBe('2030-07-30')
  })
})

describe('date utils', () => {
  it('diffDaysISO absolu', () => {
    expect(diffDaysISO('2024-08-01', '2024-09-01')).toBe(31)
    expect(diffDaysISO('2025-03-01', '2026-03-01')).toBe(365)
  })
  it('edate borne au dernier jour du mois cible', () => {
    expect(edate('2026-01-31', 1)).toBe('2026-02-28')
    expect(edate('2026-01-31', 13)).toBe('2027-02-28')
  })
})

describe('computeDerivedMonth (intégration)', () => {
  it('reconstruit les totaux et le hors immo', () => {
    const month: MonthRecord = {
      id: '2026-08',
      bourse: { cto: 16913.84, privateMk: 467.14, pea: 34312.95, plusValue: 5038.48 },
      assuranceVie: { livretVie: 150.33, multiVie: 39306.06, cashFortuneo: 16370, linxea: 2491.1, scpi: 15150 },
      crowdlending: { investi: 8525.37, soldeDispo: 10.21, revenuBrut: 48.88, fiscalite: 13.84 },
      crypto: { tradeRep: 202.18, binance: 0, ledger: 6963.28, hotWalletPrincipalUSD: 7530.98, hotWalletLedgerUSD: 1744.45, defiUSD: 1740.55, btc: 0.15 },
      horsImmo: { compteCourantCa: 10341.02, compteCourantFortuneo: 0, compteCourantTradeRep: 0, livretA: 17502.76, ldd: 0 },
    }
    const d = computeDerivedMonth(month, C, 179103.49)
    expect(d.bourse).toBeCloseTo(51693.93, 6)
    expect(d.assuranceVie).toBeCloseTo(73467.49, 6)
    expect(d.crowdlending.total).toBeCloseTo(8535.58, 6)
    expect(d.crypto).toBeCloseTo(16828.6, 3)
    expect(d.horsImmo.total).toBeCloseTo(178369.38, 3)
    expect(d.horsImmo.variation).toBeCloseTo(178369.38 - 179103.49, 3)
    expect(d.partBtc).toBeCloseTo((0.15 * C.btcEur) / 16828.6, 7)
  })
})