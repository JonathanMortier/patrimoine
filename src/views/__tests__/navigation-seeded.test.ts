// @vitest-environment happy-dom
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mountApp, type Route } from '../../app'
import { deleteDb } from '../../db'
import { monthRepo } from '../../db/repos/months'
import { creditsRepo } from '../../db/repos/credits'
import { setup } from '../../crypto/security'
import { compareMonthIds, currentMonthId, nextAfterIds, previousMonthId } from '../../utils/date'
import { waitFor } from '../../test/waitFor'

const PASSWORD = 'test-secret'

function tabFor(route: Route): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`.tab[data-route="${route}"]`)!
}

function view(): HTMLElement {
  return document.getElementById('view')!
}

describe('navigation avec mois déjà enregistrés', () => {
  // Laisse terminer les handlers async (#save → save → re-render) avant le
  // deleteDb() du beforeEach suivant, sinon fake-indexeddb reste bloqué.
  afterEach(() => new Promise((r) => setTimeout(r, 20)))

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
    if (location.hash !== '') location.hash = ''
    mountApp(document.getElementById('app')!)
  })

  it('l’assistant propose le mois suivant le dernier enregistré', async () => {
    tabFor('saisie').click()
    await waitFor(() => expect(view().textContent).toContain('Assistant'))
    const select = view().querySelector<HTMLSelectElement>('#m-target')!
    const selected = select.querySelector<HTMLOptionElement>('option[selected]')?.value
    const options = Array.from(select.options).map((o) => o.value)
    expect(selected).toBe('2026-12')
    expect(options).toContain(currentMonthId())
    expect(options).toContain('2026-11')
  })

  it('les totaux du mois précédent apparaissent dans les étapes', async () => {
    tabFor('saisie').click()
    await waitFor(() => expect(view().textContent).toContain('Assistant'))
    const norm = view().textContent!.replace(/[\u202f\u00a0]/g, ' ')
    expect(norm).toContain('vs 1 500 € (▼ 1 500 €)')
    expect(norm).toContain('vs 500 € (▼ 500 €)')
  })

  it('le dashboard affiche KPIs, remplissage PEA et tableau fallback', async () => {
    await monthRepo.save({
      ...((await monthRepo.get(currentMonthId()))!),
      bourse: { cto: 10000, privateMk: 0, pea: 5000, plusValue: 0 },
    })
    tabFor('dashboard').click()
    await waitFor(() => expect(view().textContent).toContain('Répartition'))
    expect(location.hash).toBe('#/dashboard')
    expect(view().textContent).toContain('Remplissage PEA')
    expect(view().querySelector('table.grid')).not.toBeNull()
    expect(view().querySelectorAll('canvas').length).toBe(2)
  })

  it('le dashboard affiche brut / net / parts BTC depuis les crédits', async () => {
    await creditsRepo.save({
      id: 'n1', nom: 'Nardouzans', numero: 1, dateDepart: '2023-01-01', dateFin: '2033-01-01',
      taux: 0.015, mensualite: 850, montant: 200000, restant: 120000, pctRembourse: 40,
    })
    tabFor('dashboard').click()
    await waitFor(() => expect(view().textContent).toContain('Brut'))
    expect(view().textContent).toContain('Part BTC (hors immo)')
    expect(view().textContent).toContain('Part BTC (brut')
    expect(view().textContent).toContain('Part BTC (net')
  })

  it('l’écran Crédits immo reproduit le tableau (Total) en lecture seule', async () => {
    const loan = {
      id: 'n1', nom: 'Nardouzans', numero: 1353608, dateDepart: '2020-10-05', dateFin: '2027-10-04',
      taux: 0.006, mensualite: 667.48, montant: 54894, restant: 5992.61, pctRembourse: 40,
    }
    await creditsRepo.save(loan)
    tabFor('credits').click()
    await waitFor(() => expect(view().textContent).toContain('Crédits immo'))
    expect(view().textContent).toContain('Nardouzans')
    expect(view().textContent).toContain('Sous-total')
    expect(view().textContent).toContain('Total')
    expect(view().querySelector('input.restant-val')).toBeNull()
    expect(view().querySelector('#credits-save')).toBeNull()
    expect(view().textContent).toContain('Saisie')
  })

  it('les attributs du tableau Crédits sont masquables via les chips', async () => {
    const loan = {
      id: 'n1', nom: 'Nardouzans', numero: 1353608, dateDepart: '2020-10-05', dateFin: '2027-10-04',
      taux: 0.006, mensualite: 667.48, montant: 54894, restant: 5992.61, pctRembourse: 40,
    }
    await creditsRepo.save(loan)
    tabFor('credits').click()
    await waitFor(() => expect(view().textContent).toContain('Crédits immo'))

    const departTh = view().querySelector<HTMLTableHeaderCellElement>('thead th[data-attr="depart"]')!
    expect(departTh.classList.contains('hidden')).toBe(false)
    expect(view().querySelectorAll<HTMLElement>('td[data-attr="depart"]').length).toBeGreaterThan(0)

    const chip = view().querySelector<HTMLInputElement>('.chip input[data-attr="depart"]')!
    expect(chip.checked).toBe(true)
    chip.click()

    expect(view().querySelector('thead th[data-attr="depart"]')!.classList.contains('hidden')).toBe(true)
    const departCells = view().querySelectorAll<HTMLElement>('td[data-attr="depart"]')
    for (const cell of departCells) expect(cell.classList.contains('hidden')).toBe(true)
    expect(view().querySelector('thead th[data-attr="restant"]')!.classList.contains('hidden')).toBe(false)
    expect(view().querySelector<HTMLInputElement>('.chip input[data-attr="restant"]')).toBeNull()
  })

  it('saisit le crédit restant dans Saisie et le sauvegarde mois par mois', async () => {
    await creditsRepo.save({
      id: 'n1', nom: 'Nardouzans', numero: 1353608, dateDepart: '2020-10-05', dateFin: '2027-10-04',
      taux: 0.006, mensualite: 667.48, montant: 54894, restant: 5992.61, pctRembourse: 40,
    })
    const target = nextAfterIds(['2026-09', '2026-11'])
    expect(target).toBe('2026-12')
    tabFor('saisie').click()
    await waitFor(() => expect(view().textContent).toContain('Crédit restant'))
    const select = view().querySelector<HTMLSelectElement>('#m-target')!
    expect(Array.from(select.options).map((o) => o.value)).toContain(target)
    const input = view().querySelector<HTMLInputElement>('input[data-credit-key="Nardouzans-1353608"]')!
    expect(input.value).toBe('5992.61')
    input.value = '5800'
    view().querySelector<HTMLButtonElement>('#save')!.click()
    await waitFor(async () => {
      const m = await monthRepo.get(target)
      expect(m?.creditsRestant?.['Nardouzans-1353608']).toBe(5800)
    })
    await waitFor(() => {
      expect(Array.from(view().querySelector<HTMLSelectElement>('#m-target')!.options).map((o) => o.value)).toContain('2027-01')
    })
  })

  it('le dashboard calcule Net à partir du restant mensuel saisi', async () => {
    await creditsRepo.save({
      id: 'n1', nom: 'Nardouzans', numero: 1353608, dateDepart: '2020-10-05', dateFin: '2027-10-04',
      taux: 0.006, mensualite: 667.48, montant: 100000, restant: 99999, pctRembourse: 1,
    })
    // Le dashboard affiche le mois courant en priorité : on limite l'historique
    // au seul mois précédent pour que la saisie cible le mois courant.
    for (const id of await monthRepo.ids()) await monthRepo.remove(id)
    const lastId = previousMonthId(currentMonthId())
    await monthRepo.save({
      id: lastId,
      bourse: { cto: 1000, privateMk: 0, pea: 500, plusValue: 0 },
      assuranceVie: { livretVie: 0, multiVie: 0, cashFortuneo: 0, linxea: 0, scpi: 0 },
      crowdlending: { investi: 0, soldeDispo: 0, revenuBrut: 0, fiscalite: 0 },
      crypto: { tradeRep: 0, binance: 0, ledger: 0, hotWalletPrincipalUSD: 0, hotWalletLedgerUSD: 0, defiUSD: 0, btc: 0 },
      horsImmo: { compteCourantCa: 500, compteCourantFortuneo: 0, compteCourantTradeRep: 0, livretA: 0, ldd: 0 },
    })
    const target = nextAfterIds([lastId])
    expect(target).toBe(currentMonthId())
    tabFor('saisie').click()
    await waitFor(() => expect(view().textContent).toContain('Crédit restant'))
    const select = view().querySelector<HTMLSelectElement>('#m-target')!
    expect(Array.from(select.options).map((o) => o.value)).toContain(target)
    const input = view().querySelector<HTMLInputElement>('input[data-credit-key="Nardouzans-1353608"]')!
    input.value = '20000'
    view().querySelector<HTMLButtonElement>('#save')!.click()
    await waitFor(async () => {
      expect((await monthRepo.get(target))?.creditsRestant?.['Nardouzans-1353608']).toBe(20000)
    })
    tabFor('dashboard').click()
    await waitFor(() => expect(view().textContent).toContain('− dettes'))
    const norm = view().textContent!.replace(/[\u202f\u00a0]/g, ' ')
    expect(norm).toContain('− dettes 20 000 €')
  })
})