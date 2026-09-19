// @vitest-environment happy-dom
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mountApp, type Route } from '../../app'
import { deleteDb } from '../../db'
import { setup } from '../../crypto/security'
import { monthRepo } from '../../db/repos/months'
import { constantesRepo } from '../../db/repos/constantes'
import { currentMonthId, previousMonthId } from '../../utils/date'
import { waitFor } from '../../test/waitFor'

const PASSWORD = 'test-secret'

function tabFor(route: Route): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`.tab[data-route="${route}"]`)!
}

function view(): HTMLElement {
  return document.getElementById('view')!
}

const month = (id: string) => ({
  id,
  bourse: { cto: 1000, privateMk: 0, pea: 500, plusValue: 0 },
  assuranceVie: { livretVie: 0, multiVie: 0, cashFortuneo: 0, linxea: 0, scpi: 0 },
  crowdlending: { investi: 0, soldeDispo: 0, revenuBrut: 0, fiscalite: 0 },
  crypto: { tradeRep: 0, binance: 0, ledger: 0, hotWalletPrincipalUSD: 0, hotWalletLedgerUSD: 0, defiUSD: 0, btc: 0 },
  horsImmo: { compteCourantCa: 500, compteCourantFortuneo: 0, compteCourantTradeRep: 0, livretA: 0, ldd: 0 },
})

describe('Projection Bourse', () => {
  afterEach(() => new Promise((r) => setTimeout(r, 20)))

  beforeEach(async () => {
    await deleteDb()
    await setup(PASSWORD)
    document.body.innerHTML = '<div id="app"></div>'
    if (location.hash !== '') location.hash = ''
    mountApp(document.getElementById('app')!)
  })

  it('affiche un état vide quand aucun mois n’est enregistré', async () => {
    tabFor('projection').click()
    await waitFor(() => expect(view().textContent).toContain('Projection Bourse'))
    expect(view().textContent).toContain('Aucun mois enregistré')
    expect(view().querySelector('canvas')).toBeNull()
    expect(view().querySelector('table')).toBeNull()
  })

  it('affiche KPIs, tableaux et canevas quand des mois existent', async () => {
    await monthRepo.save(month(previousMonthId(currentMonthId())))
    await monthRepo.save(month(currentMonthId()))

    tabFor('projection').click()
    await waitFor(() => expect(view().textContent).toContain('Projection Bourse'))

    expect(view().textContent).toContain('Salaire retrait 4 %')
    expect(view().textContent).not.toContain('Aucun mois enregistré')

    expect(view().querySelectorAll('table.grid').length).toBe(2)
    expect(view().querySelectorAll('canvas').length).toBe(2)
    expect(view().querySelector('#proj-monthly')).not.toBeNull()
    expect(view().querySelector('#proj-annual')).not.toBeNull()
  })

  it('le taux et la mensualité récurrente sont retenus des constantes', async () => {
    await constantesRepo.save({
      ...(await constantesRepo.get()),
      tauxRendement: 0.05,
      mensualiteTradeRep: 700,
      mensualiteFortuneo: 600,
    })
    await monthRepo.save(month(previousMonthId(currentMonthId())))
    await monthRepo.save(month(currentMonthId()))

    tabFor('projection').click()
    await waitFor(() => expect(view().textContent).toContain('Projection Bourse'))
    const norm = view().textContent!.replace(/[\u202f\u00a0]/g, ' ')
    expect(norm).toContain('5 % + 1 300 €/mois')
  })
})