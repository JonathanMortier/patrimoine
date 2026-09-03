import type { Loan } from '../db/schema'

/** Valeur immobilière brute = somme de la colonne « Total » des crédits (montant des prêts). */
export function immoBrut(loans: Pick<Loan, 'montant'>[]): number {
  return loans.reduce((a, l) => a + l.montant, 0)
}

/** Restant dû total = somme de la colonne « Restant ». */
export function restantDette(loans: Pick<Loan, 'restant'>[]): number {
  return loans.reduce((a, l) => a + l.restant, 0)
}

/** Valeur nette immobilière = Total − Restant (par crédit, puis somme). */
export function immoNet(loans: Pick<Loan, 'montant' | 'restant'>[]): number {
  return loans.reduce((a, l) => a + (l.montant - l.restant), 0)
}

/** Patrimoine brut = hors immo + valeur immobilière brute. */
export function brutTotal(horsImmo: number, immo: number): number {
  return horsImmo + immo
}

/** Patrimoine net = brut − restant dû (= hors immo + valeur nette immobilière). */
export function netTotal(brut: number, dette: number): number {
  return brut - dette
}

/** Part BTC dans le patrimoine : € détenus en BTC / total. */
export function btcShare(btcEurValue: number, total: number): number | null {
  return total > 0 ? btcEurValue / total : null
}
