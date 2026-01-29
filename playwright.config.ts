import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  workers: 1, // Exécution séquentielle pour éviter les race conditions
  retries: 2, // Retry les tests flaky
  use: {
    trace: 'on-first-retry',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
})
