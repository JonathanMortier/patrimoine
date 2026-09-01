/** Hors immo : total = comptes + livrets + totaux des domaines. */
import type { HorsImmoSnapshot } from '../db/schema'

export interface HorsImmoParts {
  compteCourant: number
  livrets: number
  bourse: number
  assuranceVie: number
  crowdlending: number
  crypto: number
}

/** Sous-totaux liquides : comptes courants et livrets, chacun sommés. */
export function horsImmoLiquidity(h: HorsImmoSnapshot): { compteCourant: number; livrets: number } {
  return {
    compteCourant: h.compteCourantCa + h.compteCourantFortuneo + h.compteCourantTradeRep,
    livrets: h.livretA + h.ldd,
  }
}

export function horsImmoTotal(parts: HorsImmoParts): number {
  return (
    parts.compteCourant +
    parts.livrets +
    parts.bourse +
    parts.assuranceVie +
    parts.crowdlending +
    parts.crypto
  )
}

/** Variation mensuelle : null si aucun mois précédent. */
export function horsImmoVariation(total: number, prevTotal: number | null): number | null {
  return prevTotal === null ? null : total - prevTotal
}