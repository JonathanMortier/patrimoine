import { edate } from '../utils/date'
import type { Loan } from '../db/schema'

export function pctRembourse(loan: Pick<Loan, 'montant' | 'restant'>): number {
  if (loan.montant === 0) return 0
  return (loan.montant - loan.restant) / loan.montant
}

export function monthlyReimbursement(loans: Array<Pick<Loan, 'mensualite'>>): number {
  return loans.reduce((acc, l) => acc + l.mensualite, 0)
}

export function totals(loans: Array<Pick<Loan, 'montant' | 'restant'>>): {
  emprunt: number
  restant: number
  pct: number
} {
  const emprunt = loans.reduce((a, l) => a + l.montant, 0)
  const restant = loans.reduce((a, l) => a + l.restant, 0)
  return { emprunt, restant, pct: pctRembourse({ montant: emprunt, restant }) }
}

/**
 * Nb de mois pour passer sous le palier d'emprunt (250 k€) avec les
 * mensualités en capital actuelles. Équivalent du INT((restant−palier)/
 * mensualités + 1) du tableur.
 */
export function monthsUnderPrincipal(
  restantTotal: number,
  mensualites: number,
  threshold = 250_000,
): number {
  const ratio = (restantTotal - threshold) / mensualites
  return ratio > 0 ? Math.floor(ratio + 1) : 0
}

/** EDATE(TODAY() ; months) — date estimative du passage sous le palier. */
export function dateUnderPrincipal(fromISO: string, months: number): string {
  return edate(fromISO, months)
}