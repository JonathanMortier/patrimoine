// @vitest-environment happy-dom
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bootstrap, renderRoot } from '../../root'
import { deleteDb } from '../../db'
import { lock, isUnlocked, setup } from '../../crypto/security'
import { AUTH_EVENT } from '../../events'

const PASSWORD = 'test-secret'
const SECOND_PASSWORD = 'nouveau-8'

function root(): HTMLElement {
  return document.getElementById('app')!
}

function submitAuth(form: HTMLFormElement): void {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function authCard(): HTMLFormElement | null {
  return root().querySelector<HTMLFormElement>('form.auth-card')
}

describe('security : bootstrap et initialisation', () => {
  afterEach(() => new Promise((r) => setTimeout(r, 20)))

  beforeEach(async () => {
    lock()
    await deleteDb()
    document.body.innerHTML = '<div id="app"></div>'
  })

  it('affiche l’écran de création quand aucun mot de passe n’existe', async () => {
    await bootstrap()
    const form = authCard()!
    expect(form).not.toBeNull()
    expect(form.textContent).toContain('Créer le mot de passe')
    expect(form.querySelector('[name="confirm"]')).not.toBeNull()
  })

  it('crée le mot de passe puis monte l\'application', async () => {
    const spy = vi.fn()
    window.addEventListener(AUTH_EVENT, spy)

    await bootstrap()
    const form = authCard()!
    ;(form.querySelector('[name="password"]') as HTMLInputElement).value = SECOND_PASSWORD
    ;(form.querySelector('[name="confirm"]') as HTMLInputElement).value = SECOND_PASSWORD
    submitAuth(form)

    await vi.waitFor(() => expect(isUnlocked()).toBe(true))
    expect(spy).toHaveBeenCalled()
    await vi.waitFor(() => expect(document.getElementById('view')).not.toBeNull())
    expect(document.querySelector('.tabbar .tab')).not.toBeNull()
  })

  it('rejette les confirmations non concordantes', async () => {
    await bootstrap()
    const form = authCard()!
    ;(form.querySelector('[name="password"]') as HTMLInputElement).value = SECOND_PASSWORD
    ;(form.querySelector('[name="confirm"]') as HTMLInputElement).value = 'mismatch'
    submitAuth(form)

    await vi.waitFor(() => expect(form.textContent).toContain('ne correspondent pas'))
    expect(isUnlocked()).toBe(false)
  })
})

describe('security : écran de verrouillage', () => {
  afterEach(() => new Promise((r) => setTimeout(r, 20)))

  beforeEach(async () => {
    lock()
    await deleteDb()
    await setup(PASSWORD)
    lock()
    document.body.innerHTML = '<div id="app"></div>'
  })

  it('mot de passe correct : déverrouille et mounte l\'app', async () => {
    const spy = vi.fn()
    window.addEventListener(AUTH_EVENT, spy)

    await bootstrap()
    const form = authCard()!
    expect(form.textContent).toContain('Déverrouiller')
    ;(form.querySelector('[name="password"]') as HTMLInputElement).value = PASSWORD
    submitAuth(form)

    await vi.waitFor(() => expect(isUnlocked()).toBe(true))
    expect(spy).toHaveBeenCalled()
    await vi.waitFor(() => expect(document.getElementById('view')).not.toBeNull())
    expect(document.querySelector('.tabbar .tab')).not.toBeNull()
  })

  it('mot de passe incorrect : affiche l\'erreur puis déverrouille avec le bon', async () => {
    await bootstrap()
    const form = authCard()!
    ;(form.querySelector('[name="password"]') as HTMLInputElement).value = 'mauvais'
    submitAuth(form)

    await vi.waitFor(() => expect(form.textContent).toContain('Mot de passe incorrect'))
    expect(isUnlocked()).toBe(false)
    expect((form.querySelector('[name="password"]') as HTMLInputElement).value).toBe('')

    ;(form.querySelector('[name="password"]') as HTMLInputElement).value = PASSWORD
    submitAuth(form)

    await vi.waitFor(() => expect(isUnlocked()).toBe(true))
    await vi.waitFor(() => expect(document.getElementById('view')).not.toBeNull())
    expect(document.querySelector('.tabbar .tab')).not.toBeNull()
  })
})

describe('security : renderRoot selon l\'état', () => {
  afterEach(() => new Promise((r) => setTimeout(r, 20)))

  beforeEach(async () => {
    lock()
    await deleteDb()
    document.body.innerHTML = '<div id="app"></div>'
  })

  it('état uninitialized → écran de création', async () => {
    await renderRoot()
    expect(authCard()!.textContent).toContain('Créer le mot de passe')
  })

  it('état locked → écran de déverrouillage', async () => {
    await setup(PASSWORD)
    lock()
    await renderRoot()
    expect(authCard()!.textContent).toContain('Déverrouiller')
  })

  it('état unlocked → application montée', async () => {
    await setup(PASSWORD)
    await renderRoot()
    await vi.waitFor(() => expect(document.getElementById('view')).not.toBeNull())
    expect(document.querySelector('.tabbar .tab')).not.toBeNull()
  })
})