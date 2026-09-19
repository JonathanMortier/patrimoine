import { vi } from 'vitest'

/**
 * `vi.waitFor` avec un timeout élargi : sur les runners CI (couverture v8),
 * le rendu d'une vue peut dépasser le timeout par défaut de 1 s.
 */
export const waitFor = <T>(fn: () => T | Promise<T>): Promise<T> => vi.waitFor(fn, { timeout: 4000 })
