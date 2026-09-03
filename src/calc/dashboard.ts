import type { Constantes, MonthRecord } from '../db/schema'
import { computeDerivedMonth } from './index'
import { addMonths, compareMonthIds, currentMonthId } from '../utils/date'

export interface DashboardPoint {
  id: string
  short: string // MM/YY
  horsImmo: number
  bourse: number
  assuranceVie: number
  crowdlending: number
  crypto: number
  compteCourant: number
  livrets: number
  partBtc: number | null
  btcValueEur: number
  variation: number | null
}

/** Construit une série chronologique dérivée pour le dashboard. */
export function dashboardSeries(months: MonthRecord[], constantes: Constantes): DashboardPoint[] {
  const sorted = [...months].sort((a, b) => compareMonthIds(a.id, b.id))
  let prevTotal: number | null = null
  return sorted.map((m) => {
    const d = computeDerivedMonth(m, constantes, prevTotal)
    const liq = (() => {
      const h = m.horsImmo
      return {
        compteCourant: h.compteCourantCa + h.compteCourantFortuneo + h.compteCourantTradeRep,
        livrets: h.livretA + h.ldd,
      }
    })()
    const point: DashboardPoint = {
      id: m.id,
      short: m.id.slice(5) + '/' + m.id.slice(2, 4),
      horsImmo: d.horsImmo.total,
      bourse: d.bourse,
      assuranceVie: d.assuranceVie,
      crowdlending: d.crowdlending.total,
      crypto: d.crypto,
      compteCourant: liq.compteCourant,
      livrets: liq.livrets,
      partBtc: d.partBtc,
      btcValueEur: d.partBtc === null ? 0 : d.partBtc * d.crypto,
      variation: d.horsImmo.variation,
    }
    prevTotal = d.horsImmo.total
    return point
  })
}

/** Mois absents sur les `horizon` derniers mois (inclus le mois courant). */
export function missingMonths(ids: string[], horizon = 12): string[] {
  const present = new Set(ids)
  const out: string[] = []
  for (let i = horizon - 1; i >= 0; i--) {
    const id = addMonths(currentMonthId(), -i)
    if (!present.has(id)) out.push(id)
  }
  return out
}
