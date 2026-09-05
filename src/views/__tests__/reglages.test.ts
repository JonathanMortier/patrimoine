// @vitest-environment happy-dom
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { mountApp, type Route } from '../../app'
import { deleteDb } from '../../db'
import { setup } from '../../crypto/security'
import { constantesRepo, DEFAULT_CONSTANTES } from '../../db/repos/constantes'

const PASSWORD = 'test-secret'

function tabFor(route: Route): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`.tab[data-route="${route}"]`)!
}

function view(): HTMLElement {
  return document.getElementById('view')!
}

describe('Réglages : édition complète des constantes', () => {
  beforeEach(async () => {
    await deleteDb()
    await setup(PASSWORD)
    document.body.innerHTML = '<div id="app"></div>'
    mountApp(document.getElementById('app')!)
    tabFor('reglages').click()
  })

  it('affiche les champs de toutes les constantes', async () => {
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes'))
    for (const name of ['convUsdEur', 'plafondPea', 'btcUsd', 'btcEur', 'tauxRendement', 'mensualiteTradeRep', 'mensualiteFortuneo', 'dateOuverturePea']) {
      expect(view().querySelector<HTMLInputElement>(`[name="${name}"]`), name).not.toBeNull()
    }
  })

  it('pré-remplit depuis les constantes stockées', async () => {
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes'))
    const get = (name: string) => view().querySelector<HTMLInputElement>(`[name="${name}"]`)!.value
    expect(get('convUsdEur')).toBe('1.14')
    expect(get('plafondPea')).toBe('150000')
    expect(get('tauxRendement')).toBe('7')
    expect(get('mensualiteTradeRep')).toBe('710')
    expect(get('mensualiteFortuneo')).toBe('600')
  })

  it('enregistre les constantes modifiées', async () => {
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes'))
    const set = (name: string, value: string) => {
      const el = view().querySelector<HTMLInputElement>(`[name="${name}"]`)!
      el.value = value
    }
    set('plafondPea', '225000')
    set('btcUsd', '90000')
    set('btcEur', '83000')
    set('tauxRendement', '7.25')
    set('mensualiteTradeRep', '900')
    set('mensualiteFortuneo', '500')
    set('dateOuverturePea', '2020-01-15')

    const tauxInput = view().querySelector<HTMLInputElement>('[name="tauxRendement"]')!
    expect(tauxInput.step).toBe('any')

    view().querySelector<HTMLFormElement>('#const-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes enregistrées'))

    const saved = await constantesRepo.get()
    expect(saved.plafondPea).toBe(225000)
    expect(saved.btcUsd).toBe(90000)
    expect(saved.btcEur).toBe(83000)
    expect(saved.tauxRendement).toBeCloseTo(0.0725, 6)
    expect(saved.mensualiteTradeRep).toBe(900)
    expect(saved.mensualiteFortuneo).toBe(500)
    expect(saved.dateOuverturePea).toBe('2020-01-15')
    expect(DEFAULT_CONSTANTES.tauxRendement).toBe(0.07)
  })

  it('accepte le taux en fraction (0.07) comme un pourcentage (7)', async () => {
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes'))
    const set = (name: string, value: string) => {
      const el = view().querySelector<HTMLInputElement>(`[name="${name}"]`)!
      el.value = value
    }
    set('tauxRendement', '0.07')
    view().querySelector<HTMLFormElement>('#const-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes enregistrées'))
    expect((await constantesRepo.get()).tauxRendement).toBeCloseTo(0.07, 6)
  })

  it('conserve la conversion inchangée quand seule une autre constante change', async () => {
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes'))
    const plafond = view().querySelector<HTMLInputElement>('[name="plafondPea"]')!
    plafond.value = '120000'
    view().querySelector<HTMLFormElement>('#const-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes enregistrées'))
    const saved = await constantesRepo.get()
    expect(saved.plafondPea).toBe(120000)
    expect(saved.convUsdEur).toBeCloseTo(1.14, 6)
  })

  it('rejette une conversion invalide (0 ou négatif)', async () => {
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes'))
    const conv = view().querySelector<HTMLInputElement>('[name="convUsdEur"]')!
    conv.value = '0'
    view().querySelector<HTMLFormElement>('#const-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => expect(view().textContent).toContain('Conversion invalide'))
    expect((await constantesRepo.get()).convUsdEur).toBeCloseTo(1.14, 6)
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Réglages : bouton « Récupérer les prix en ligne »', () => {
  it('pré-remplit la conversion et les prix BTC sans les enregistrer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const data = url.includes('er-api')
          ? { result: 'success', rates: { EUR: 1, USD: 1.2 } }
          : { bitcoin: { usd: 82000, eur: 70000 } }
        return { ok: true, json: async () => data }
      }),
    )

    await deleteDb()
    await setup(PASSWORD)
    document.body.innerHTML = '<div id="app"></div>'
    mountApp(document.getElementById('app')!)
    tabFor('reglages').click()
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes'))

    const get = (name: string) => view().querySelector<HTMLInputElement>(`[name="${name}"]`)!.value
    expect(get('convUsdEur')).toBe('1.14')

    view().querySelector<HTMLButtonElement>('#fetch-market')!.click()
    await vi.waitFor(() => expect(view().textContent).toContain('Prix récupérés'))

    expect(get('convUsdEur')).toBe('1.2')
    expect(get('btcUsd')).toBe('82000')
    expect(get('btcEur')).toBe('70000')

    const saved = await constantesRepo.get()
    expect(saved.convUsdEur).toBeCloseTo(1.14, 6)
    expect(saved.btcUsd).toBe(77429)
  })

  it('permet d’enregistrer après récupération (valeur à précision décimale)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const data = url.includes('er-api')
          ? { result: 'success', rates: { EUR: 1, USD: 1.15828 } }
          : { bitcoin: { usd: 81461, eur: 70061 } }
        return { ok: true, json: async () => data }
      }),
    )

    await deleteDb()
    await setup(PASSWORD)
    document.body.innerHTML = '<div id="app"></div>'
    mountApp(document.getElementById('app')!)
    tabFor('reglages').click()
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes'))

    view().querySelector<HTMLButtonElement>('#fetch-market')!.click()
    await vi.waitFor(() => expect(view().textContent).toContain('Prix récupérés'))

    const conv = view().querySelector<HTMLInputElement>('[name="convUsdEur"]')!
    expect(conv.value).toBe('1.1583')
    expect(conv.step).toBe('any')

    view().querySelector<HTMLFormElement>('#const-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes enregistrées'))

    const saved = await constantesRepo.get()
    expect(saved.convUsdEur).toBeCloseTo(1.1583, 4)
    expect(saved.btcUsd).toBe(81461)
    expect(saved.btcEur).toBe(70061)
  })

  it('affiche une erreur quand le réseau échoue', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 0, json: async () => ({}) }) as never),
    )

    await deleteDb()
    await setup(PASSWORD)
    document.body.innerHTML = '<div id="app"></div>'
    mountApp(document.getElementById('app')!)
    tabFor('reglages').click()
    await vi.waitFor(() => expect(view().textContent).toContain('Constantes'))

    view().querySelector<HTMLButtonElement>('#fetch-market')!.click()
    await vi.waitFor(() => expect(view().textContent).toContain('Impossible de récupérer'))
  })
})
