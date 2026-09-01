import { changePassword, PasswordError, LockedError } from '../crypto/security'
import { constantesRepo } from '../db/repos/constantes'
import { fmtAmount } from '../utils/format'

export async function renderReglages(view: HTMLElement): Promise<void> {
  const constantes = await constantesRepo.get()

  view.innerHTML = `
    <section class="card" id="conv-card">
      <h2>Conversion dollar → euro</h2>
      <p class="muted">Les wallets en $ de la section Crypto sont convertis via « 1 € = X $ ».</p>
      <label class="field">
        <span>1 € = ? $</span>
        <input type="number" inputmode="decimal" step="0.01" min="0.0001" name="convUsdEur" value="${fmtAmount(constantes.convUsdEur)}" />
      </label>
      <button id="save-conv" class="primary">Enregistrer la conversion</button>
      <p class="msg" aria-live="polite"></p>
    </section>

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

  const convMsg = view.querySelector<HTMLParagraphElement>('#conv-card .msg')!
  view.querySelector('#save-conv')!.addEventListener('click', async () => {
    const raw = (view.querySelector('[name=convUsdEur]') as HTMLInputElement).value.trim().replace(',', '.')
    const n = parseFloat(raw)
    if (!Number.isFinite(n) || n <= 0) {
      convMsg.textContent = 'Conversion invalide (nombre strictement positif).'
      convMsg.className = 'msg err'
      return
    }
    try {
      const current = await constantesRepo.get()
      await constantesRepo.save({ ...current, convUsdEur: n })
      convMsg.textContent = `Conversion enregistrée : 1 € = ${fmtAmount(n)} $`
      convMsg.className = 'msg ok'
    } catch (err) {
      convMsg.textContent = err instanceof LockedError ? err.message : 'Enregistrement impossible (session verrouillée ?).'
      convMsg.className = 'msg err'
    }
  })

  const msg = view.querySelector<HTMLParagraphElement>('#pw-form .msg')!
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