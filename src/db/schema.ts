export const DB_NAME = 'patrimoine'
export const DB_VERSION = 2

export const STORES = {
  months: 'months',
  patrimoine: 'patrimoine',
  credits: 'credits',
  constantes: 'constantes',
  security: 'security',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

export interface MonthRecord {
  id: string // YYYY-MM
  bourse: BourseSnapshot
  assuranceVie: AssuranceVieSnapshot
  crowdlending: CrowdlendingSnapshot
  crypto: CryptoSnapshot
  horsImmo: HorsImmoSnapshot
}

export interface BourseSnapshot {
  cto: number
  privateMk: number
  pea: number
}

export interface AssuranceVieSnapshot {
  livretVie: number
  multiVie: number
  cashFortuneo: number
  linxea: number
  scpi: number
  investCumule: number
}

export interface CrowdlendingSnapshot {
  investi: number
  soldeDispo: number
  revenuBrut: number
}

export interface CryptoSnapshot {
  tradeRep: number
  binance: number
  ledger: number
  hotWalletPrincipalUSD: number
  hotWalletLedgerUSD: number
  defiUSD: number
  btc: number
}

export interface HorsImmoSnapshot {
  compteCourant: number
  livrets: number
}

export interface AccountState {
  categorie: string
  societe: string
  montant: number
}

export interface Loan {
  id: string
  nom: string
  numero: number
  dateDepart: string
  dateFin: string
  taux: number
  mensualite: number
  montant: number
  restant: number
  pctRembourse: number
  assurance?: number
}

export interface Constantes {
  btcEur: number
  btcUsd: number
  eth: number
  sol: number
  convUsdEur: number
  plafondPea: number
  dateOuverturePea: string
  tauxRendement: number // 7%
  mensualiteTradeRep: number // 710
  mensualiteFortuneo: number // 600
}