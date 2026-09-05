import { computePlusValue, computeYearTotal } from './projection'

export interface AnnualProjectionPoint {
  year: number
  /** Total Objectif */
  objectif: number
  /** Plus value cumulée Objectif = total − versements cumulés */
  objectifPlusValue: number
  /** Évolution de la plus value Objectif d'une année sur l'autre */
  objectifEvol: number
  /** Total Réel (valeur au 1er janv en base, sinon projection) */
  reel: number
  reelReal: boolean
  /** Plus value cumulée Réel = total − versements cumulés */
  reelPlusValue: number
  /** Évolution de la plus value Réel d'une année sur l'autre */
  reelEvol: number
}

export interface AnnualProjectionOptions {
  /** première année affichée (ex. 2025) */
  startYear: number
  /** valeur au 1er janvier de l'année de base (année précédant startYear) */
  baseValue: number
  investMensuel: number
  taux: number
  /** nombre d'années affichées */
  years: number
  /** total bourse réel au 1er janvier de l'année, ou null si non enregistré */
  realJanuary: (year: number) => number | null
}

/**
 * Partie annuelle de la feuille « Projection Bourse » (2025 → 2050) :
 *   - Objectif : récurrence annuelle `compute_year_total` depuis l'année de base.
 *   - Réel : les valeurs au 1er janvier enregistrées remplacent la projection
 *     quand elles existent, sinon la même récurrence annuelle.
 *   - Plus value = total − versements cumulés ; évolution = différence d'une
 *     année sur l'autre (lignes Plus value / Evol plus-value de l'ODS).
 */
export function buildAnnualProjection(o: AnnualProjectionOptions): AnnualProjectionPoint[] {
  const investAnnuel = o.investMensuel * 12
  const out: AnnualProjectionPoint[] = []
  let prevObjectif = o.baseValue
  let prevReel = o.baseValue
  let prevObjectifPlus = 0
  let prevReelPlus = 0
  for (let i = 0; i < o.years; i++) {
    const year = o.startYear + i

    const objectif = computeYearTotal(prevObjectif, o.taux, investAnnuel)
    const objectifPlusValue = computePlusValue(objectif, i + 1, o.investMensuel)

    const real = o.realJanuary(year)
    const reel = real !== null ? real : computeYearTotal(prevReel, o.taux, investAnnuel)
    const reelPlusValue = computePlusValue(reel, i + 1, o.investMensuel)

    out.push({
      year,
      objectif,
      objectifPlusValue,
      objectifEvol: objectifPlusValue - prevObjectifPlus,
      reel,
      reelReal: real !== null,
      reelPlusValue,
      reelEvol: reelPlusValue - prevReelPlus,
    })

    prevObjectif = objectif
    prevReel = reel
    prevObjectifPlus = objectifPlusValue
    prevReelPlus = reelPlusValue
  }
  return out
}