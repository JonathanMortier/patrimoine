import { changePassword, PasswordError, LockedError } from '../crypto/security'

export function renderReglages(view: HTMLElement): void {
  view.innerHTML = `
    <section class="card">
      <h2>Changer le mot de passe</h2>
      <p class="muted">Le changement ne re-chiffre pas vos données : seule la clé de chiffrement est re-protégée.</p>
      <form id="pw-form" autocomplete="off">
        <label class="field">
          <span>Mot de passe actuel</span>
          <input type="password" name="old" required autocomplete="current-password" />
        </label>
        <label class="field">
          <span>Nouveau mot de passe</span>
          <input type="password" name="nw" minlength="4" required autocomplete="new-password" />
        </label>
        <label class="field">
          <span>Confirmation</span>
          <input type="password" name="confirm" minlength="4" required autocomplete="new-password" />
        </label>
        <button type="submit" class="primary">Changer le mot de passe</button>
        <p class="msg" aria-live="polite"></p>
      </form>
    </section>
  `

  const msg = view.querySelector<HTMLParagraphElement>('.msg')!
  view.querySelector('#pw-form')!.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    const get = (name: string) => (view.querySelector(`[name=${name}]`) as HTMLInputElement).value
    const oldPw = get('old')
    const newPw = get('nw')
    if (newPw !== get('confirm')) {
      msg.textContent = 'Les nouveaux mots de passe ne correspondent pas.'
      msg.className = 'msg err'
      return
    }
    try {
      await changePassword(oldPw, newPw)
      msg.textContent = 'Mot de passe changé.'
      msg.className = 'msg ok'
      ;(view.querySelector('#pw-form') as HTMLFormElement).reset()
    } catch (err) {
      msg.textContent =
        err instanceof PasswordError || err instanceof LockedError
          ? err.message
          : 'Changement impossible.'
      msg.className = 'msg err'
    }
  })
}