import { describe, expect, it } from 'vitest'
import { brutTotal, netTotal, immoBrut, immoNet, restantDette, btcShare } from '../netBrut'

describe('brut / net', () => {
  const loans = [
    { montant: 54894, restant: 5992.61 },
    { montant: 70000, restant: 68620.98 },
    { montant: 125737, restant: 83692.06 },
    { montant: 20000, restant: 16971.21 },
    { montant: 165000, restant: 163756.29 },
  ]

  it('immoBrut = somme des « Total » (montant) des crédits', () => {
    expect(immoBrut(loans)).toBeCloseTo(435631, 4)
    expect(immoBrut([])).toBe(0)
  })

  it('restantDette = somme des restants dus', () => {
    expect(restantDette(loans)).toBeCloseTo(339033.15, 4)
  })

  it('immoNet = somme de (Total − Restant)', () => {
    expect(immoNet(loans)).toBeCloseTo(96597.85, 4)
  })

  it('brut = hors immo + valeur immo', () => {
    expect(brutTotal(181064.5, 435631)).toBeCloseTo(616695.5, 4)
  })

  it('net = brut − dette', () => {
    expect(netTotal(616695.5, 339033.15)).toBeCloseTo(277662.35, 4)
  })

  it('btcShare = valeur BTC / total, null si total nul', () => {
    expect(btcShare(10000, 200000)).toBeCloseTo(0.05, 6)
    expect(btcShare(10000, 0)).toBeNull()
  })
})
