import { computeMonthTotal } from './projection'

export interface MonthlyProjectionPoint {
  /** mois calendaire réel (YYYY-MM) */
  monthId: string
  /** libellé court MM/YY */
  label: string
  /** trajectoire objectif (récurrence mensuelle depuis la valeur au 1er janv) */
  objectif: number
  /** total bourse réel du mois, puis projection après le dernier mois saisi */
  reel: number | null
}

export interface MonthlyProjectionOptions {
  /** total bourse réel par mois (indexé par monthId) */
  realBourse: Map<string, number>
  /** valeur au 1er janvier = total bourse de décembre N−1 */
  baseValue: number
  investMensuel: number
  taux: number
  /** année en cours projetée */
  year: number
  /** mois courant (1..12) : le Réel reste vide après — mois futurs ignorés */
  currentMonth?: number
}

/**
 * Partie 1 de la feuille « Projection Bourse » : récurrence mensuelle sur
 * l'année en cours. La ligne « Objectif » part de la valeur au 1er janvier et
 * applique `compute_month_total` chaque mois ; la ligne « Réel » reprend les
 * totaux bourse enregistrés et reste vide après le dernier mois saisi.
 */
export function buildMonthlyProjection(o: MonthlyProjectionOptions): MonthlyProjectionPoint[] {
  const out: MonthlyProjectionPoint[] = []
  let prevObjectif = o.baseValue
  const currentMonth = o.currentMonth ?? 12
  for (let m = 1; m <= 12; m++) {
    const monthId = `${o.year}-${String(m).padStart(2, '0')}`
    const objectif = computeMonthTotal(prevObjectif, o.taux, o.investMensuel)
    const reel = m <= currentMonth ? (o.realBourse.get(monthId) ?? null) : null
    out.push({ monthId, label: monthId.slice(5) + '/' + monthId.slice(2, 4), objectif, reel })
    prevObjectif = objectif
  }
  return out
}
