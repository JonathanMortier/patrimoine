import type { MonthRecord } from '../db/schema'
import { assuranceVieTotal } from '../calc/assuranceVie'
import { bourseTotal } from '../calc/bourse'
import { crowdlendingTotals } from '../calc/crowdlending'
import { cryptoTotals } from '../calc/crypto'
import { horsImmoTotal, horsImmoLiquidity } from '../calc/horsImmo'

export interface ReconciledRow {
  id: string
  /** hors immo reconstruit à partir des domaines importés */
  recomposed: number
  /** total hors immo saisi dans la feuille (si présente) */
  source: number | null
  diff: number | null
  /** domaines pour lesquels aucun montant n'est renseigné ce mois-ci */
  missingDomains: string[]
}

export type DomainKey = keyof Pick<MonthRecord, 'bourse' | 'assuranceVie' | 'crowdlending' | 'crypto' | 'horsImmo'>

/**
 * Réconciliation : pour chaque mois, recompose le hors immo à partir des
 * domaines (comptes + livrets + totaux calculés) et le compare au total
 * « source » saisi dans la feuille Hors immo.
 */
export function reconcileMonths(
  months: MonthRecord[],
  sourceTotals: Map<string, number>,
  convUsdEur: number,
): ReconciledRow[] {
  return months
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((m) => {
      const liquidity = horsImmoLiquidity(m.horsImmo)
      const parts = {
        compteCourant: liquidity.compteCourant,
        livrets: liquidity.livrets,
        bourse: bourseTotal(m.bourse),
        assuranceVie: assuranceVieTotal(m.assuranceVie),
        crowdlending: crowdlendingTotals(m.crowdlending).total,
        crypto: cryptoTotals(m.crypto, convUsdEur).totalEur,
      }
      const recomposed = horsImmoTotal(parts)
      const source = sourceTotals.get(m.id) ?? null
      const missingDomains: string[] = []
      const no = (v: number) => Math.abs(v) < 1e-9
      if (no(parts.bourse)) missingDomains.push('Bourse')
      if (no(parts.assuranceVie)) missingDomains.push('Assurance Vie')
      if (no(parts.crowdlending)) missingDomains.push('Crowdlending')
      if (no(parts.crypto)) missingDomains.push('Crypto')
      if (no(parts.compteCourant) && no(parts.livrets)) missingDomains.push('Comptes/Livrets')
      return {
        id: m.id,
        recomposed,
        source,
        diff: source === null ? null : recomposed - source,
        missingDomains,
      }
    })
}

/** Chiffre « d'écart » lisible pour la réconciliation. */
export function formatReconDiff(diff: number | null): string {
  if (diff === null) return '—'
  if (Math.abs(diff) < 0.005) return '✓'
  return `${diff > 0 ? '+' : ''}${diff.toFixed(2).replace('.', ',')} €`
}