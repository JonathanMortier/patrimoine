import { vi } from 'vitest'

/**
 * `vi.waitFor` avec un timeout élargi : sur les runners CI (couverture v8),
 * le rendu d'une vue peut dépasser le timeout par défaut de 1 s. 4 s s'est
 * encore révélé trop court lors d'un démarrage à froid (premier test d'un
 * fichier : import de chart.js, dérivation de la clé, ouverture indexeddb).
 */
export const waitFor = <T>(fn: () => T | Promise<T>): Promise<T> => vi.waitFor(fn, { timeout: 10000 })
