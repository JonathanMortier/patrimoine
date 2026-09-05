import { BACKUP_FILE_PREFIX } from '../backup/backup'

export class DriveError extends Error {}

export const DRIVE_BACKUP_NAME = `${BACKUP_FILE_PREFIX}-current.json`

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void
            error_callback?: (error: { message: string }) => void
          }) => { requestAccessToken: (options?: { prompt?: string }) => void }
        }
      }
    }
  }
}

let gisPromise: Promise<void> | null = null

export function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2?.initTokenClient) return Promise.resolve()
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new DriveError('Impossible de charger Google Identity Services.'))
    script.src = GIS_SRC
    try {
      document.head.appendChild(script)
    } catch {
      reject(new DriveError('Impossible de charger Google Identity Services.'))
    }
  })
  return gisPromise
}

/** Obtient un jeton d'accès via Google Identity Services (popup OAuth). */
export async function getAccessToken(clientId: string): Promise<string> {
  await loadGis()
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2?.initTokenClient) throw new DriveError('Google Identity Services indisponible.')
  return new Promise((resolve, reject) => {
    try {
      oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        error_callback: (error) => reject(new DriveError(error.message || 'Autorisation Google refusée.')),
        callback: (response) => {
          if (response.access_token) resolve(response.access_token)
          else reject(new DriveError(response.error_description || response.error || 'Autorisation Google refusée.'))
        },
      }).requestAccessToken()
    } catch (err) {
      reject(err instanceof Error ? err : new DriveError('Impossible de lancer l’autorisation Google.'))
    }
  })
}

async function call(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    throw new DriveError(`Échec de l’appel Google Drive (${res.status}).`)
  }
  return res
}

export interface DriveFileRef {
  id: string
  name?: string
}

export async function findBackupFile(token: string, name = DRIVE_BACKUP_NAME): Promise<DriveFileRef | undefined> {
  const q = encodeURIComponent(`name = '${name}' and trashed = false`)
  const res = await call(token, `${FILES_URL}?q=${q}&fields=files(id,name)&spaces=drive`)
  const data = (await res.json()) as { files?: DriveFileRef[] }
  return data.files?.[0]
}

function multipartBody(meta: object, content: string, boundary: string): string {
  return [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(meta),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

/** Crée ou remplace le fichier de sauvegarde sur Google Drive. */
export async function uploadBackupFile(
  token: string,
  content: string,
  name = DRIVE_BACKUP_NAME,
): Promise<DriveFileRef> {
  const existing = await findBackupFile(token, name)
  const boundary = `patrimoine_boundary_${Date.now()}`
  const meta = { name, mimeType: 'application/json' }
  const body = multipartBody(meta, content, boundary)
  const res = existing
    ? await call(token, `${UPLOAD_URL}/${existing.id}?uploadType=multipart`, {
        method: 'PATCH',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      })
    : await call(token, `${UPLOAD_URL}?uploadType=multipart`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      })
  return (await res.json()) as DriveFileRef
}

export async function downloadBackupFile(token: string, ref: DriveFileRef): Promise<string> {
  const res = await call(token, `${FILES_URL}/${ref.id}?alt=media`)
  return res.text()
}