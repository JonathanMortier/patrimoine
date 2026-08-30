/** Hors immo : total = comptes + livrets + totaux des domaines. */
export interface HorsImmoParts {
  compteCourant: number
  livrets: number
  bourse: number
  assuranceVie: number
  crowdlending: number
  crypto: number
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