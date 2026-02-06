/**
 * Dual-mode test setup helper
 * 
 * Provides unified page setup for both Electron and Web modes
 */

import { test as base, type Page } from '@playwright/test'
import { _electron as electron, type ElectronApplication } from 'playwright'
import path from 'node:path'

// @ts-expect-error - electron package exports the path to the executable
import electronPath from 'electron'

// Detect mode from config or environment
export const isWebMode = process.env.BRIO_MODE === 'web' || process.argv.includes('playwright.config.web.ts')

// Path to the built Electron main process
const electronMainPath = path.join(process.cwd(), 'dist-electron', 'main', 'index.js')

// Electron-specific fixtures
type ElectronFixtures = {
  electronApp: ElectronApplication
  page: Page
}

// Web-specific fixtures
type WebFixtures = {
  page: Page
}

// Export the appropriate test fixture based on mode
export const test = isWebMode
  ? base.extend<WebFixtures>({
      // Create a new browser context for each test to ensure complete isolation
      page: async ({ browser }, use) => {
        // Create a fresh context with no storage
        const context = await browser.newContext({
          storageState: undefined, // No cookies or storage
        })
        
        const page = await context.newPage()
        
        // Capture console logs
        page.on('console', (msg) => {
          console.log(`[Browser ${msg.type()}]`, msg.text())
        })
        
        // Navigate to the web app with test mode parameter
        // Don't pass testId in URL - let the app generate it fresh each time
        await page.goto(`/?test=true`)
        console.log('[Test Web] Navigated to app in test mode')
        
        // Wait for Vue app to mount
        await page.waitForLoadState('domcontentloaded')
        console.log('[Test Web] DOM content loaded')

        // Wait for notes list to be ready
        try {
          await page.waitForSelector('[data-testid="notes-list"]', { timeout: 10000 })
          console.log('[Test Web] notes-list found')
        } catch (error) {
          console.error('[Test Web] Failed to find notes-list:', error)
          await page.screenshot({ path: 'test-failure-screenshot-web.png' })
          throw error
        }

        // Wait for store to be fully initialized (network idle is more reliable than arbitrary timeout)
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
          // Fallback: if networkidle times out, store is likely ready anyway
          console.log('[Test Web] networkidle timeout - proceeding')
        })
        console.log('[Test Web] Store initialization complete')

        await use(page)
        
        // Clean up: close context after test
        await context.close()
      },
    })
  : base.extend<ElectronFixtures>({
      // eslint-disable-next-line no-empty-pattern
      electronApp: async ({}, use) => {
        const userDataDir = path.join(process.cwd(), '.test-data', `test-${Date.now()}-${Math.random().toString(36).slice(2)}`)

        const app = await electron.launch({
          executablePath: electronPath,
          args: [
            electronMainPath,
            `--user-data-dir=${userDataDir}`,
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-software-rasterizer',
            '--disable-extensions',
          ],
          env: {
            ...process.env,
            NODE_ENV: 'test',
            ELECTRON_ENABLE_LOGGING: '0',
          },
        })

        await use(app)
        await app.close()
      },
      page: async ({ electronApp }, use) => {
        const page = await electronApp.firstWindow()

        page.on('console', (msg) => {
          console.log(`[Browser ${msg.type()}]`, msg.text())
        })

        await page.waitForLoadState('domcontentloaded')

        try {
          await page.waitForSelector('[data-testid="notes-list"]', { timeout: 10000 })
        } catch (error) {
          console.error('[Test Electron] Failed to find notes-list:', error)
          await page.screenshot({ path: 'test-failure-screenshot-electron.png' })
          throw error
        }

        await page.waitForTimeout(1000)

        await use(page)
      },
    })

export { expect } from '@playwright/test'

/**
 * Helper to write text to CodeMirror editor
 * CodeMirror doesn't work with page.fill(), we need to use its API
 */
export async function fillEditor(page: Page, text: string) {
  await page.evaluate((content) => {
    const editorView = (window as any).__editorView
    if (!editorView) {
      throw new Error('EditorView not found on window')
    }
    
    // Replace entire document content
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: content
      }
    })
  }, text)
  
  // Wait for content to be processed
  await page.waitForFunction((expectedText) => {
    const editorView = (window as any).__editorView
    return editorView?.state.doc.toString() === expectedText
  }, text)
}
