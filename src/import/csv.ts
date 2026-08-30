/** Utilitaires de parsing CSV/TSV pour l'import initial. */

export interface CsvResult {
  /** séparateur détecté */
  separator: string
  headers: string[]
  /** cellules brutes par ligne (sans l'en-tête) */
  rows: string[][]
}

/** Détecte le séparateur : tabulation, `;` ou `,`. */
export function detectSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? ''
  const counts = [['\t', 0], [';', 0], [',', 0]] as const
  let best = '\t'
  let bestCount = -1
  for (const [sep] of counts) {
    // pour la virgule, on ne compte que hors guillemets
    const count = countSeparator(firstLine, sep)
    if (count > bestCount) {
      bestCount = count
      best = sep
    }
  }
  return best
}

function countSeparator(line: string, sep: string): number {
  let count = 0
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') inQuotes = !inQuotes
    else if (ch === sep && !inQuotes) count++
  }
  return count
}

/** Parse un texte CSV/TSV : gère guillemets, retours dans les champs, lignes vides. */
export function parseDelimited(text: string): CsvResult {
  const separator = detectSeparator(text)
  const out = parseRows(text, separator)
  const headerIndex = out.findIndex((cells) => cells.length > 0 && cells.some((c) => /dat/i.test(c)))
  if (headerIndex === -1) {
    return { separator, headers: [], rows: [] }
  }
  const headers = out[headerIndex]
  return { separator, headers, rows: out.slice(headerIndex + 1).filter((r) => r.some((c) => c.trim() !== '')) }
}

function parseRows(text: string, separator: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === separator) {
      pushField()
    } else if (ch === '\n') {
      pushRow()
    } else if (ch === '\r') {
      // ignoré (CRLF géré par \n)
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) pushRow()
  return rows
}

/** Convertit une cellule en nombre (formats FR + US, devises). */
export function parseNumber(cell: string): number | null {
  let v = cell.trim()
  if (!v) return null
  // unité résiduelle (ex. « 0.14 BTC ») : seule la partie numérique est lue
  const unit = /^([0-9.,\s()\u00A0-]+)\s+[A-Za-z€$%]+$/.exec(v)
  if (unit) v = unit[1].trim()
  v = v.replace(/[\s\u00A0€$%]/g, '').replace(/€$/, '')
  if (!v || v === '-' || v === '--' || v === '—') return null
  // valeurs avec du texte résiduel (notes, unités) : rejetées
  if (/[^0-9.,()\-]/.test(v)) return null
  const negative = v.startsWith('(') && v.endsWith(')')
  let s = v.replace(/[()]/g, '')
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')
  if (hasDot && hasComma) {
    if (s.lastIndexOf('.') > s.lastIndexOf(',')) {
      s = s.replace(/,/g, '')
    } else {
      s = s.replace(/\./g, '')
      s = s.replace(/,/, '.')
    }
  } else if (hasComma) {
    // virgule seule : on suppose la décimale FR (export ; ou tab)
    s = s.replace(',', '.')
  }
  const n = parseFloat(s)
  if (Number.isNaN(n)) return null
  return negative ? -n : n
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Extrait un id de mois `YYYY-MM` à partir d'une cellule de date. */
export function parseMonthId(cell: string): string | null {
  const v = cell.trim()
  let m = /^(\d{4})-(\d{1,2})-\d{1,2}$/.exec(v)
  if (m) return `${m[1]}-${pad(Number(m[2]))}`
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    if (day > 12 && month <= 12) return `${m[3]}-${pad(month)}`
    if (month > 12 && day <= 12) return `${m[3]}-${pad(day)}`
    if (month <= 12 && day <= 12) return `${m[3]}-${pad(month)}`
  }
  return null
}

/** Normalise un libellé de colonne pour la correspondance de noms. */
export function columnKey(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\/.*$/g, '')
    .replace(/['"%€$]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export type DomainField = 'bourse' | 'assuranceVie' | 'crowdlending' | 'crypto' | 'horsImmo' | 'total' | 'ignored'

/** Associe chaque colonne à un mapping (alias) pour un domaine donné. */
export function mapColumns(headers: string[], aliases: Record<string, string[]>): { index: number; target: string }[] {
  const out: { index: number; target: string }[] = []
  const used = new Set<number>()
  for (const [target, names] of Object.entries(aliases)) {
    for (let i = 0; i < headers.length; i++) {
      const key = columnKey(headers[i])
      if (used.has(i)) continue
      if (names.some((n) => columnKey(n) === key)) {
        out.push({ index: i, target })
        used.add(i)
        break
      }
    }
  }
  return out
}