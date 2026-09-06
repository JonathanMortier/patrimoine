import { describe, expect, it } from 'vitest'
import { escapeAttr, escapeHtml, fmtEuro, fmtPct } from '../format'

describe('escapeHtml / escapeAttr', () => {
  it('échappe les caractères HTML sensibles en contexte texte', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    expect(escapeHtml(`a'b`)).toBe('a&#39;b')
    expect(escapeHtml('a&b')).toBe('a&amp;b')
  })

  it('échappe dans un attribut entre guillemets doubles', () => {
    expect(escapeAttr('"><img src=x onerror=alert(1)>')).toBe('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;')
  })

  it('neutralise les valeurs nulles/vides', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
    expect(escapeHtml('')).toBe('')
    expect(escapeHtml(42)).toBe('42')
    expect(escapeHtml(0)).toBe('0')
  })
})

describe('fmtEuro', () => {
  it('formate un montant en euros avec séparateur de milliers insécable', () => {
    const result = fmtEuro(12345)
    expect(result).toContain('12')
    expect(result).toContain('345')
    expect(result).toContain('\u202f')
    expect(result).toContain('€')
  })

  it('utilise les décimales demandées', () => {
    expect(fmtEuro(12.345, 2)).toContain('12,35')
    expect(fmtEuro(12345, 0)).not.toContain(',')
  })
})

describe('fmtPct', () => {
  it('formate un pourcentage avec 1 décimale par défaut', () => {
    expect(fmtPct(0.07)).toBe('0.1 %')
    expect(fmtPct(12.5)).toBe('12.5 %')
  })

  it('arrondit au nombre de décimales demandé', () => {
    expect(fmtPct(0.0749, 2)).toBe('0.07 %')
    expect(fmtPct(0.0751, 2)).toBe('0.08 %')
    expect(fmtPct(0.123456, 0)).toBe('0 %')
  })
})