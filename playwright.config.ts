import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  workers: 1,
  retries: 2,
  use: {
    trace: 'on-first-retry',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
})
