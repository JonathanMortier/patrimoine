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
  try {
    await openDb()
    window.addEventListener(AUTH_EVENT, () => void renderRoot())
    await renderRoot()
  } catch (err) {
    const app = document.getElementById('app')
    if (app) {
      app.innerHTML = `
        <div class="auth-screen"><form class="auth-card">
          <h1>Patrimoine</h1>
          <p class="msg error">Impossible de démarrer : ${err instanceof Error ? err.message : String(err)}</p>
          <p class="muted">Vous pouvez réinitialiser la base de données locale dans Réglages, ou recharger la page.</p>
        </form></div>
      `
    }
  }
}