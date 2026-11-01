// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { attachPasswordToggles } from '../passwordToggle'

function setup(): HTMLInputElement {
  document.body.innerHTML = `
    <label class="field">
      <span>Mot de passe</span>
      <input type="password" name="password" />
    </label>`
  attachPasswordToggles(document.body)
  return document.querySelector<HTMLInputElement>('input[name="password"]')!
}

describe('attachPasswordToggles', () => {
  it('ajoute un bouton qui bascule le type du champ', () => {
    const input = setup()
    const toggle = document.querySelector<HTMLButtonElement>('.pw-toggle')!
    expect(input.type).toBe('password')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')

    toggle.click()
    expect(input.type).toBe('text')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(toggle.getAttribute('aria-label')).toBe('Masquer le mot de passe')

    toggle.click()
    expect(input.type).toBe('password')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(toggle.getAttribute('aria-label')).toBe('Afficher le mot de passe')
  })

  it('ne touche pas à la valeur ni à la position du champ dans le formulaire', () => {
    const input = setup()
    input.value = 'secret'
    const toggle = document.querySelector<HTMLButtonElement>('.pw-toggle')!
    toggle.click()
    expect(input.value).toBe('secret')
    expect(input.closest('.field')).not.toBeNull()
  })

  it('est idempotent : un second appel ne double pas le bouton', () => {
    setup()
    attachPasswordToggles(document.body)
    expect(document.querySelectorAll('.pw-toggle').length).toBe(1)
  })

  it("ne fait rien sans champ mot de passe", () => {
    document.body.innerHTML = '<input type="text" />'
    expect(() => attachPasswordToggles(document.body)).not.toThrow()
    expect(document.querySelector('.pw-toggle')).toBeNull()
  })
})
