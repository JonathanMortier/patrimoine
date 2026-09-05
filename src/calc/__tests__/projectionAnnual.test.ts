import { describe, expect, it } from 'vitest'

import { buildAnnualProjection } from '../projectionAnnual'

describe('projectionAnnual — Partie annuelle (2025→2050)', () => {
  const opts = {
    startYear: 2025,
    baseValue: 0,
    investMensuel: 1310,
    taux: 0.07,
    years: 26,
  }

  it('objectif : récurrence annuelle depuis l\'année de base (valeurs ODS)', () => {
    const p = buildAnnualProjection({ ...opts, realJanuary: () => null })
    expect(p).toHaveLength(26)
    expect(p[0].year).toBe(2025)
    // compute_year_total(0, 7%, 1310) = 1310×12
    expect(p[0].objectif).toBeCloseTo(15720, 6)
    // compute_year_total(15720, 7%, 1310) = 15720×1.07 + 15720
    expect(p[1].objectif).toBeCloseTo(32540.4, 6)
    expect(p[2].objectif).toBeCloseTo(50538.228, 6)
    // continuation de la recurrence
    for (let i = 1; i < p.length; i++) {
      expect(p[i].objectif).toBeCloseTo(p[i - 1].objectif * 1.07 + 1310 * 12, 6)
    }
  })

  it('plus value = total − versements cumulés (i+1 souscriptures)', () => {
    const p = buildAnnualProjection({ ...opts, realJanuary: () => null })
    expect(p[0].objectifPlusValue).toBeCloseTo(0, 6) // 2025 : 15720 − 1×15720
    expect(p[1].objectifPlusValue).toBeCloseTo(1100.4, 6) // 2026 : 32540.4 − 2×15720
    expect(p[2].objectifPlusValue).toBeCloseTo(3378.228, 6) // 2027 : 50538.228 − 3×15720
  })

  it('évolution plus value = différence d\'une année sur l\'autre', () => {
    const p = buildAnnualProjection({ ...opts, realJanuary: () => null })
    expect(p[0].objectifEvol).toBeCloseTo(0, 6)
    for (let i = 1; i < p.length; i++) {
      expect(p[i].objectifEvol).toBeCloseTo(p[i].objectifPlusValue - p[i - 1].objectifPlusValue, 6)
    }
  })

  it('réel : remplace par la valeur du 1er janvier quand elle existe', () => {
    const real = new Map<number, number>([
      [2025, 10046.62],
      [2026, 37334.33],
    ])
    const p = buildAnnualProjection({ ...opts, realJanuary: (y) => real.get(y) ?? null })
    expect(p[0].reel).toBeCloseTo(10046.62, 6)
    expect(p[0].reelReal).toBe(true)
    expect(p[1].reel).toBeCloseTo(37334.33, 6)
    expect(p[1].reelReal).toBe(true)
    // sans valeur réelle → projection depuis la précédente
    expect(p[2].reel).toBeCloseTo(37334.33 * 1.07 + 1310 * 12, 6)
    expect(p[2].reelReal).toBe(false)
  })

  it('décale proprement si l\'année de base démarre avant les données', () => {
    const p = buildAnnualProjection({ ...opts, realJanuary: (y) => (y === 2025 ? 99999 : null) })
    expect(p[0].reel).toBeCloseTo(99999, 6)
    expect(p[1].reel).toBeCloseTo(99999 * 1.07 + 1310 * 12, 6)
  })
})