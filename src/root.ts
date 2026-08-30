import { renderLockScreen, renderCreateScreen } from './views/security'
import { securityStatus } from './crypto/security'
import { openDb } from './db'
import { mountApp } from './app'
import { AUTH_EVENT } from './events'

export async function renderRoot(): Promise<void> {
  const app = document.getElementById('app')!
  app.replaceChildren()
  const status = await securityStatus()
  if (status === 'uninitialized') {
    renderCreateScreen(app)
  } else if (status === 'locked') {
    renderLockScreen(app)
  } else {
    mountApp(app)
  }
}

export async function bootstrap(): Promise<void> {
  await openDb()
  window.addEventListener(AUTH_EVENT, () => void renderRoot())
  await renderRoot()
}