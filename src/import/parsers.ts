import { columnKey, mapColumns, parseDelimited, parseMonthId, parseNumber, type CsvResult } from './csv'
import type { MonthRecord } from '../db/schema'

export type SheetKind = 'bourse' | 'assuranceVie' | 'crowdlending' | 'crypto' | 'horsImmo'

/** Cible de mappage par domaine — les clés correspondent au schéma MonthRecord. */
export const ALIASES: Record<SheetKind, Record<string, string[]>> = {
  horsImmo: {
    compteCourant: ['Compte courant'],
    livrets: ['Livrets', 'Livret'],
    bourse: ['Bourse'],
    assuranceVie: ['Assurance Vie', 'Assurance VIE', 'AVI'],
    crowdlending: ['Crowlending', 'Crowdfunding'],
    crypto: ['Crypto'],
    total: ['Total'],
    revenusGlobaux: ['Revenus globaux'],
  },
  bourse: {
    cto: ['Action', 'CTO'],
    privateMk: ['Private Market', 'Private Market'],
    pea: ['PEA', 'PEA (ss espèces)', 'PEA ss especes'],
    plusValue: ['Plus value', 'Plus-value'],
    total: ['Total'],
    rendement: ['Rendement PEA'],
    apy: ['APY %', 'APY'],
  },
  assuranceVie: {
    livretVie: ['Livret Vie'],
    multiVie: ['Multi Vie'],
    cashFortuneo: ['Cash sur Fortuneo', 'Cash Fortuneo'],
    linxea: ['Linxea Spirit 2', 'Linxea'],
    scpi: ['SCPI'],
    total: ['Total'],
    apy: ['% APY', 'APY'],
  },
  crowdlending: {
    investi: ['Bricks investis', 'Investi', 'Bricks investies'],
    soldeDispo: ['Solde dispo', 'Solde disponible'],
    revenuBrut: ['Revenu brute', 'Revenu brut'],
    total: ['Total'],
    fiscalite: ['Fiscalité'],
    revenuNet: ['Revenu net'],
    apy: ['% APY', 'APY'],
  },
  crypto: {
    tradeRep: ['Trade republic', 'Trade Rep'],
    binance: ['Binance'],
    ledger: ['Ledger'],
    hotWalletPrincipalUSD: ['Hot Wallet Principal', 'HW Principal'],
    hotWalletLedgerUSD: ['Hot Wallet Ledger', 'HW Ledger'],
    defiUSD: ['Defi non reconnu', 'DeFi', 'Defi'],
    btc: ['BTC'],
    total: ['Total crypto', 'Total'],
  },
}

export interface ParsedColumn {
  index: number
  target: string
  header: string
}

export interface ParsedRow {
  id: string
  values: Record<string, number>
}

export interface ParseResult {
  kind: SheetKind
  separator: string
  columns: ParsedColumn[]
  rows: ParsedRow[]
  skipped: { line: number; reason: 'date' | 'no-data' }[]
}

/**
 * Parse une feuille exportée en CSV/TSV (layout stable actuel).
 * Détecte la ligne d'en-tête contenant « Date », mappe les colonnes connues
 * et extrait une ligne par mois (id = YYYY-MM).
 */
export function parseSheet(text: string, kind: SheetKind): ParseResult {
  const csv: CsvResult = parseDelimited(text)
  const aliases = ALIASES[kind]
  const mapped = mapColumns(csv.headers, aliases)
  const columns: ParsedColumn[] = mapped.map((c) => ({ index: c.index, target: c.target, header: csv.headers[c.index] }))
  const rows: ParsedRow[] = []
  const skipped: ParseResult['skipped'] = []

  csv.rows.forEach((cells, i) => {
    const rawDate = cells[0] ?? ''
    const id = parseMonthId(rawDate)
    if (!id) {
      skipped.push({ line: i + 2, reason: 'date' })
      return
    }
    const values: Record<string, number> = {}
    for (const c of mapped) {
      const cell = cells[c.index] ?? ''
      const n = parseNumber(cell)
      if (n !== null) values[c.target] = n
    }
    const hasData = Object.keys(values).length > 0
    if (hasData) rows.push({ id, values })
    else skipped.push({ line: i + 2, reason: 'no-data' })
  })

  return { kind, separator: csv.separator, columns, rows, skipped }
}

/** Petit util d'affichage pour la prévisualisation. */
export function formatMoney(n: number | undefined): string {
  if (n === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

/** Fusionne les valeurs parsées d'une feuille dans un mois (merging par domaine). */
export function mergeDomain(month: MonthRecord, kind: SheetKind, v: Record<string, number>): MonthRecord {
  const pick = (k: string): number | undefined => v[k]
  switch (kind) {
    case 'bourse':
      month.bourse.cto = pick('cto') ?? month.bourse.cto
      month.bourse.privateMk = pick('privateMk') ?? month.bourse.privateMk
      month.bourse.pea = pick('pea') ?? month.bourse.pea
      month.bourse.plusValue = pick('plusValue') ?? month.bourse.plusValue
      break
    case 'assuranceVie':
      month.assuranceVie.livretVie = pick('livretVie') ?? month.assuranceVie.livretVie
      month.assuranceVie.multiVie = pick('multiVie') ?? month.assuranceVie.multiVie
      month.assuranceVie.cashFortuneo = pick('cashFortuneo') ?? month.assuranceVie.cashFortuneo
      month.assuranceVie.linxea = pick('linxea') ?? month.assuranceVie.linxea
      month.assuranceVie.scpi = pick('scpi') ?? month.assuranceVie.scpi
      break
    case 'crowdlending':
      month.crowdlending.investi = pick('investi') ?? month.crowdlending.investi
      month.crowdlending.soldeDispo = pick('soldeDispo') ?? month.crowdlending.soldeDispo
      month.crowdlending.revenuBrut = pick('revenuBrut') ?? month.crowdlending.revenuBrut
      month.crowdlending.fiscalite = pick('fiscalite') ?? month.crowdlending.fiscalite
      break
    case 'crypto':
      month.crypto.tradeRep = pick('tradeRep') ?? month.crypto.tradeRep
      month.crypto.binance = pick('binance') ?? month.crypto.binance
      month.crypto.ledger = pick('ledger') ?? month.crypto.ledger
      month.crypto.hotWalletPrincipalUSD = pick('hotWalletPrincipalUSD') ?? month.crypto.hotWalletPrincipalUSD
      month.crypto.hotWalletLedgerUSD = pick('hotWalletLedgerUSD') ?? month.crypto.hotWalletLedgerUSD
      month.crypto.defiUSD = pick('defiUSD') ?? month.crypto.defiUSD
      month.crypto.btc = pick('btc') ?? month.crypto.btc
      break
    case 'horsImmo':
      month.horsImmo.compteCourantCa = pick('compteCourant') ?? month.horsImmo.compteCourantCa
      month.horsImmo.livretA = pick('livrets') ?? month.horsImmo.livretA
      break
  }
  return month
}

export { columnKey }