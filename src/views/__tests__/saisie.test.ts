// @vitest-environment happy-dom
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountApp, type Route } from '../../app'
import { deleteDb } from '../../db'
import { setup } from '../../crypto/security'
import { monthRepo } from '../../db/repos/months'
import { compareMonthIds, currentMonthId, formatMonthLabel, nextAfterIds, previousMonthId } from '../../utils/date'

const PASSWORD = 'test-secret'

function tabFor(route: Route): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`.tab[data-route="${route}"]`)!
}

function view(): HTMLElement {
  return document.getElementById('view')!
}

function monthTitle(): string {
  return view().querySelector<HTMLElement>('.month-title')!.textContent!
}

function navButton(id: string): HTMLButtonElement {
  return view().querySelector<HTMLButtonElement>(`#${id}`)!
}

function selectOptions(): string[] {
  return Array.from(view().querySelector<HTMLSelectElement>('#m-target')!.options).map((o) => o.value)
}

const month = (id: string) => ({
  id,
  bourse: { cto: 1000, privateMk: 0, pea: 500, plusValue: 0 },
  assuranceVie: { livretVie: 0, multiVie: 0, cashFortuneo: 0, linxea: 0, scpi: 0 },
  crowdlending: { investi: 0, soldeDispo: 0, revenuBrut: 0, fiscalite: 0 },
  crypto: { tradeRep: 0, binance: 0, ledger: 0, hotWalletPrincipalUSD: 0, hotWalletLedgerUSD: 0, defiUSD: 0, btc: 0 },
  horsImmo: { compteCourantCa: 500, compteCourantFortuneo: 0, compteCourantTradeRep: 0, livretA: 0, ldd: 0 },
})

describe('Saisie : navigation prev/next et sélection du mois', () => {
  afterEach(() => new Promise((r) => setTimeout(r, 20)))

  beforeEach(async () => {
    await deleteDb()
    await setup(PASSWORD)
    const prev = previousMonthId(currentMonthId())
    const ids = [prev, currentMonthId()].sort(compareMonthIds)
    for (const id of ids) await monthRepo.save(month(id))
    document.body.innerHTML = '<div id="app"></div>'
    if (location.hash !== '') location.hash = ''
    mountApp(document.getElementById('app')!)
  })

  it('propose le mois suivant le dernier enregistré', async () => {
    tabFor('saisie').click()
    await vi.waitFor(() => expect(view().textContent).toContain('Assistant'))
    const expected = nextAfterIds([previousMonthId(currentMonthId()), currentMonthId()])
    const select = view().querySelector<HTMLSelectElement>('#m-target')!
    expect(select.querySelector<HTMLOptionElement>('option[selected]')?.value).toBe(expected)
    expect(monthTitle()).toContain(formatMonthLabel(expected))
  })

  it('prev / next naviguent avec clamping aux bornes', async () => {
    tabFor('saisie').click()
    await vi.waitFor(() => expect(view().textContent).toContain('Assistant'))
    const opts = selectOptions()
    const cur = currentMonthId()
    const prev = previousMonthId(cur)
    const next = nextAfterIds([prev, cur])
    expect(opts).toEqual([prev, cur, next])
    expect(monthTitle()).toContain(formatMonthLabel(next))

    navButton('m-prev').click()
    await vi.waitFor(() => expect(monthTitle()).toContain(formatMonthLabel(cur)))

    navButton('m-prev').click()
    await vi.waitFor(() => expect(monthTitle()).toContain(formatMonthLabel(prev)))

    navButton('m-prev').click()
    await vi.waitFor(() => expect(monthTitle()).toContain(formatMonthLabel(prev)))

    navButton('m-next').click()
    await vi.waitFor(() => expect(monthTitle()).toContain(formatMonthLabel(cur)))

    navButton('m-next').click()
    await vi.waitFor(() => expect(monthTitle()).toContain(formatMonthLabel(next)))

    navButton('m-next').click()
    await vi.waitFor(() => expect(monthTitle()).toContain(formatMonthLabel(next)))
  })

  it('le sélecteur #m-target change le mois affiché', async () => {
    tabFor('saisie').click()
    await vi.waitFor(() => expect(view().textContent).toContain('Assistant'))
    const prev = previousMonthId(currentMonthId())
    const select = view().querySelector<HTMLSelectElement>('#m-target')!
    select.value = prev
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await vi.waitFor(() => expect(monthTitle()).toContain(formatMonthLabel(prev)))
    expect(view().querySelector<HTMLButtonElement>('#save')!.textContent).toContain(formatMonthLabel(prev))
  })
})

describe('Saisie : suppression d’un mois', () => {
  afterEach(() => new Promise((r) => setTimeout(r, 20)))

  beforeEach(async () => {
    await deleteDb()
    await setup(PASSWORD)
    const prev = previousMonthId(currentMonthId())
    for (const id of [prev, currentMonthId()]) await monthRepo.save(month(id))
    document.body.innerHTML = '<div id="app"></div>'
    if (location.hash !== '') location.hash = ''
    mountApp(document.getElementById('app')!)
    tabFor('saisie').click()
    await vi.waitFor(() => expect(view().textContent).toContain('Assistant'))
  })

  it('annuler ferme la modale sans supprimer', async () => {
    const select = view().querySelector<HTMLSelectElement>('#m-target')!
    select.value = currentMonthId()
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await vi.waitFor(() => expect(view().querySelector('#delete')).not.toBeNull())

    const modal = view().querySelector<HTMLElement>('#del-modal')!
    expect(modal.hidden).toBe(true)
    view().querySelector<HTMLButtonElement>('#delete')!.click()
    expect(modal.hidden).toBe(false)

    view().querySelector<HTMLButtonElement>('#del-cancel')!.click()
    expect(modal.hidden).toBe(true)
    expect(await monthRepo.get(currentMonthId())).toBeDefined()
  })

  it('confirmer supprime le mois et re-rend vers un mois inexistant', async () => {
    const cur = currentMonthId()
    const select = view().querySelector<HTMLSelectElement>('#m-target')!
    select.value = cur
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await vi.waitFor(() => expect(view().querySelector('#delete')).not.toBeNull())

    view().querySelector<HTMLButtonElement>('#delete')!.click()
    view().querySelector<HTMLButtonElement>('#del-confirm')!.click()

    await vi.waitFor(async () => expect(await monthRepo.get(cur)).toBeUndefined())
    await vi.waitFor(() => {
      expect(view().querySelector<HTMLElement>('#del-modal')!.hidden).toBe(true)
      expect(view().querySelector('#delete')).toBeNull()
    })
    expect(view().textContent).toContain('supprimé')
  })
})