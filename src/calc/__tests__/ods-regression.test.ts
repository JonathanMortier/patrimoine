import { describe, expect, it } from 'vitest'

import { horsImmoTotal, horsImmoVariation } from '../horsImmo'
import { crowdlendingApy, crowdlendingTotals } from '../crowdlending'
import { assuranceVieApy, assuranceVieTotal } from '../assuranceVie'
import { cryptoTotals } from '../crypto'
import { bourseTotal, annualizeAPY } from '../bourse'
import { projectObjectif, withdrawalMonthly } from '../projection'
import { monthsUnderPrincipal, pctRembourse, totals } from '../credits'
import {
  AV_APY_POINTS, AV_BASE, AV_TOTAL_2026_08, BOURSE, BOURSE_APY_POINTS,
  CONV_USD_EUR, CROWD_BASE, CROWDLENDING, CREDITS_TOTALS, CRYPTO, HORS_IMMO,
  INVEST_MENSUEL_BOURSE, LOANS, PROJECTION_OBJECTIF, PROJECTION_PLUS_VALUE,
  TAUX_RENDEMENT_BOURSE,
} from '../__fixtures__/ods'

describe('Régression ODS — Hors immo', () => {
  it('Total = somme des colonnes pour chaque mois', () => {
    for (const r of HORS_IMMO) {
      const total = horsImmoTotal({
        compteCourant: r.compteCourant,
        livrets: r.livrets,
        bourse: r.bourse,
        assuranceVie: r.assuranceVie,
        crowdlending: r.crowdlending,
        crypto: r.crypto,
      })
      expect(total, r.id).toBeCloseTo(r.total, 6)
    }
  })
  it('Revenus globaux = total − total précédent', () => {
    for (let i = 1; i < HORS_IMMO.length; i++) {
      const variation = horsImmoVariation(HORS_IMMO[i].total, HORS_IMMO[i - 1].total)
      expect(variation, HORS_IMMO[i].id).toBeCloseTo(HORS_IMMO[i].revenusGlobaux!, 6)
    }
    expect(horsImmoVariation(HORS_IMMO[0].total, null)).toBeNull()
  })
})

describe('Régression ODS — Crowdlending', () => {
  it('total = investi + solde dispo', () => {
    for (const r of CROWDLENDING) {
      const t = crowdlendingTotals({ investi: r.investi, soldeDispo: r.soldeDispo, revenuBrut: r.revenuBrut })
      expect(t.total, r.id).toBeCloseTo(r.total, 6)
    }
  })
  it('APY = (total−base)/base × 365/jours (base $B$9 = 2025-03-01)', () => {
    for (const r of CROWDLENDING) {
      if (r.apy === null) continue
      const apy = crowdlendingApy(r.total, CROWD_BASE.total, CROWD_BASE.date, `${r.id}-01`)
      expect(apy, r.id).toBeCloseTo(r.apy, 5)
    }
  })
})

describe('Régression ODS — Assurance Vie', () => {
  it('total 2026-08 = somme des composants distincts (= colonne Hors immo)', () => {
    const total = assuranceVieTotal({
      livretVie: AV_TOTAL_2026_08.livretVie,
      multiVie: AV_TOTAL_2026_08.multiVie,
      cashFortuneo: AV_TOTAL_2026_08.cashFortuneo,
      linxea: AV_TOTAL_2026_08.linxea,
      scpi: AV_TOTAL_2026_08.scpi,
      investCumule: 0,
    })
    expect(total).toBeCloseTo(AV_TOTAL_2026_08.total, 6)
  })
  it('APY = (total−base−invest)/base × 365/jours (base G2, invest cumulé réel)', () => {
    for (const p of AV_APY_POINTS) {
      const apy = assuranceVieApy(p.total, AV_BASE.total, AV_BASE.date, p.date, p.investCumule)
      expect(apy, p.id).toBeCloseTo(p.apy, 3)
    }
  })
})

describe('Régression ODS — Crypto', () => {
  it('Total € = Σ€ + Σ$÷CONV', () => {
    // L'ODS stocke des totaux arrondis au centime à partir de $ non arrondis :
    // tolérance 2 décimales (écart sous le centime attendu).
    for (const r of CRYPTO) {
      const t = cryptoTotals({
        tradeRep: r.tradeRep,
        binance: r.binance,
        ledger: r.ledger,
        hotWalletPrincipalUSD: r.hotWalletPrincipalUSD,
        hotWalletLedgerUSD: r.hotWalletLedgerUSD,
        defiUSD: r.defiUSD,
        btc: r.btc,
      }, CONV_USD_EUR)
      expect(t.totalEur, r.id).toBeCloseTo(r.totalEur, 2)
    }
  })
})

describe('Régression ODS — Bourse', () => {
  it('Total = CTO + Private Market + PEA (mois au layout stable)', () => {
    for (const r of BOURSE) {
      expect(bourseTotal({ cto: r.cto, privateMk: r.privateMk, pea: r.pea }), r.id).toBeCloseTo(r.total, 6)
    }
  })
  it('APY = rendement × 365/jours depuis le 1er janvier (année 2025)', () => {
    for (const p of BOURSE_APY_POINTS) {
      expect(annualizeAPY(p.rendement, p.daysSinceJan1), p.id).toBeCloseTo(p.apy, 6)
    }
  })
})

describe('Régression ODS — Projection Bourse', () => {
  it('suite objectif : recurrence 7 %, 1310 €/mois, sur 26 ans', () => {
    const p = projectObjectif({
      startYear: 2024,
      baseValue: 0,
      investMensuel: INVEST_MENSUEL_BOURSE,
      taux: TAUX_RENDEMENT_BOURSE,
      years: PROJECTION_OBJECTIF.length,
    })
    for (let i = 0; i < PROJECTION_OBJECTIF.length; i++) {
      expect(p[i].objectif, `année ${p[i].year}`).toBeCloseTo(PROJECTION_OBJECTIF[i], 1)
    }
  })
  it('plus value cumulée = objectif − versements cumulés', () => {
    const p = projectObjectif({
      startYear: 2024,
      baseValue: 0,
      investMensuel: INVEST_MENSUEL_BOURSE,
      taux: TAUX_RENDEMENT_BOURSE,
      years: PROJECTION_OBJECTIF.length,
    })
    for (let i = 1; i <= PROJECTION_PLUS_VALUE.length; i++) {
      expect(p[i].plusValue, `année ${p[i].year}`).toBeCloseTo(PROJECTION_PLUS_VALUE[i - 1], 1)
    }
  })
  it('retrait 4 % sur le « Réel » 2051 = 3 770,74 €/mois', () => {
    expect(withdrawalMonthly(1131222.89, 0.04)).toBeCloseTo(3770.74, 2)
  })
})

describe('Régression ODS — Crédits immo', () => {
  it('% remboursé par prêt', () => {
    for (const l of LOANS) {
      expect(pctRembourse({ montant: l.montant, restant: l.restant }), l.numero).toBeCloseTo(l.pct, 3)
    }
  })
  it('totaux globaux (emprunt / restant / % remboursé)', () => {
    const t = totals(LOANS.map((l) => ({ montant: l.montant, restant: l.restant })))
    expect(t.emprunt).toBeCloseTo(CREDITS_TOTALS.montant, 6)
    expect(t.restant).toBeCloseTo(CREDITS_TOTALS.restant, 6)
    expect(t.pct).toBeCloseTo(CREDITS_TOTALS.pct, 3)
  })
  it('mois pour passer sous 250 k€ (formule INT(ratio+1))', () => {
    // L'ODS affiche 47 (valeurs internes non arrondies) ; avec les montants
    // affichés, la formule donne 46 — cohérent à l'arrondi près.
    expect(monthsUnderPrincipal(CREDITS_TOTALS.restant, CREDITS_TOTALS.mensualites, 250000)).toBe(46)
    expect(monthsUnderPrincipal(260000, 1000, 250000)).toBe(11)
  })
})