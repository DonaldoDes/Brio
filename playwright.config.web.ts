import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/debug-*.spec.ts', '**/diagnostic*.spec.ts', '**/bear-mode-debug.spec.ts', '**/test-button.spec.ts', '**/test-simple.spec.ts'],
  timeout: 15000, // Reduced from 30s - web tests should be fast
  workers: 4, // Parallel execution - tests are isolated with unique IndexedDB
  retries: 0, // No retries - fix flaky tests instead of masking them
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  
  // Start dev server before running tests
  webServer: {
    command: 'npm run dev:web',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
