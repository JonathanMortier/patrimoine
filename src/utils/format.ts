/** Formats d'affichage courts et partagés. */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Échappe du texte avant interpolation dans du HTML (contexte texte).
 *  Sûr aussi pour les attributs entre guillemets doubles. */
export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c)
}

/** Échappe une valeur dans un attribut HTML entre guillemets doubles. */
export function escapeAttr(value: string | number | null | undefined): string {
  return escapeHtml(value)
}

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