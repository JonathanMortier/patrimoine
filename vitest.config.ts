import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./src/db/__tests__/setup.ts'],
    // Le timeout par défaut (5 s) est trop court pour `waitFor` (src/test/waitFor.ts,
    // 10 s) sur les runners CI lors d'un démarrage à froid avec couverture v8.
    testTimeout: 12000,
    hookTimeout: 12000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
})