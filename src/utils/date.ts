export interface MonthParts {
  year: number
  month: number // 1..12
}

const MONTH_ID_RE = /^(\d{4})-(\d{2})$/

export function assertMonthId(id: string): MonthParts {
  const m = MONTH_ID_RE.exec(id)
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) {
    throw new Error(`Identifiant de mois invalide : ${id}`)
  }
  return { year: Number(m[1]), month: Number(m[2]) }
}

export function toMonthId(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function currentMonthId(): string {
  return toMonthId(new Date())
}

export function addMonths(id: string, delta: number): string {
  const { year, month } = assertMonthId(id)
  const total = year * 12 + (month - 1) + delta
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

export function nextMonthId(id: string): string {
  return addMonths(id, 1)
}

export function previousMonthId(id: string): string {
  return addMonths(id, -1)
}

export function compareMonthIds(a: string, b: string): number {
  assertMonthId(a)
  assertMonthId(b)
  return a < b ? -1 : a > b ? 1 : 0
}

export function formatMonthLabel(id: string): string {
  const { year, month } = assertMonthId(id)
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
}

/** Jours écoulés entre deux dates ISO `YYYY-MM-DD` (valeur absolue). */
export function diffDaysISO(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime()
  const b = new Date(`${end}T00:00:00Z`).getTime()
  return Math.round(Math.abs(b - a) / 86_400_000)
}

/** Mois suivant le dernier mois enregistré (ou mois courant si aucun). */
export function nextAfterIds(ids: string[]): string {
  if (ids.length === 0) return currentMonthId()
  const last = [...ids].sort(compareMonthIds).at(-1)!
  return nextMonthId(last)
}

/** Équivalent EDATE : ajoute des mois en bornant au dernier jour du mois cible. */
export function edate(fromISO: string, months: number): string {
  const d = new Date(`${fromISO}T12:00:00Z`)
  const day = d.getUTCDate()
  const targetLast = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months + 1, 0, 12))
  const clamped = Math.min(day, targetLast.getUTCDate())
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, clamped, 12))
    .toISOString()
    .slice(0, 10)
}