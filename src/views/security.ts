import { PasswordError, lock, setup, unlock } from '../crypto/security'
import { emitAuthEvent } from '../events'

function formShell(
  title: string,
  submitLabel: string,
  confirm: boolean,
): HTMLElement {
  const root = document.createElement('div')
  root.className = 'auth-screen'
  root.innerHTML = `
    <form class="auth-card" autocomplete="on">
      <h1>Patrimoine</h1>
      <p class="auth-title">${title}</p>
      <label class="field">
        <span>Mot de passe</span>
        <input type="password" name="password" minlength="4" required autocomplete="current-password" />
      </label>
      ${confirm ? `
      <label class="field">
        <span>Confirmation</span>
        <input type="password" name="confirm" minlength="4" required autocomplete="new-password" />
      </label>` : ''}
      <button type="submit" class="primary">${submitLabel}</button>
      <p class="msg" aria-live="polite"></p>
    </form>
  `
  return root
}

function setMsg(root: HTMLElement, text: string, ok: boolean): void {
  const msg = root.querySelector<HTMLParagraphElement>('.msg')!
  msg.textContent = text
  msg.className = `msg ${ok ? 'ok' : 'err'}`
}

export function renderCreateScreen(root: HTMLElement): void {
  const card = formShell('Définissez un mot de passe pour chiffrer vos données.', 'Créer le mot de passe', true)
  root.appendChild(card)

  card.querySelector('form')!.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    const password = (card.querySelector('[name=password]') as HTMLInputElement).value
    const confirm = (card.querySelector('[name=confirm]') as HTMLInputElement).value
    if (password !== confirm) {
      setMsg(card, 'Les mots de passe ne correspondent pas.', false)
      return
    }
    try {
      await setup(password)
      emitAuthEvent()
    } catch (err) {
      setMsg(card, err instanceof PasswordError ? err.message : 'Impossible de créer la base chiffrée.', false)
    }
  })
}

export function renderLockScreen(root: HTMLElement): void {
  const card = formShell('Déverrouillez pour accéder à vos données chiffrées.', 'Déverrouiller', false)
  root.appendChild(card)

  card.querySelector('form')!.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    const password = (card.querySelector('[name=password]') as HTMLInputElement).value
    try {
      await unlock(password)
      emitAuthEvent()
    } catch (err) {
      card.querySelector<HTMLInputElement>('[name=password]')!.value = ''
      setMsg(card, err instanceof PasswordError ? err.message : 'Déverrouillage impossible.', false)
      if (err instanceof PasswordError) {
        void lock()
      }
    }
  })
}