import { parseDelimited, parseNumber, columnKey } from './csv'
import type { Loan } from '../db/schema'

export interface CreditLoanInput {
  nom: string
  numero: number
  dateDepart: string | null
  dateFin: string | null
  taux: number | null
  mensualite: number | null
  montant: number | null
  restant: number | null
  pctRembourse: number | null
}

export interface CreditParseResult {
  separator: string
  headers: string[]
  loans: (CreditLoanInput | null)[]
  skipped: { line: number; reason: string }[]
}

interface MappedCell {
  index: number
  key: string
}

const CREDIT_COLUMNS: Record<string, string[]> = {
  nom: ['Maison'],
  numero: ['Numéro crédit', 'Numero credit', 'N° crédit'],
  dateDepart: ['Date départ', 'Date depart'],
  dateFin: ['Date fin'],
  taux: ['Taux'],
  mensualite: ['Montant'],
  montant: ['Total'],
  restant: ['Restant'],
  pctRembourse: ['Pourcentage remboursé', 'Pourcentage rembourse', 'Pourcentage remb'],
}

const MARKERS = new Set(['sous total', 'sous-total', 'sous', 'total'])

/**
 * Parse la feuille « Crédits immo » exportée en CSV/TSV (layout actuel de
 * l'Excel). Chaque ligne de prêt est identifiée par un numéro de crédit.
 *
 * Regroupement par bien : les lignes « Sous total » délimitent chaque propriété.
 * Dans chaque bloc, le nom (Maison) se reporte vers le bas — cela gère le cas
 * courant d'un libellé fusionné sur toute la propriété (seule la 2e ligne le
 * porte). Les lignes « Sous total » / « Total » et les lignes vides sont ignorées.
 */
export function parseCreditSheet(text: string): CreditParseResult {
  const csv = parseDelimited(text)
  const mapped: MappedCell[] = []
  for (const [key, names] of Object.entries(CREDIT_COLUMNS)) {
    for (let i = 0; i < csv.headers.length; i++) {
      if (names.some((n) => columnKey(n) === columnKey(csv.headers[i]))) {
        mapped.push({ index: i, key })
        break
      }
    }
  }

  const cell = (cells: string[], key: string): string => {
    const m = mapped.find((x) => x.key === key)
    return m === undefined ? '' : cells[m.index] ?? ''
  }

  const groups: CreditLoanInput[][] = []
  let current: CreditLoanInput[] = []
  const skipped: CreditParseResult['skipped'] = []

  const flush = (): void => {
    // Un segment (entre deux « Sous total ») correspond à une seule propriété :
    // on reporte le premier libellé non vide sur toute la ligne de prêts.
    const nom = current.map((l) => l.nom.trim()).find((n) => n) ?? ''
    for (const l of current) l.nom = nom
    groups.push(current)
    current = []
  }

  csv.rows.forEach((cells, i) => {
    const line = i + 2
    const label = cell(cells, 'nom').trim()
    const numeroRaw = cell(cells, 'numero').trim()

    if (!numeroRaw) {
      if (label && MARKERS.has(columnKey(label))) {
        flush()
        skipped.push({ line, reason: 'sub-total' })
      } else {
        skipped.push({ line, reason: 'no-numero' })
      }
      return
    }

    current.push({
      nom: label,
      numero: parseNumber(numeroRaw)!,
      dateDepart: parseDateISO(cell(cells, 'dateDepart')),
      dateFin: parseDateISO(cell(cells, 'dateFin')),
      taux: percentToFraction(parseNumber(cell(cells, 'taux'))),
      mensualite: parseNumber(cell(cells, 'mensualite')),
      montant: parseNumber(cell(cells, 'montant')),
      restant: parseNumber(cell(cells, 'restant')),
      pctRembourse: parseNumber(cell(cells, 'pctRembourse')),
    })
  })
  flush()

  return {
    separator: csv.separator,
    headers: csv.headers,
    loans: groups.flatMap((g) => g),
    skipped,
  }
}

/** Convertit une date DD/MM/YYYY ou YYYY-MM-DD en ISO YYYY-MM-DD. */
function parseDateISO(cell: string): string | null {
  const v = cell.trim()
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v)
  if (m) return `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v)
  if (m) return `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`
  return null
}

/** Un pourcentage (ex. 0,60 ou 0.60) en fraction (0.006). */
function percentToFraction(n: number | null): number | null {
  return n === null ? null : n / 100
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Construit un enregistrement Loan complet pour une ligne parsée. */
export function toLoan(input: CreditLoanInput): Loan {
  return {
    id: `${input.nom}-${input.numero}`,
    nom: input.nom,
    numero: input.numero,
    dateDepart: input.dateDepart ?? '',
    dateFin: input.dateFin ?? '',
    taux: input.taux ?? 0,
    mensualite: input.mensualite ?? 0,
    montant: input.montant ?? 0,
    restant: input.restant ?? 0,
    pctRembourse: input.pctRembourse ?? 0,
  }
}
