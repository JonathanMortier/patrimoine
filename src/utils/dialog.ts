const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select, textarea, [href], [tabindex]:not([tabindex="-1"])'

/**
 * Rend une modale accessible : Échap ferme, Tab reste dans la modale, et le focus
 * revient sur l'élément précédent à la fermeture. Retourne la fonction de nettoyage.
 */
export function trapFocus(overlay: HTMLElement, onClose: () => void): () => void {
  const previous = document.activeElement as HTMLElement | null
  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') {
      ev.preventDefault()
      onClose()
      return
    }
    if (ev.key !== 'Tab') return
    const items = [...overlay.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hidden)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault()
      last.focus()
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault()
      first.focus()
    }
  }
  overlay.addEventListener('keydown', onKey)
  return () => {
    overlay.removeEventListener('keydown', onKey)
    previous?.focus?.()
  }
}
