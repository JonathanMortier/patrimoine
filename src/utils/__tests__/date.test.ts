import { describe, it, expect } from 'vitest'
import {
  assertMonthId,
  addMonths,
  nextMonthId,
  previousMonthId,
  compareMonthIds,
  toMonthId,
} from '../date'

describe('assertMonthId', () => {
  it('accepts valid ids', () => {
    expect(assertMonthId('2024-01')).toEqual({ year: 2024, month: 1 })
    expect(assertMonthId('2026-12')).toEqual({ year: 2026, month: 12 })
  })

  it('rejects invalid ids', () => {
    expect(() => assertMonthId('2024-13')).toThrow()
    expect(() => assertMonthId('2024-00')).toThrow()
    expect(() => assertMonthId('2024')).toThrow()
    expect(() => assertMonthId('2024-1')).toThrow()
    expect(() => assertMonthId('abc')).toThrow()
  })
})

describe('month arithmetic', () => {
  it('toMonthId formats year and zero-padded month', () => {
    expect(toMonthId(new Date(2026, 7, 15))).toBe('2026-08')
  })

  it('addMonths handles year rollover', () => {
    expect(addMonths('2024-12', 1)).toBe('2025-01')
    expect(addMonths('2025-01', -1)).toBe('2024-12')
    expect(addMonths('2024-01', 14)).toBe('2025-03')
  })

  it('next/previous wrap correctly', () => {
    expect(nextMonthId('2026-08')).toBe('2026-09')
    expect(previousMonthId('2026-01')).toBe('2025-12')
  })

  it('compares and sorts month ids', () => {
    const ids = ['2026-01', '2025-12', '2026-08']
    expect(ids.sort(compareMonthIds)).toEqual(['2025-12', '2026-01', '2026-08'])
    expect(compareMonthIds('2026-01', '2026-01')).toBe(0)
  })
})
import { nextAfterIds, currentMonthId } from '../date'

describe('nextAfterIds', () => {
  it('returns next month after the last stored id', () => {
    expect(nextAfterIds(['2025-01', '2026-08', '2025-12'])).toBe('2026-09')
    expect(nextAfterIds(['2024-08'])).toBe('2024-09')
  })
  it('falls back to the current month when empty', () => {
    expect(nextAfterIds([])).toBe(currentMonthId())
  })
})
