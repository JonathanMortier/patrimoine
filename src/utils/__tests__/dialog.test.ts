// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { trapFocus } from '../dialog'

function setup() {
  document.body.innerHTML = `
    <button id="outside">hors modale</button>
    <div id="overlay"><button id="a">A</button><button id="b">B</button></div>`
  const outside = document.getElementById('outside') as HTMLButtonElement
  outside.focus()
  const overlay = document.getElementById('overlay')!
  const onClose = vi.fn()
  const release = trapFocus(overlay, onClose)
  return { outside, overlay, onClose, release, a: document.getElementById('a')!, b: document.getElementById('b')! }
}

const key = (el: HTMLElement, k: string, shiftKey = false) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true }))

describe('trapFocus', () => {
  it('ferme la modale avec Échap', () => {
    const { a, onClose } = setup()
    key(a, 'Escape')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('reboucle le focus avec Tab et Maj+Tab', () => {
    const { a, b } = setup()
    b.focus()
    key(b, 'Tab')
    expect(document.activeElement).toBe(a)
    key(a, 'Tab', true)
    expect(document.activeElement).toBe(b)
  })

  it('rend le focus à l’élément précédent au nettoyage', () => {
    const { outside, a, release } = setup()
    a.focus()
    release()
    expect(document.activeElement).toBe(outside)
  })
})
