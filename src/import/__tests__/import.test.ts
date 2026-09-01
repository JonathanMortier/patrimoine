import { describe, expect, it } from 'vitest'

import { detectSeparator, parseMonthId, parseNumber } from '../csv'
import { parseSheet, mergeDomain } from '../parsers'
import { reconcileMonths } from '../reconcile'
import { newMonth } from '../../db/repos/months'
import type { MonthRecord } from '../../db/schema'

const HORS_IMMO_TSV = `Date\tCompte courant\tLivrets\tAssurance Vie\tCrowlending\tBourse\tCrypto\tTotal\tRevenus globaux
01/01/2025\t9288.62\t30445.9\t61469.73\t7099.58\t10046.62\t3083.15\t121433.6\t
01/02/2025\t7820.22\t31445.9\t63375.62\t7146.24\t11407.23\t3558\t124753.21\t3319.61
01/03/2025\t10402.42\t35249.62\t64148.04\t7678.96\t13245.49\t6413.27\t137137.8\t12384.59
01/08/2026\t10341.02\t17502.76\t73467.49\t8578.5\t51693.93\t17519.79\t179103.49\t-1961.01\n`

const BOURSE_TSV = `Date\tAction\tPrivate Market\tPEA (ss espèces)\tPlus value\tTotal\tRendement PEA\tAPY %
01/03/2026\t11,844.02\t251.71\t29,496.56\t3,250.94\t41,592.29\t11.02142\t9.48777
01/08/2026\t16,913.84\t467.14\t34,312.95\t5,038.48\t51,693.93\t14.6839\t9.28876${''}`

const AV_TSV = `Date\tLivret Vie\tMulti Vie\tCash sur Fortuneo\tLinxea Spirit 2\tSCPI\tTotal\t% APY
01/08/2026\t150,33\t39.306,06\t16.370,00\t2.491,10\t15.150,00\t73.467,49\t
01/09/2025\t35.360,37\t31.468,27\t66.828,64\t\t\t66.828,64\t-1,00253602226975\n`

const CROWD_TSV = `Date\tTotal\tBricks investis\tSolde dispo\tRevenu brute\tFiscalité\tRevenu net\t% APY
01/01/2025\t7 099,58\t6 190,00\t909,58\t33,41\t8,75\t24,66\t
01/04/2026\t8 404,75\t8 390,98\t13,77\t50,52\t13,62\t36,90\t8,7117670369504\n`

const CRYPTO_TSV = `Date\tTotal crypto\tTrade republic\tBinance\tLedger\tHot Wallet Principal\tHot Wallet Ledger\tDefi non reconnu\tBTC
01/03/2026\t14757.77\t205.52\t0.00\t4513.60\t$6,826.92\t$3,080.42\t$1,536.72\t0.14
01/04/2026\t15371.89\t207.47\t0.00\t4467.30\t$7,528.54\t$3,164.54\t$1,501.64\t0.15\n`

describe('csv utils', () => {
  it('parseNumber : formats FR, US, devises, négatifs', () => {
    expect(parseNumber('7099.58')).toBe(7099.58)
    expect(parseNumber('7,099.58')).toBe(7099.58)
    expect(parseNumber('7099,58')).toBe(7099.58)
    expect(parseNumber('7 099,58')).toBe(7099.58)
    expect(parseNumber('$2,294.00')).toBe(2294)
    expect(parseNumber('1 136,00 €')).toBe(1136)
    expect(parseNumber('-1 775,33')).toBe(-1775.33)
    expect(parseNumber('0.15 BTC')).toBeCloseTo(0.15, 5)
    expect(parseNumber('BTC')).toBeNull()
    expect(parseNumber('#NAME?')).toBeNull()
    expect(parseNumber('—')).toBeNull()
    expect(parseNumber('')).toBeNull()
  })
  it('parseMonthId : DD/MM/YYYY et ISO', () => {
    expect(parseMonthId('01/08/2024')).toBe('2024-08')
    expect(parseMonthId('12/10/2024')).toBe('2024-10')
    expect(parseMonthId('10/11/2024')).toBe('2024-11')
    expect(parseMonthId('2025-03-01')).toBe('2025-03')
    expect(parseMonthId('nope')).toBeNull()
  })
  it('detectSeparator : tab / point-virgule', () => {
    expect(detectSeparator('a\tb\n1\t2')).toBe('\t')
    expect(detectSeparator('a;b\n1;2')).toBe(';')
  })
})

describe('parseSheet', () => {
  it('Hors immo : comptes, livrets, totaux et variation', () => {
    const r = parseSheet(HORS_IMMO_TSV, 'horsImmo')
    expect(r.separator).toBe('\t')
    expect(r.rows).toHaveLength(4)
    expect(r.rows[0].id).toBe('2025-01')
    expect(r.rows[1].values.compteCourant).toBe(7820.22)
    expect(r.rows[1].values.livrets).toBe(31445.9)
    expect(r.rows[1].values.bourse).toBe(11407.23)
    expect(r.rows[1].values.revenusGlobaux).toBe(3319.61)
    expect(r.rows[3].values.revenusGlobaux).toBe(-1961.01)
    // total de la dernière ligne
    expect(r.rows[3].values.total).toBe(179103.49)
  })
  it('Bourse : colonnes 2026 (Action / Private Market / PEA)', () => {
    const r = parseSheet(BOURSE_TSV, 'bourse')
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0].values.cto).toBe(11844.02)
    expect(r.rows[0].values.privateMk).toBe(251.71)
    expect(r.rows[0].values.pea).toBe(29496.56)
    expect(r.rows[0].values.plusValue).toBe(3250.94)
    expect(r.rows[1].values.cto).toBe(16913.84)
  })
  it('Assurance Vie : composants distincts, notes non numériques ignorées', () => {
    const r = parseSheet(AV_TSV, 'assuranceVie')
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0].values.livretVie).toBeCloseTo(150.33, 4)
    expect(r.rows[0].values.multiVie).toBeCloseTo(39306.06, 4)
    expect(r.rows[0].values.cashFortuneo).toBe(16370)
    expect(r.rows[0].values.linxea).toBeCloseTo(2491.1, 4)
    expect(r.rows[0].values.scpi).toBe(15150)
    expect(r.rows[0].values.total).toBe(73467.49)
    expect(r.rows[1].values.cashFortuneo).toBeCloseTo(66828.64, 4)
  })
  it('Crowdlending : investi / solde / revenu brut', () => {
    const r = parseSheet(CROWD_TSV, 'crowdlending')
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0].values.investi).toBe(6190)
    expect(r.rows[0].values.soldeDispo).toBeCloseTo(909.58, 4)
    expect(r.rows[0].values.revenuBrut).toBeCloseTo(33.41, 4)
    expect(r.rows[1].values.apy).toBeCloseTo(8.7117670369504, 8)
  })
  it('Crypto : conversion des $ et valeurs par compte', () => {
    const r = parseSheet(CRYPTO_TSV, 'crypto')
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0].values.tradeRep).toBeCloseTo(205.52, 4)
    expect(r.rows[0].values.ledger).toBeCloseTo(4513.6, 4)
    expect(r.rows[0].values.hotWalletPrincipalUSD).toBe(6826.92)
    expect(r.rows[0].values.hotWalletLedgerUSD).toBe(3080.42)
    expect(r.rows[0].values.defiUSD).toBe(1536.72)
    expect(r.rows[0].values.btc).toBeCloseTo(0.14, 5)
    expect(r.rows[0].values.total).toBeCloseTo(14757.77, 4)
  })
  it('ignorées : lignes sans date reconnue', () => {
    const r = parseSheet('Date\tValeur\nnote\t3\n01/05/2026\t4\n', 'bourse')
    expect(r.rows).toHaveLength(0)
    expect(r.skipped[0].reason).toBe('date')
    expect(r.skipped[1].reason).toBe('no-data')
  })
})

describe('mergeDomain', () => {
  it('fusionne par domaine dans un mois', () => {
    const source = parseSheet(BOURSE_TSV, 'bourse')
    const month = mergeDomain(newMonth(source.rows[0].id), 'bourse', source.rows[0].values)
    expect(month.id).toBe('2026-03')
    expect(month.bourse.cto).toBeCloseTo(11844.02, 4)
    expect(month.bourse.privateMk).toBeCloseTo(251.71, 4)
    expect(month.bourse.pea).toBeCloseTo(29496.56, 4)
    expect(month.bourse.plusValue).toBeCloseTo(3250.94, 4)
  })
  it('crypto : garde les autres domaines du mois', () => {
    const r = parseSheet(CRYPTO_TSV, 'crypto')
    const month: MonthRecord = { ...newMonth('2026-03'), bourse: { cto: 11844.02, privateMk: 251.71, pea: 29496.56, plusValue: 3250.94 } }
    mergeDomain(month, 'crypto', r.rows[0].values)
    expect(month.bourse.cto).toBe(11844.02)
    expect(month.crypto.defiUSD).toBe(1536.72)
  })
  it('crowdlending : fiscalité mergée depuis la colonne', () => {
    const r = parseSheet(CROWD_TSV, 'crowdlending')
    const month = mergeDomain(newMonth(r.rows[1].id), 'crowdlending', r.rows[1].values)
    expect(month.crowdlending.revenuBrut).toBeCloseTo(50.52, 4)
    expect(month.crowdlending.fiscalite).toBeCloseTo(13.62, 4)
  })
})

describe('reconcileMonths', () => {
  it('reconstruit le hors immo et détecte les écarts / domaines manquants', () => {
    const ok: MonthRecord = {
      id: '2026-08',
      bourse: { cto: 16913.84, privateMk: 467.14, pea: 34312.95, plusValue: 5038.48 },
      assuranceVie: { livretVie: 150.33, multiVie: 39306.06, cashFortuneo: 16370, linxea: 2491.1, scpi: 15150 },
      crowdlending: { investi: 8525.37, soldeDispo: 10.21, revenuBrut: 48.88, fiscalite: 13.84 },
      crypto: { tradeRep: 202.18, binance: 0, ledger: 6963.28, hotWalletPrincipalUSD: 7530.98, hotWalletLedgerUSD: 1744.45, defiUSD: 1740.55, btc: 0.15 },
      horsImmo: { compteCourantCa: 10341.02, compteCourantFortuneo: 0, compteCourantTradeRep: 0, livretA: 17502.76, ldd: 0 },
    }
    const onlyBourse: MonthRecord = {
      id: '2025-01',
      bourse: { cto: 100, privateMk: 0, pea: 0, plusValue: 0 },
      assuranceVie: { livretVie: 0, multiVie: 0, cashFortuneo: 0, linxea: 0, scpi: 0 },
      crowdlending: { investi: 0, soldeDispo: 0, revenuBrut: 0, fiscalite: 0 },
      crypto: { tradeRep: 0, binance: 0, ledger: 0, hotWalletPrincipalUSD: 0, hotWalletLedgerUSD: 0, defiUSD: 0, btc: 0 },
      horsImmo: { compteCourantCa: 0, compteCourantFortuneo: 0, compteCourantTradeRep: 0, livretA: 0, ldd: 0 },
    }
    const sources = new Map<string, number>([['2026-08', 179103.49]])
    const rows = reconcileMonths([onlyBourse, ok], sources, 1.14)
    expect(rows[0].id).toBe('2025-01')
    expect(rows[1].id).toBe('2026-08')

    expect(rows[1].recomposed).toBeCloseTo(178369.38, 3)
    expect(rows[1].source).toBeCloseTo(179103.49, 4)
    expect(rows[1].diff).toBeCloseTo(178369.38 - 179103.49, 3)
    expect(rows[1].missingDomains).toEqual([])

    expect(rows[0].recomposed).toBeCloseTo(100, 6)
    expect(rows[0].diff).toBeNull()
    expect(rows[0].missingDomains).toEqual(['Assurance Vie', 'Crowdlending', 'Crypto', 'Comptes/Livrets'])
  })
})