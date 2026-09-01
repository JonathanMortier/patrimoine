// @vitest-environment happy-dom
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountApp, type Route } from '../../app'
import { deleteDb } from '../../db'
import { monthRepo } from '../../db/repos/months'
import { setup } from '../../crypto/security'
import { compareMonthIds, currentMonthId } from '../../utils/date'

const PASSWORD = 'test-secret'

function tabFor(route: Route): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`.tab[data-route="${route}"]`)!
}

function view(): HTMLElement {
  return document.getElementById('view')!
}

describe('navigation avec mois déjà enregistrés', () => {
  beforeEach(async () => {
    await deleteDb()
    await setup(PASSWORD)
    const ids = ['2026-11', currentMonthId()]
    ids.sort(compareMonthIds)
    for (const id of ids) {
      await monthRepo.save({
        id,
        bourse: { cto: 1000, privateMk: 0, pea: 500, plusValue: 0 },
        assuranceVie: { livretVie: 0, multiVie: 0, cashFortuneo: 0, linxea: 0, scpi: 0 },
        crowdlending: { investi: 0, soldeDispo: 0, revenuBrut: 0, fiscalite: 0 },
        crypto: { tradeRep: 0, binance: 0, ledger: 0, hotWalletPrincipalUSD: 0, hotWalletLedgerUSD: 0, defiUSD: 0, btc: 0 },
        horsImmo: { compteCourantCa: 500, compteCourantFortuneo: 0, compteCourantTradeRep: 0, livretA: 0, ldd: 0 },
      })
    }
    document.body.innerHTML = '<div id="app"></div>'
    mountApp(document.getElementById('app')!)
  })

  it('l’assistant propose le mois suivant le dernier enregistré', async () => {
    tabFor('saisie').click()
    await vi.waitFor(() => expect(view().textContent).toContain('Assistant'))
    const select = view().querySelector<HTMLSelectElement>('#m-target')!
    const selected = select.querySelector<HTMLOptionElement>('option[selected]')?.value
    const options = Array.from(select.options).map((o) => o.value)
    expect(selected).toBe('2026-12')
    expect(options).toContain(currentMonthId())
    expect(options).toContain('2026-11')
  })

  it('les totaux du mois précédent apparaissent dans les étapes', async () => {
    tabFor('saisie').click()
    await vi.waitFor(() => expect(view().textContent).toContain('Assistant'))
    const norm = view().textContent!.replace(/[\u202f\u00a0]/g, ' ')
    expect(norm).toContain('vs 1 500 € (▼ 1 500 €)')
    expect(norm).toContain('vs 500 € (▼ 500 €)')
  })
})