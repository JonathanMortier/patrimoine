/**
 * Fixtures de régression — valeurs extraites de docs/Patrimoine.ods
 * via scripts/ods-extract.mjs (cf. /tmp/opencode/ods-dumps/*.tsv).
 * Uniquement des mois dont la mise en page ODS est stable et dont le
 * total stocké se reconstruit exactement à partir des entrées.
 */

export const CONV_USD_EUR = 1.14
export const INVEST_MENSUEL_BOURSE = 1310 // Trade Rep 710 + Fortuneo 600
export const TAUX_RENDEMENT_BOURSE = 0.07

export interface HorsImmoRow {
  id: string
  compteCourant: number
  livrets: number
  assuranceVie: number
  crowdlending: number
  bourse: number
  crypto: number
  total: number
  revenusGlobaux: number | null
}

/** Tous les mois 2025-01 → 2026-08 où Total = somme des colonnes (feuille Hors immo). */
export const HORS_IMMO: HorsImmoRow[] = [
  { id: '2025-01', compteCourant: 9288.62, livrets: 30445.9, assuranceVie: 61469.73, crowdlending: 7099.58, bourse: 10046.62, crypto: 3083.15, total: 121433.6, revenusGlobaux: null },
  { id: '2025-02', compteCourant: 7820.22, livrets: 31445.9, assuranceVie: 63375.62, crowdlending: 7146.24, bourse: 11407.23, crypto: 3558, total: 124753.21, revenusGlobaux: 3319.61 },
  { id: '2025-03', compteCourant: 10402.42, livrets: 35249.62, assuranceVie: 64148.04, crowdlending: 7678.96, bourse: 13245.49, crypto: 6413.27, total: 137137.8, revenusGlobaux: 12384.59 },
  { id: '2025-04', compteCourant: 10137.32, livrets: 33249.62, assuranceVie: 63935.97, crowdlending: 7713.93, bourse: 15337.67, crypto: 7736.63, total: 138111.14, revenusGlobaux: 973.34 },
  { id: '2025-05', compteCourant: 8651.7, livrets: 28749.62, assuranceVie: 63635.69, crowdlending: 7751.51, bourse: 17973.11, crypto: 9574.18, total: 136335.81, revenusGlobaux: -1775.33 },
  { id: '2025-06', compteCourant: 10635.59, livrets: 24749.62, assuranceVie: 65821.41, crowdlending: 7788.64, bourse: 20605.88, crypto: 11678.13, total: 141279.27, revenusGlobaux: 4943.46 },
  { id: '2025-07', compteCourant: 5619.78, livrets: 24749.62, assuranceVie: 65611.62, crowdlending: 7824.61, bourse: 25422.74, crypto: 12269.67, total: 141498.04, revenusGlobaux: 218.77 },
  { id: '2025-08', compteCourant: 6673.89, livrets: 23349.62, assuranceVie: 66536.29, crowdlending: 7864.32, bourse: 27215.25, crypto: 17970, total: 149609.37, revenusGlobaux: 8111.33 },
  { id: '2025-09', compteCourant: 8843.77, livrets: 29349.62, assuranceVie: 66828.64, crowdlending: 7900.42, bourse: 29434.54, crypto: 21087.83, total: 163444.82, revenusGlobaux: 13835.45 },
  { id: '2025-10', compteCourant: 4849.13, livrets: 28349.62, assuranceVie: 67301.33, crowdlending: 7908.87, bourse: 32392.53, crypto: 20122.19, total: 160923.67, revenusGlobaux: -2521.15 },
  { id: '2025-11', compteCourant: 10692.77, livrets: 18349.62, assuranceVie: 68771.43, crowdlending: 7974.23, bourse: 34328.46, crypto: 19296.64, total: 159413.15, revenusGlobaux: -1510.52 },
  { id: '2025-12', compteCourant: 8311.33, livrets: 17349.62, assuranceVie: 68515.85, crowdlending: 8012.95, bourse: 36185.2, crypto: 15506.97, total: 153881.92, revenusGlobaux: -5531.23 },
  { id: '2026-01', compteCourant: 8575.43, livrets: 19502.76, assuranceVie: 71091.13, crowdlending: 8052.06, bourse: 37334.33, crypto: 16026.96, total: 160582.67, revenusGlobaux: 6700.75 },
  { id: '2026-02', compteCourant: 7197.5, livrets: 18502.76, assuranceVie: 72712.3, crowdlending: 8089.1, bourse: 39956.45, crypto: 13641.729661017, total: 160099.839661017, revenusGlobaux: -482.83033898304 },
  { id: '2026-03', compteCourant: 8427.41, livrets: 17502.76, assuranceVie: 73661.41, crowdlending: 8373.27, bourse: 41592.29, crypto: 14417.4759322034, total: 163974.615932203, revenusGlobaux: 3874.77627118645 },
  { id: '2026-04', compteCourant: 6599.82, livrets: 17502.76, assuranceVie: 72237.41, crowdlending: 8404.75, bourse: 41979.26, crypto: 16026.2276271186, total: 162750.227627119, revenusGlobaux: -1224.38830508475 },
  { id: '2026-05', compteCourant: 7918.55, livrets: 17502.76, assuranceVie: 73607.08, crowdlending: 8441.65, bourse: 45319.35, crypto: 18624.4760869565, total: 171413.866086957, revenusGlobaux: 8663.63845983788 },
  { id: '2026-06', compteCourant: 10178.64, livrets: 17502.76, assuranceVie: 75291.38, crowdlending: 8482.3, bourse: 50312.56, crypto: 19381.44, total: 181149.08, revenusGlobaux: 9735.2139130435 },
  { id: '2026-07', compteCourant: 10347.86, livrets: 17502.76, assuranceVie: 75291.38, crowdlending: 8535.58, bourse: 51620.37, crypto: 17766.55, total: 181064.5, revenusGlobaux: -84.58 },
  { id: '2026-08', compteCourant: 10341.02, livrets: 17502.76, assuranceVie: 73467.49, crowdlending: 8578.5, bourse: 51693.93, crypto: 17519.79, total: 179103.49, revenusGlobaux: -1961.01 },
]

export interface CrowdlendingRow {
  id: string
  investi: number
  soldeDispo: number
  revenuBrut: number
  revenuNet: number
  total: number
  apy: number | null
}

/** Base APY : total du 2025-03-01 (feuille Crowdlending $B$9). */
export const CROWD_BASE = { date: '2025-03-01', total: 7678.96 }

export const CROWDLENDING: CrowdlendingRow[] = [
  { id: '2025-01', investi: 6190, soldeDispo: 909.58, revenuBrut: 33.41, revenuNet: 24.66, total: 7099.58, apy: null },
  { id: '2025-02', investi: 6447.46, soldeDispo: 698.78, revenuBrut: 43.5, revenuNet: 32.72, total: 7146.24, apy: null },
  { id: '2025-03', investi: 6647.46, soldeDispo: 1031.5, revenuBrut: 46.36, revenuNet: 34.97, total: 7678.96, apy: null },
  { id: '2025-04', investi: 6764.94, soldeDispo: 948.99, revenuBrut: 50.04, revenuNet: 37.58, total: 7713.93, apy: 5.36197021975762 },
  { id: '2025-05', investi: 6764.94, soldeDispo: 986.57, revenuBrut: 49.74, revenuNet: 37.13, total: 7751.51, apy: 5.65324804059021 },
  { id: '2025-06', investi: 6896.42, soldeDispo: 892.22, revenuBrut: 47.85, revenuNet: 35.87, total: 7788.64, apy: 5.66669807188566 },
  { id: '2025-07', investi: 7007.4, soldeDispo: 817.11, revenuBrut: 53.55, revenuNet: 39.81, total: 7824.51, apy: 5.67078051211512 },
  { id: '2025-08', investi: 7170.02, soldeDispo: 694.3, revenuBrut: 48.17, revenuNet: 36.1, total: 7864.32, apy: 5.75857528637285 },
  { id: '2025-09', investi: 7470.84, soldeDispo: 429.58, revenuBrut: 49.75, revenuNet: 37.08, total: 7900.42, apy: 5.7209470960968 },
  { id: '2025-10', investi: 7380.08, soldeDispo: 528.79, revenuBrut: 47.37, revenuNet: 34.33, total: 7908.87, apy: 5.10663182192993 },
  { id: '2025-11', investi: 7700, soldeDispo: 274.23, revenuBrut: 50.71, revenuNet: 37.71, total: 7974.23, apy: 5.72853668747234 },
  { id: '2025-12', investi: 7973.42, soldeDispo: 39.53, revenuBrut: 52.44, revenuNet: 38.99, total: 8012.95, apy: 5.77286270773409 },
  { id: '2026-01', investi: 7870.48, soldeDispo: 181.58, revenuBrut: 50.47, revenuNet: 36.02, total: 8052.06, apy: 5.79554499176121 },
  { id: '2026-02', investi: 7360.78, soldeDispo: 728.32, revenuBrut: 44.83, revenuNet: 32.02, total: 8089.1, apy: 5.78485776650208 },
  { id: '2026-03', investi: 7950.78, soldeDispo: 422.49, revenuBrut: 44.31, revenuNet: 31.48, total: 8373.27, apy: 9.04171919114047 },
  { id: '2026-04', investi: 8390.98, soldeDispo: 13.77, revenuBrut: 50.52, revenuNet: 36.9, total: 8404.75, apy: 8.7117670369504 },
  { id: '2026-05', investi: 8440.98, soldeDispo: 0.67, revenuBrut: 47.15, revenuNet: 33.71, total: 8441.65, apy: null },
  { id: '2026-06', investi: 8480.98, soldeDispo: 1.32, revenuBrut: 64.05, revenuNet: 46.34, total: 8482.3, apy: null },
  { id: '2026-07', investi: 8525.37, soldeDispo: 10.21, revenuBrut: 48.88, revenuNet: 35.98, total: 8535.58, apy: null },
  /* 2026-08 (R26) : total stocké 8578.50 ≠ investi+dispo (8608.50) — incohérence ODS, volontairement exclu. */
]

/** Assurance Vie : mois 2026-08 avec composants distincts (mois 2026-08 = total hors immo ✓). */
export const AV_TOTAL_2026_08 = {
  id: '2026-08',
  livretVie: 150.33,
  multiVie: 39306.06,
  cashFortuneo: 16370,
  linxea: 2491.1,
  scpi: 15150,
  total: 73467.49,
}

/** APY Assurance Vie : base G2=60992.04 @2024-08-01, invest cumulé réel. */
export const AV_APY_POINTS = [
  { id: '2024-09', date: '2024-09-01', total: 62531.59, investCumule: 500, apy: 20.0679677269785 },
  { id: '2024-10', date: '2024-10-01', total: 62525.05, investCumule: 1000, apy: 5.22907928829328 },
]
export const AV_BASE = { date: '2024-08-01', total: 60992.04 }

export interface CryptoRow {
  id: string
  tradeRep: number
  binance: number
  ledger: number
  hotWalletPrincipalUSD: number
  hotWalletLedgerUSD: number
  defiUSD: number
  btc: number
  totalEur: number
}

/** Mois où Total € = Σ€ + Σ$÷CONV reproduit exactement la valeur stockée. */
export const CRYPTO: CryptoRow[] = [
  { id: '2026-03', tradeRep: 205.52, binance: 0, ledger: 4513.6, hotWalletPrincipalUSD: 6826.92, hotWalletLedgerUSD: 3080.42, defiUSD: 1536.72, btc: 0.14, totalEur: 14757.77 },
  { id: '2026-04', tradeRep: 207.47, binance: 0, ledger: 4467.3, hotWalletPrincipalUSD: 7528.54, hotWalletLedgerUSD: 3164.54, defiUSD: 1501.64, btc: 0.15, totalEur: 15371.89 },
  { id: '2026-05', tradeRep: 220.12, binance: 0, ledger: 6008.93, hotWalletPrincipalUSD: 7717.65, hotWalletLedgerUSD: 3574.71, defiUSD: 1762.38, btc: 0.15, totalEur: 17680.58 },
  { id: '2026-06', tradeRep: 202.18, binance: 0, ledger: 6963.28, hotWalletPrincipalUSD: 7530.98, hotWalletLedgerUSD: 1744.45, defiUSD: 1740.55, btc: 0.15, totalEur: 16828.6 },
  /* 2026-07 : 15291.33 calculé vs 15291.15 stocké (arrondis internes) — exclu des tests exacts. */
]

export interface BourseRow {
  id: string
  cto: number
  privateMk: number
  pea: number
  total: number
}

/** Mois où « Total » de la feuille Bourse = CTO + Private Market + PEA. */
export const BOURSE: BourseRow[] = [
  { id: '2026-03', cto: 11844.02, privateMk: 251.71, pea: 29496.56, total: 41592.29 },
  { id: '2026-04', cto: 12419.14, privateMk: 350.14, pea: 29209.98, total: 41979.26 },
  { id: '2026-05', cto: 14056.31, privateMk: 352.76, pea: 30910.28, total: 45319.35 },
  { id: '2026-06', cto: 16004.62, privateMk: 367.26, pea: 33359.81, total: 49731.69 },
  { id: '2026-07', cto: 16961.91, privateMk: 412.04, pea: 34246.42, total: 51620.37 },
  { id: '2026-08', cto: 16913.84, privateMk: 467.14, pea: 34312.95, total: 51693.93 },
]

/** Rendement PEA → APY annualisée depuis le 1er janvier (points 2025 vérifiés). */
export const BOURSE_APY_POINTS = [
  { id: '2025-02', rendement: 4.90364149271668, daysSinceJan1: 31, apy: 57.7364240271479 },
  { id: '2025-05', rendement: -2.39730272109317, daysSinceJan1: 120, apy: -7.2917957766584 },
  { id: '2025-06', rendement: 4.30998283772376, daysSinceJan1: 151, apy: 10.4181704355574 },
]

/** Suite « objectif » annuelle ODS (recurrence base 2024=0, 7 %, 1310 €/mois). */
export const PROJECTION_OBJECTIF = [
  15720, 32540.4, 50538.23, 69795.9, 90401.62, 112449.73, 136041.21, 161284.1,
  188293.98, 217194.56, 248118.18, 281206.45, 316610.91, 354493.67, 395028.23,
  438400.2, 484808.22, 534464.79, 587597.33, 644449.14, 705280.58, 770370.22,
  840016.13, 914537.26, 994274.87, 1079594.11,
]

/** Plus value cumulée = objectif − versements cumulés. */
export const PROJECTION_PLUS_VALUE = [
  1100.4, 3378.23, 6915.9, 11801.62, 18129.73, 26001.21, 35524.1, 46813.98,
  59994.56, 75198.18, 92566.45, 112250.91, 134413.67, 159228.23, 186880.2,
  217568.22, 251504.79, 288917.33, 330049.14, 375160.58, 424530.22, 478456.13,
  537257.26, 601274.87, 670874.11,
]

export const LOANS = [
  { maison: 'Nardouzans', numero: '1353608', montant: 54894, restant: 5992.61, mensualite: 667.48, pct: 0.8908 },
  { maison: 'Nardouzans', numero: '1350609', montant: 70000, restant: 68620.98, mensualite: 73.27, pct: 0.0197 },
  { maison: 'Blanche', numero: '1422340', montant: 125737, restant: 83692.06, mensualite: 924.24, pct: 0.3344 },
  { maison: 'Blanche', numero: '1422341', montant: 20000, restant: 16971.21, mensualite: 74.47, pct: 0.1514 },
  { maison: 'Blanche', numero: '1422342', montant: 165000, restant: 163756.29, mensualite: 196.12, pct: 0.0075 },
]

export const CREDITS_TOTALS = { montant: 435631, restant: 339033.15, mensualites: 1935.58, pct: 0.2217 }