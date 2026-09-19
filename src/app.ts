import { lock } from './crypto/security'
import { emitAuthEvent } from './events'
import { escapeHtml } from './utils/format'
import { renderReglages } from './views/reglages'
import { renderImport } from './views/import'
import { renderSaisie } from './views/saisie'
import { renderDashboard } from './views/dashboard'
import { renderCredits } from './views/credits'
import { renderProjection } from './views/projection'

const svgIcon = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

const ICONS = {
  dashboard: svgIcon('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  saisie: svgIcon('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  import: svgIcon('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>'),
  credits: svgIcon('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  projection: svgIcon('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  reglages: svgIcon('<path d="M4 6h10"/><path d="M18 6h2"/><path d="M4 12h4"/><path d="M12 12h8"/><path d="M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  lock: svgIcon('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
}

export type Route = 'dashboard' | 'saisie' | 'import' | 'credits' | 'projection' | 'reglages'

export const ROUTES: { id: Route; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard },
  { id: 'saisie', label: 'Saisie', icon: ICONS.saisie },
  { id: 'import', label: 'Import', icon: ICONS.import },
  { id: 'credits', label: 'Crédits', icon: ICONS.credits },
  { id: 'projection', label: 'Projection', icon: ICONS.projection },
  { id: 'reglages', label: 'Réglages', icon: ICONS.reglages },
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
      <p class="muted">${escapeHtml(message)}</p>
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

  const nav = ROUTES.map((r) => `          <button class="tab" data-route="${r.id}"><span class="icon">${r.icon}</span><span>${r.label}</span></button>`).join('\n')

  root.innerHTML = `
    <header class="topbar">
      <h1>Patrimoine</h1>
      <button id="btn-lock" class="ghost" title="Verrouiller" aria-label="Verrouiller">${ICONS.lock}</button>
    </header>
    <main id="view"></main>
    <nav class="tabbar" aria-label="Navigation principale">
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

  const title = document.querySelector('.topbar h1')
  if (title) {
    const label = ROUTES.find((r) => r.id === active)?.label ?? ''
    title.textContent = active === 'dashboard' ? 'Patrimoine' : `Patrimoine · ${label}`
  }

  rootTabs().forEach((btn) => {
    const isActive = btn.dataset.route === active
    btn.classList.toggle('active', isActive)
    if (isActive) btn.setAttribute('aria-current', 'page')
    else btn.removeAttribute('aria-current')
  })

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
}

function rootTabs(): HTMLButtonElement[] {
  const nav = document.querySelector('.tabbar')
  return nav ? Array.from(nav.querySelectorAll<HTMLButtonElement>('.tab')) : []
}