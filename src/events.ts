export const AUTH_EVENT = 'patrimoine:auth'

export function emitAuthEvent(): void {
  window.dispatchEvent(new Event(AUTH_EVENT))
}