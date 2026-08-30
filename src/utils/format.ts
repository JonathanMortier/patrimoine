/** Formats d'affichage courts et partagés. */

export function fmtEuro(n: number, digits = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: digits,
  }).format(n)
}

export function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)} %`
}

/** Valeur pour un <input type="number"> (décimale à point, sans groupement). */
export function fmtAmount(n: number): string {
  return new Intl.NumberFormat('en-US', {
    useGrouping: false,
    maximumFractionDigits: 4,
  }).format(n)
}