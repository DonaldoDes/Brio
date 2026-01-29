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
    // Use unique user data dir per test to avoid singleton lock conflicts
    const userDataDir = path.join(process.cwd(), '.test-data', `test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    
    const app = await electron.launch({
      executablePath: electronPath,
      args: [electronMainPath, `--user-data-dir=${userDataDir}`],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })
    
    // Capture Electron main process logs
    app.process().stdout?.on('data', (data) => {
      console.log(`[Electron stdout] ${data.toString()}`)
    })
    app.process().stderr?.on('data', (data) => {
      console.log(`[Electron stderr] ${data.toString()}`)
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
    console.log('[Test] DOM content loaded')
    
    // Wait for Vue app to mount and Pinia store to initialize
    try {
      await page.waitForSelector('[data-testid="notes-list"]', { timeout: 10000 })
      console.log('[Test] notes-list found')
    } catch (error) {
      console.error('[Test] Failed to find notes-list:', error)
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-failure-screenshot.png' })
      throw error
    }

    // Additional wait to ensure store is fully initialized and IPC handlers are ready
    await page.waitForTimeout(1000)
    console.log('[Test] Additional wait completed')

    await use(page)
  },
})

export { expect } from '@playwright/test'
