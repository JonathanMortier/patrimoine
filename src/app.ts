import { lock } from './crypto/security'
import { emitAuthEvent } from './events'
import { renderReglages } from './views/reglages'
import { renderImport } from './views/import'
import { renderSaisie } from './views/saisie'
import { renderDashboard } from './views/dashboard'
import { renderCredits } from './views/credits'
import { renderProjection } from './views/projection'

export type Route = 'dashboard' | 'saisie' | 'import' | 'credits' | 'projection' | 'reglages'

export const ROUTES: { id: Route; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'saisie', label: 'Saisie', icon: '✎' },
  { id: 'import', label: 'Import', icon: '⤓' },
  { id: 'credits', label: 'Crédits', icon: '⌂' },
  { id: 'projection', label: 'Projection', icon: '↗' },
  { id: 'reglages', label: 'Réglages', icon: '⚙' },
]

export function currentRoute(): Route {
  const hash = location.hash.replace(/^#\/?/, '')
  return (ROUTES.some((r) => r.id === hash) ? hash : 'dashboard') as Route
}

export function navigate(route: Route): void {
  location.hash = `#/${route}`
  // Rend immédiatement pour ne pas dépendre du déclenchement de l'événement
  // `hashchange` (différences selon navigateur / mode webview standalone).
  render()
}

function showRenderError(view: HTMLElement, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  view.innerHTML = `
    <section class="card">
      <h2>Impossible d'afficher l'écran.</h2>
      <p class="muted">${message}</p>
      <button id="err-retry" class="ghost">Réessayer</button>
    </section>
  `
  view.querySelector('#err-retry')?.addEventListener('click', () => render())
}

let bound = false

export function mountApp(root: HTMLElement): void {
  if (bound) {
    root.replaceChildren()
  } else {
    bound = true
  }

  const nav = ROUTES.map((r) => `          <button class="tab" data-route="${r.id}">${r.icon}<span>${r.label}</span></button>`).join('\n')

  root.innerHTML = `
    <header class="topbar">
      <h1>Patrimoine</h1>
      <button id="btn-lock" class="ghost" title="Verrouiller">🔒</button>
    </header>
    <main id="view"></main>
    <nav class="tabbar">
${nav}
    </nav>
  `

  if (!bound) {
    window.addEventListener('hashchange', render)
  }

  root.querySelector('#btn-lock')!.addEventListener('click', () => {
    lock()
    emitAuthEvent()
  })

  root.querySelectorAll<HTMLButtonElement>('.tab').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.route as Route))
  })

  render()
}

function render(): void {
  const view = document.getElementById('view')
  if (!view) return
  const active = currentRoute()

  rootTabs().forEach((btn) => btn.classList.toggle('active', btn.dataset.route === active))

  if (active === 'credits') {
    void renderCredits(view).catch((err) => showRenderError(view, err))
    return
  }

  if (active === 'dashboard') {
    void renderDashboard(view).catch((err) => showRenderError(view, err))
    return
  }

  if (active === 'reglages') {
    void renderReglages(view).catch((err) => showRenderError(view, err))
    return
  }

  if (active === 'import') {
    renderImport(view)
    return
  }

  if (active === 'saisie') {
    void renderSaisie(view).catch((err) => showRenderError(view, err))
    return
  }

  if (active === 'projection') {
    void renderProjection(view).catch((err) => showRenderError(view, err))
    return
  }

  const labels: Record<Route, string> = {
    dashboard: 'Dashboard',
    saisie: 'Assistant du 1er du mois',
    import: 'Import initial',
    credits: 'Crédits immo',
    projection: 'Projection Bourse',
    reglages: 'Réglages',
  }

  view.innerHTML = `
    <section class="placeholder">
      <h2>${labels[active]}</h2>
      <p>Écran en construction.</p>
    </section>
  `
}

function rootTabs(): HTMLButtonElement[] {
  const nav = document.querySelector('.tabbar')
  return nav ? Array.from(nav.querySelectorAll<HTMLButtonElement>('.tab')) : []
}