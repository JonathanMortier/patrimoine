import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./src/db/__tests__/setup.ts'],
    // Le timeout par défaut (5 s) est trop court pour `waitFor` (src/test/waitFor.ts,
    // 10 s) sur les runners CI lors d'un démarrage à froid avec couverture v8.
    testTimeout: 12000,
    hookTimeout: 12000,
    // Sur un runner CI partagé, plusieurs fichiers de test s'exécutaient en parallèle
    // sur des threads distincts qui se disputaient le CPU. Un test pris au hasard
    // (jamais le même) voyait alors ses callbacks (fake-indexeddb, rendu async) retardés
    // de plusieurs secondes par le défaut d'ordonnancement, au point de dépasser même un
    // timeout généreux — pas un simple « démarrage à froid » plus lent. Un seul thread
    // supprime cette contention interne ; la suite reste rapide (~200 tests).
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
})