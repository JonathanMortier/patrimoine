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

describe('feuilles d’export fictives (layouts courants)', () => {
  it('Hors immo : 25 mois, valeurs exactes', () => {
    const r = parsed('horsImmo', horsImmoRaw)
    expect(r.rows).toHaveLength(25)
    const first = r.rows.find((x) => x.id === '2025-01')!.values
    expect(first.compteCourant).toBeCloseTo(6000, 4)
    expect(first.livrets).toBeCloseTo(22500, 4)
    expect(first.total).toBeCloseTo(71000, 4)
    const last = r.rows.find((x) => x.id === '2026-08')!.values
    expect(last.compteCourant).toBeCloseTo(9800, 4)
    expect(last.total).toBeCloseTo(84300, 4)
    expect(last.revenusGlobaux).toBeCloseTo(-1380, 4)
  })
  it('Bourse : 25 mois, total = composantes (à partir de 2026)', () => {
    const r = parsed('bourse', bourseRaw)
    expect(r.rows).toHaveLength(25)
    const m26 = r.rows.find((x) => x.id === '2026-03')!.values
    expect(m26.cto).toBeCloseTo(9750, 4)
    expect(m26.privateMk).toBeCloseTo(2900, 4)
    expect(m26.pea).toBeCloseTo(29000, 4)
    expect(m26.total).toBeCloseTo(41650, 4)
    const last = r.rows.find((x) => x.id === '2026-08')!.values
    expect(last.cto).toBeCloseTo(11000, 4)
    expect(last.total).toBeCloseTo(48400, 4)
    // Colonne E = Plus value, renseignée aussi avant 2026
    expect(r.rows.find((x) => x.id === '2025-05')!.values.plusValue).toBeCloseTo(-850, 4)
    expect(m26.plusValue).toBeCloseTo(2650, 4)
  })
  it('Crypto : 25 mois, $ convertis et colonnes par wallet', () => {
    const r = parsed('crypto', cryptoRaw)
    expect(r.rows).toHaveLength(25)
    const m = r.rows.find((x) => x.id === '2026-03')!.values
    expect(m.total).toBeCloseTo(17700, 4)
    expect(m.tradeRep).toBeCloseTo(295, 4)
    expect(m.ledger).toBeCloseTo(5900, 4)
    expect(m.hotWalletPrincipalUSD).toBe(6950)
    expect(m.hotWalletLedgerUSD).toBe(3760)
    expect(m.defiUSD).toBe(1880)
    expect(m.btc).toBeCloseTo(0.138, 5)
  })
  it('Assurance Vie : 25 mois, composants et total', () => {
    const r = parsed('assuranceVie', assuranceVieRaw)
    expect(r.rows).toHaveLength(25)
    const last = r.rows.find((x) => x.id === '2026-08')!.values
    expect(last.livretVie).toBeCloseTo(160, 4)
    expect(last.multiVie).toBeCloseTo(39600, 4)
    expect(last.cashFortuneo).toBe(16200)
    expect(last.linxea).toBeCloseTo(2480, 4)
    expect(last.scpi).toBe(15200)
    expect(last.total).toBeCloseTo(73640, 4)
    const first = r.rows.find((x) => x.id === '2024-08')!.values
    expect(first.total).toBeCloseTo(61100, 4)
  })
  it('Crowdlending : 25 mois, investi / solde / revenu', () => {
    const r = parsed('crowdlending', crowdlendingRaw)
    expect(r.rows).toHaveLength(25)
    const last = r.rows.find((x) => x.id === '2026-08')!.values
    expect(last.investi).toBeCloseTo(8600, 4)
    expect(last.soldeDispo).toBeCloseTo(740, 4)
    const first = r.rows.find((x) => x.id === '2024-08')!.values
    expect(first.revenuBrut).toBeCloseTo(3, 4)
  })
})