// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  DRIVE_BACKUP_NAME,
  findBackupFile,
  uploadBackupFile,
  downloadBackupFile,
  getAccessToken,
  loadGis,
} from '../drive'

beforeEach(() => {
  vi.unstubAllGlobals()
  delete (window as { google?: unknown }).google
})

describe('drive : token GIS', () => {
  it('obtient un token via initTokenClient', async () => {
    let requested: unknown = null
    ;(window as unknown as { google: unknown }).google = {
      accounts: {
        oauth2: {
          initTokenClient: (config: { callback: (r: { access_token?: string }) => void }) => {
            config.callback({ access_token: 'tok123' })
            return { requestAccessToken: () => { requested = true } }
          },
        },
      },
    }
    const token = await getAccessToken('client-id')
    expect(token).toBe('tok123')
    expect(requested).toBe(true)
  })

  it('rejette en l’absence de GIS', async () => {
    await expect(getAccessToken('client-id')).rejects.toThrow()
  })
})

describe('drive : API fichiers', () => {
  it('trouve le fichier de sauvegarde', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      expect(String(url)).toContain('name%20%3D%20')
      return { ok: true, json: async () => ({ files: [{ id: 'FILE1', name: DRIVE_BACKUP_NAME }] }) }
    }))
    const ref = await findBackupFile('tok')
    expect(ref?.id).toBe('FILE1')
  })

  it('upload en mode création (POST multipart) puis mise à jour (PATCH)', async () => {
    const calls: { method?: string; url: string; body?: string }[] = []
    const files: { id?: string }[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ method: String(init?.method ?? 'GET'), url: String(url), body: String(init?.body) })
      if (String(url).startsWith('https://www.googleapis.com/upload')) {
        if (String(init?.method) === 'PATCH') return { ok: true, json: async () => ({ id: 'FILE1' }) }
        const id = 'FILE1'
        files.push({ id })
        return { ok: true, json: async () => ({ id }) }
      }
      return { ok: true, json: async () => ({ files }) }
    }))
    await uploadBackupFile('tok', '{"a":1}', DRIVE_BACKUP_NAME)
    const created = calls.find((c) => c.url.startsWith('https://www.googleapis.com/upload'))
    expect(created?.method).toBe('POST')
    expect(created?.body).toContain('patrimoine_boundary')
    expect(created?.body).toContain('application/json')
    expect(created?.body).toContain('{"a":1}')

    calls.length = 0
    await uploadBackupFile('tok', '{"b":2}', DRIVE_BACKUP_NAME)
    const updated = calls.find((c) => c.url.startsWith('https://www.googleapis.com/upload'))
    expect(updated?.method).toBe('PATCH')
    expect(updated?.url).toContain('FILE1')
    expect(updated?.body).toContain('{"b":2}')
  })

  it('télécharge le contenu du fichier', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('alt=media')) return { ok: true, text: async () => 'CONTENT' }
      return { ok: true, json: async () => ({ files: [{ id: 'FILE1' }] }) }
    }))
    expect(await downloadBackupFile('tok', { id: 'FILE1' })).toBe('CONTENT')
  })
})

describe('drive : script GIS', () => {
  it('résout quand GIS est déjà présent', async () => {
    ;(window as unknown as { google: unknown }).google = {
      accounts: { oauth2: { initTokenClient: () => ({ requestAccessToken: () => {} }) } },
    }
    await expect(loadGis()).resolves.toBeUndefined()
  })
})