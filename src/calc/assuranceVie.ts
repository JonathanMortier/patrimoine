import { diffDaysISO } from '../utils/date'
import type { AssuranceVieSnapshot } from '../db/schema'

export function assuranceVieTotal(a: AssuranceVieSnapshot): number {
  return (
    a.livretVie +
    a.multiVie +
    a.cashFortuneo +
    a.linxea +
    a.scpi
  )
}

/**
 * APY formule ODS : ((total − base − investCumule) / base) ×100 ×365/jours.
 * base = premier total d'Assurance Vie, investCumule = versements cumulés.
 */
export function assuranceVieApy(
  total: number,
  baseTotal: number,
  baseDateISO: string,
  dateISO: string,
  investCumule: number,
): number {
  const days = diffDaysISO(baseDateISO, dateISO)
  if (days <= 0 || baseTotal === 0) return 0
  return ((total - baseTotal - investCumule) / baseTotal) * 100 * (365 / days)
}