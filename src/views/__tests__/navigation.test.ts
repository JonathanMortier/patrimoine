// @vitest-environment happy-dom
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountApp, ROUTES, type Route } from '../../app'
import { deleteDb } from '../../db'
import { monthRepo } from '../../db/repos/months'
import { setup, lock } from '../../crypto/security'
import { currentMonthId } from '../../utils/date'

const PASSWORD = 'test-secret'

function tabFor(route: Route): HTMLButtonElement {
  const tab = document.querySelector<HTMLButtonElement>(`.tab[data-route="${route}"]`)
  if (!tab) throw new Error(`tab ${route} introuvable`)
  return tab
}

function view(): HTMLElement {
  const v = document.getElementById('view')
  if (!v) throw new Error('#view introuvable')
  return v
}

async function waitContent(pattern: string): Promise<void> {
  await vi.waitFor(() => expect(view().textContent).toContain(pattern))
}

describe('navigation par onglets', () => {
  beforeEach(async () => {
    await deleteDb()
    await setup(PASSWORD)
    document.body.innerHTML = '<div id="app"></div>'
    mountApp(document.getElementById('app')!)
  })

  it('affiche le dashboard au démarrage', async () => {
    expect(location.hash).toBe('')
    await waitContent('Aucun mois enregistré')
  })

  it('reconnaît la route active dans la barre du bas', () => {
    expect(tabFor('dashboard').classList.contains('active')).toBe(true)
    expect(tabFor('saisie').classList.contains('active')).toBe(false)
  })

  it('navigue vers Saisie et rend l’assistant (mois proposé = mois courant)', async () => {
    tabFor('saisie').click()
    await waitContent('Assistant')
    expect(location.hash).toBe('#/saisie')
    expect(view().textContent).toContain('Totaux')
    expect(tabFor('saisie').classList.contains('active')).toBe(true)
    expect(tabFor('dashboard').classList.contains('active')).toBe(false)
  })

  it('navigue vers Saisie et rend l’historique par domaine', async () => {
    tabFor('saisie').click()
    await waitContent('Historique')
    expect(view().querySelectorAll('.seg').length).toBe(6)
    expect(view().textContent).toContain('Aucun mois enregistré')
  })

  it('revient vers le dashboard', async () => {
    tabFor('saisie').click()
    await waitContent('Assistant')
    tabFor('dashboard').click()
    await waitContent('Aucun mois enregistré')
  })

  it('affiche un message d’erreur clair quand l’écran ne peut pas s’afficher (session verrouillée)', async () => {
    await monthRepo.save({
      id: currentMonthId(),
      bourse: { cto: 0, privateMk: 0, pea: 0, plusValue: 0 },
      assuranceVie: { livretVie: 0, multiVie: 0, cashFortuneo: 0, linxea: 0, scpi: 0 },
      crowdlending: { investi: 0, soldeDispo: 0, revenuBrut: 0, fiscalite: 0 },
      crypto: { tradeRep: 0, binance: 0, ledger: 0, hotWalletPrincipalUSD: 0, hotWalletLedgerUSD: 0, defiUSD: 0, btc: 0 },
      horsImmo: { compteCourantCa: 0, compteCourantFortuneo: 0, compteCourantTradeRep: 0, livretA: 0, ldd: 0 },
    })
    lock()
    tabFor('saisie').click()
    await waitContent('verrouill')
    expect(view().querySelector('#err-retry')).not.toBeNull()
  })
})

it('declare tous les onglets utilisés par le menu', () => {
  expect(ROUTES.map((r) => r.id)).toEqual([
    'dashboard',
    'saisie',
    'import',
    'credits',
    'projection',
    'reglages',
  ])
})