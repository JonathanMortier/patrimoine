// @vitest-environment happy-dom
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountApp } from '../../app'
import { deleteDb } from '../../db'
import { setup } from '../../crypto/security'
import { collectBackupData, createBackupJson } from '../../backup/backup'
import { monthRepo, newMonth } from '../../db/repos/months'
import { constantesRepo, DEFAULT_CONSTANTES } from '../../db/repos/constantes'
import { waitFor } from '../../test/waitFor'

const PASSWORD = 'mot-de-passe-test'
const IMPORT_PW = 'mot-de-passe-import'
const ITER = 2_000

afterEach(() => new Promise((r) => setTimeout(r, 20)))

function view(): HTMLElement {
  return document.getElementById('view')!
}

function bkMsg(): HTMLElement {
  return view().querySelector<HTMLElement>('#bk-msg')!
}

function modal(): HTMLElement {
  return view().querySelector<HTMLElement>('#bk-pw-modal')!
}

function submitPassword(pw: string): void {
  view().querySelector<HTMLInputElement>('#bk-pw-input')!.value = pw
  view().querySelector<HTMLFormElement>('#bk-pw-form')!.dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  )
}

async function seedMonth(): Promise<void> {
  await monthRepo.save(newMonth('2026-06'))
}

describe("Écran d'import : export / import de fichier chiffré et Drive", () => {
  beforeEach(async () => {
    await deleteDb()
    await setup(PASSWORD)
    await constantesRepo.save({ ...DEFAULT_CONSTANTES, googleClientId: 'test.apps.googleusercontent.com' })
    window.confirm = vi.fn(() => true)
    document.body.innerHTML = '<div id="app"></div>'
    location.hash = '#/import'
    mountApp(document.getElementById('app')!)
  })

  it('annule l’ouverture du modal sans rien exporter', () => {
    view().querySelector<HTMLButtonElement>('#bk-export')!.click()
    expect(modal().hidden).toBe(false)
    modal().querySelector<HTMLButtonElement>('#bk-pw-cancel')!.click()
    expect(modal().hidden).toBe(true)
    expect(bkMsg().textContent).toBe('')
  })

  it('exporte un fichier chiffré après saisie du mot de passe', async () => {
    await seedMonth()
    const urlSpy = vi.fn(() => 'blob:mock')
    Object.defineProperty(URL, 'createObjectURL', { value: urlSpy, configurable: true, writable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true, writable: true })

    view().querySelector<HTMLButtonElement>('#bk-export')!.click()
    submitPassword(IMPORT_PW)

    await waitFor(() => expect(bkMsg().textContent).toContain('Sauvegarde exportée au format .json chiffré'))
    expect(urlSpy).toHaveBeenCalled()
    expect(modal().hidden).toBe(true)
  })

  it('importe un fichier chiffré et restaure les données', async () => {
    await seedMonth()
    const backupJson = await createBackupJson(await collectBackupData(), IMPORT_PW, ITER)

    const file = new File([backupJson], 'patrimoine-backup.json', { type: 'application/json' })
    const fileInput = view().querySelector<HTMLInputElement>('#bk-file')!
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })

    await monthRepo.remove('2026-06')
    fileInput.dispatchEvent(new Event('change', { bubbles: true }))
    await waitFor(() => expect(modal().hidden).toBe(false))
    submitPassword(IMPORT_PW)

    await waitFor(async () => expect(await monthRepo.get('2026-06')).toBeDefined())
  })

  it('importe sans confirmer : ne touche pas aux données', async () => {
    await seedMonth()
    window.confirm = vi.fn(() => false)
    const backupJson = await createBackupJson(await collectBackupData(), IMPORT_PW, ITER)

    const file = new File([backupJson], 'patrimoine-backup.json', { type: 'application/json' })
    const fileInput = view().querySelector<HTMLInputElement>('#bk-file')!
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })

    fileInput.dispatchEvent(new Event('change', { bubbles: true }))
    await waitFor(() => expect(modal().hidden).toBe(false))
    submitPassword(IMPORT_PW)

    await new Promise((r) => setTimeout(r, 30))
    expect(await monthRepo.get('2026-06')).toBeDefined()
  })

  it('vide tous les mois après double confirmation', async () => {
    await seedMonth()
    view().querySelector<HTMLButtonElement>('#reset')!.click()
    await waitFor(async () => expect(await monthRepo.get('2026-06')).toBeUndefined())
  })

  it('ne vide rien quand la première confirmation est refusée', async () => {
    await seedMonth()
    window.confirm = vi.fn(() => false)
    view().querySelector<HTMLButtonElement>('#reset')!.click()
    expect(await monthRepo.get('2026-06')).toBeDefined()
  })

  it('sauvegarde sur Drive via le modal (token GIS + upload)', async () => {
    await seedMonth()
    const token = 'gis-token-123'
    Object.defineProperty(window, 'google', {
      value: {
        accounts: {
          oauth2: {
            initTokenClient: (config: { callback: (resp: { access_token: string }) => void }) => ({
              requestAccessToken: () => {
                config.callback({ access_token: token })
              },
            }),
          },
        },
      },
      configurable: true,
      writable: true,
    })
    const fetchMock = vi.fn((url: RequestInfo | URL): Promise<Response> => {
      const u = String(url)
      if (u.includes('/drive/v3/files?q=')) {
        return Promise.resolve(
          new Response(JSON.stringify({ files: [{ id: 'mock-file-id' }] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      if (u.includes('/drive/v3/files/mock-file-id')) {
        return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      return Promise.resolve(
        new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    view().querySelector<HTMLButtonElement>('#bk-drive-push')!.click()
    await waitFor(() => expect(modal().hidden).toBe(false))
    submitPassword(PASSWORD)

    await waitFor(() => {
      const calls = fetchMock.mock.calls.map((c) => String(c[0]))
      expect(calls.some((u) => u.includes('/drive/v3/files?q='))).toBe(true)
      expect(calls.some((u) => u.includes('uploadType=multipart'))).toBe(true)
    })
  })

  it('restaure depuis Drive (token GIS + téléchargement + confirmation)', async () => {
    await seedMonth()
    const token = 'gis-token-456'
    Object.defineProperty(window, 'google', {
      value: {
        accounts: {
          oauth2: {
            initTokenClient: (config: { callback: (resp: { access_token: string }) => void }) => ({
              requestAccessToken: () => {
                config.callback({ access_token: token })
              },
            }),
          },
        },
      },
      configurable: true,
      writable: true,
    })
    const backupJson = await createBackupJson(await collectBackupData(), IMPORT_PW, ITER)
    await monthRepo.remove('2026-06')

    const fetchMock = vi.fn((url: RequestInfo | URL): Promise<Response> => {
      const u = String(url)
      if (u.includes('/drive/v3/files?q=')) {
        return Promise.resolve(
          new Response(JSON.stringify({ files: [{ id: 'mock-file-id' }] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      if (u.includes('alt=media')) {
        return Promise.resolve(
          new Response(backupJson, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      return Promise.resolve(
        new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    view().querySelector<HTMLButtonElement>('#bk-drive-pull')!.click()
    await waitFor(() => expect(modal().hidden).toBe(false))
    submitPassword(IMPORT_PW)

    await waitFor(async () => expect(await monthRepo.get('2026-06')).toBeDefined())
  })
})