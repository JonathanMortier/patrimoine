const EYE_ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>'

const EYE_OFF_ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 9.6a3 3 0 0 0 4.2 4.2"/><path d="M6.2 6.4C3.4 8.1 1 12 1 12s4 7 11 7a10.6 10.6 0 0 0 4.9-1.2"/><path d="M10.6 5.1C11 5.1 11.5 5 12 5c7 0 11 7 11 7a15 15 0 0 1-2.9 3.6"/><path d="M1 1l22 22"/></svg>'

/**
 * Enveloppe chaque `input[type="password"]` sous `root` d'un bouton qui
 * bascule l'affichage en clair. Idempotent : un champ déjà enveloppé est
 * ignoré, donc sûr à appeler après chaque (ré)écriture du HTML d'une vue.
 */
export function attachPasswordToggles(root: ParentNode): void {
  root.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((input) => {
    if (input.closest('.pw-field')) return

    const wrap = document.createElement('div')
    wrap.className = 'pw-field'
    input.replaceWith(wrap)
    wrap.appendChild(input)

    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'pw-toggle ghost'
    toggle.setAttribute('aria-label', 'Afficher le mot de passe')
    toggle.setAttribute('aria-pressed', 'false')
    toggle.innerHTML = EYE_ICON
    toggle.addEventListener('click', () => {
      const shown = input.type === 'text'
      input.type = shown ? 'password' : 'text'
      toggle.setAttribute('aria-pressed', String(!shown))
      toggle.setAttribute('aria-label', shown ? 'Afficher le mot de passe' : 'Masquer le mot de passe')
      toggle.innerHTML = shown ? EYE_ICON : EYE_OFF_ICON
    })
    wrap.appendChild(toggle)
  })
}
