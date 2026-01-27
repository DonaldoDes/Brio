import { _electron as electron, type ElectronApplication, type Page } from 'playwright'
import { test as base } from '@playwright/test'
import path from 'node:path'

// Use the electron executable from node_modules
// @ts-expect-error - electron package exports the path to the executable
import electronPath from 'electron'

// Path to the built Electron main process
const electronMainPath = path.join(process.cwd(), 'dist-electron', 'main', 'index.js')

export const test = base.extend<{ electronApp: ElectronApplication; page: Page }>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    const app = await electron.launch({
      executablePath: electronPath,
      args: [electronMainPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })
    await use(app)
    await app.close()
  },
  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()

    // Capture console logs
    page.on('console', (msg) => {
      console.log(`[Browser ${msg.type()}]`, msg.text())
    })

    await page.waitForLoadState('domcontentloaded')
    // Wait for Vue app to mount and Pinia store to initialize
    await page.waitForSelector('[data-testid="notes-list"]', { timeout: 10000 })

    // Additional wait to ensure store is fully initialized and IPC handlers are ready
    await page.waitForTimeout(1000)

    await use(page)
  },
})

export { expect } from '@playwright/test'
