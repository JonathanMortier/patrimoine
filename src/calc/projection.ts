/**
 * Projection Bourse — récurrence annuelle des fonctions custom du tableur :
 *   compute_year_total(base, taux, invest)  = base×(1+taux) + 12×invest
 *   compute_month_total(base, taux, invest) = base×(1+taux/12) + invest
 */
export function computeYearTotal(base: number, taux: number, investAnnuel: number): number {
  return base * (1 + taux) + investAnnuel
}

export function computeMonthTotal(base: number, taux: number, investMensuel: number): number {
  return base * (1 + taux / 12) + investMensuel
}

/**
 * compute_plus_value(currentTotal, nbYears, investMensuel) du tableur :
 *   plus value = total − nbYears × investMensuel × 12
 * nbYears = nombre d'années de versements cumulés (année − année de base).
 */
export function computePlusValue(currentTotal: number, nbYears: number, investMensuel: number): number {
  return currentTotal - nbYears * investMensuel * 12
}

export interface ProjectionYear {
  year: number
  objectif: number
  /** gain cumulé = objectif − versements cumulés (colonne « Plus value » ODS) */
  plusValue: number
  /** évolution de la plus value d'une année sur l'autre */
  evolPlusValue: number
}

export interface ProjectObjectifOptions {
  /** année de départ (celle du `baseValue`) */
  startYear: number
  baseValue: number
  investMensuel: number
  taux: number
  /** nombre d'années projetées */
  years: number
}

/** Suite « objectif » : total, gain cumulé et évolution du gain par an. */
export function projectObjectif(o: ProjectObjectifOptions): ProjectionYear[] {
  const investAnnuel = o.investMensuel * 12
  const out: ProjectionYear[] = []
  let prev = o.baseValue
  let prevPlus = 0
  for (let y = 0; y < o.years; y++) {
    const objectif = computeYearTotal(prev, o.taux, investAnnuel)
    const plusValue = computePlusValue(objectif, y + 1, o.investMensuel)
    out.push({
      year: o.startYear + y + 1,
      objectif,
      plusValue,
      evolPlusValue: plusValue - prevPlus,
    })
    prev = objectif
    prevPlus = plusValue
  }
  return out
}

/** Salaire mensuel issu d'un retrait de 4 % par an sur un capital. */
export function withdrawalMonthly(capital: number, rate = 0.04): number {
  return (capital * rate) / 12
}