import type { BourseSnapshot } from '../db/schema'

export function bourseTotal(b: BourseSnapshot): number {
  return b.cto + b.privateMk + b.pea
}

/** APY: rendement PEA annualisé depuis le 1er janvier (365/jours écoulés). */
export function annualizeAPY(rendementPct: number, daysSinceJan1: number): number {
  return daysSinceJan1 > 0 ? rendementPct * (365 / daysSinceJan1) : 0
}