import { describe, expect, it } from 'vitest'

import { buildMonthlyProjection } from '../projectionMonthly'

describe('projectionMonthly — Partie 1', () => {
  const real = new Map<string, number>([
    ['2026-01', 37334.33],
    ['2026-02', 39956.45],
    ['2026-03', 41592.29],
  ])

  it('objectif suit la récurrence mensuelle depuis la valeur au 1er janv', () => {
    const p = buildMonthlyProjection({
      realBourse: real,
      baseValue: 36185,
      investMensuel: 1310,
      taux: 0.07,
      year: 2026,
    })
    expect(p).toHaveLength(12)
    // 36185 * (1 + 0.07/12) + 1310
    expect(p[0].objectif).toBeCloseTo(36185 * (1 + 0.07 / 12) + 1310, 6)
    // récurrence : chaque mois = préc. * (1+taux/12) + invest
    expect(p[1].objectif).toBeCloseTo(p[0].objectif * (1 + 0.07 / 12) + 1310, 6)
  })

  it('réel reprend les mois enregistrés jusqu\'au mois courant', () => {
    const p = buildMonthlyProjection({
      realBourse: real,
      baseValue: 36185,
      investMensuel: 1310,
      taux: 0.07,
      year: 2026,
    })
    expect(p[0].reel).toBeCloseTo(37334.33, 6)
    expect(p[1].reel).toBeCloseTo(39956.45, 6)
    expect(p[2].reel).toBeCloseTo(41592.29, 6)
    // aucun mois enregistré après mars 2026 → réél vide jusqu'à la fin de l'année
    for (const m of p.slice(3)) expect(m.reel).toBeNull()
  })

  it('réel reste null si aucun mois n\'est enregistré', () => {
    const p = buildMonthlyProjection({
      realBourse: new Map(),
      baseValue: 1000,
      investMensuel: 500,
      taux: 0.07,
      year: 2026,
    })
    for (const m of p) expect(m.reel).toBeNull()
  })

  it('réel vide après le mois courant même si des mois futurs existent', () => {
    const withFuture = new Map(real)
    withFuture.set('2026-10', 60000)
    withFuture.set('2026-11', 61000)
    const p = buildMonthlyProjection({
      realBourse: withFuture,
      baseValue: 36185,
      investMensuel: 1310,
      taux: 0.07,
      year: 2026,
      currentMonth: 9,
    })
    // mars (index 2) est le dernier mois réellement enregistré
    expect(p[2].reel).toBeCloseTo(41592.29, 6)
    // octobre (index 9) et au-delà : vide, même s'ils sont dans la base
    expect(p[9].reel).toBeNull()
    expect(p[10].reel).toBeNull()
    expect(p[11].reel).toBeNull()
  })
})
