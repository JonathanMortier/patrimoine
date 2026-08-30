import { describe, expect, it } from 'vitest'
import { parseSheet, type SheetKind } from '../parsers'
import horsImmoRaw from '../__fixtures__/horsImmo.tsv?raw'
import bourseRaw from '../__fixtures__/bourse.tsv?raw'
import cryptoRaw from '../__fixtures__/crypto.tsv?raw'
import assuranceVieRaw from '../__fixtures__/assuranceVie.tsv?raw'
import crowdlendingRaw from '../__fixtures__/crowdlending.tsv?raw'

function parsed(kind: SheetKind, text: string) {
  return parseSheet(text, kind)
}

describe('exports réels des feuilles (layouts courants)', () => {
  it('Hors immo : 25 mois, valeurs exactes', () => {
    const r = parsed('horsImmo', horsImmoRaw)
    expect(r.rows).toHaveLength(25)
    const first = r.rows.find((x) => x.id === '2025-01')!.values
    expect(first.compteCourant).toBeCloseTo(9288.62, 4)
    expect(first.livrets).toBeCloseTo(30445.9, 4)
    expect(first.total).toBeCloseTo(121433.6, 4)
    const last = r.rows.find((x) => x.id === '2026-08')!.values
    expect(last.compteCourant).toBeCloseTo(10341.02, 4)
    expect(last.total).toBeCloseTo(179103.49, 4)
    expect(last.revenusGlobaux).toBeCloseTo(-1961.01, 4)
  })
  it('Bourse : 25 mois, total = composantes (à partir de 2026)', () => {
    const r = parsed('bourse', bourseRaw)
    expect(r.rows).toHaveLength(25)
    const m26 = r.rows.find((x) => x.id === '2026-03')!.values
    expect(m26.cto).toBeCloseTo(11844.02, 4)
    expect(m26.privateMk).toBeCloseTo(251.71, 4)
    expect(m26.pea).toBeCloseTo(29496.56, 4)
    expect(m26.total).toBeCloseTo(41592.29, 4)
    const last = r.rows.find((x) => x.id === '2026-08')!.values
    expect(last.cto).toBeCloseTo(16913.84, 4)
    expect(last.total).toBeCloseTo(51693.93, 4)
  })
  it('Crypto : 25 mois, $ convertis et colonnes par wallet', () => {
    const r = parsed('crypto', cryptoRaw)
    expect(r.rows).toHaveLength(25)
    const m = r.rows.find((x) => x.id === '2026-03')!.values
    expect(m.total).toBeCloseTo(14757.77, 4)
    expect(m.tradeRep).toBeCloseTo(205.52, 4)
    expect(m.ledger).toBeCloseTo(4513.6, 4)
    expect(m.hotWalletPrincipalUSD).toBe(6826.92)
    expect(m.hotWalletLedgerUSD).toBe(3080.42)
    expect(m.defiUSD).toBe(1536.72)
    expect(m.btc).toBeCloseTo(0.14, 5)
  })
  it('Assurance Vie : 25 mois, composants et total', () => {
    const r = parsed('assuranceVie', assuranceVieRaw)
    expect(r.rows).toHaveLength(25)
    const last = r.rows.find((x) => x.id === '2026-08')!.values
    expect(last.livretVie).toBeCloseTo(150.33, 4)
    expect(last.multiVie).toBeCloseTo(39306.06, 4)
    expect(last.cashFortuneo).toBe(16370)
    expect(last.linxea).toBeCloseTo(2491.1, 4)
    expect(last.scpi).toBe(15150)
    expect(last.total).toBeCloseTo(73467.49, 4)
    const first = r.rows.find((x) => x.id === '2024-08')!.values
    expect(first.total).toBeCloseTo(60992.04, 4)
  })
  it('Crowdlending : 25 mois, investi / solde / revenu', () => {
    const r = parsed('crowdlending', crowdlendingRaw)
    expect(r.rows).toHaveLength(25)
    const last = r.rows.find((x) => x.id === '2026-08')!.values
    expect(last.investi).toBeCloseTo(8579.92, 4)
    expect(last.soldeDispo).toBeCloseTo(28.58, 4)
    const first = r.rows.find((x) => x.id === '2024-08')!.values
    expect(first.revenuBrut).toBeCloseTo(2.84, 4)
  })
})