import { describe, expect, it } from 'vitest'
import { escapeAttr, escapeHtml } from '../format'

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