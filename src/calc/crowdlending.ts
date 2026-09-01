import { diffDaysISO } from '../utils/date'
import type { CrowdlendingSnapshot } from '../db/schema'

export const FISCALITE_RATE = 0.3

export interface CrowdlendingTotals {
  total: number
  fiscalite: number
  net: number
}

/** total = investi + solde dispo ; fiscalité = montant saisi, sinon 30 % du brut. */
export function crowdlendingTotals(c: CrowdlendingSnapshot): CrowdlendingTotals {
  const fiscalite = c.fiscalite > 0 ? c.fiscalite : c.revenuBrut * FISCALITE_RATE
  return { total: c.investi + c.soldeDispo, fiscalite, net: c.revenuBrut - fiscalite }
}

/**
 * APY formule ODS : ((total − base) / base) ×100 ×365/jours.
 * base = total d'un mois de référence (2025-03 dans la sheet).
 */
export function crowdlendingApy(
  total: number,
  baseTotal: number,
  baseDateISO: string,
  dateISO: string,
): number {
  const days = diffDaysISO(baseDateISO, dateISO)
  if (days <= 0 || baseTotal === 0) return 0
  return ((total - baseTotal) / baseTotal) * 100 * (365 / days)
}