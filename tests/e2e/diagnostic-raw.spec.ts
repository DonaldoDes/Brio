import { _electron as electron } from 'playwright'
import { test, expect } from '@playwright/test'
import path from 'node:path'

// @ts-expect-error - electron package exports the path to the executable
import electronPath from 'electron'

const electronMainPath = path.join(process.cwd(), 'dist-electron', 'main', 'index.js')

test('Diagnostic RAW: Check app state without waiting', async () => {
  // Skip in web mode (requires Electron app launch)
  test.skip(process.env.BRIO_MODE === 'web', 'Requires Electron app launch')
  console.log('[Diagnostic] Starting raw diagnostic test')
  
  // Launch Electron without any waiting
  const userDataDir = path.join(process.cwd(), '.test-data', `diagnostic-${Date.now()}`)
  
  const app = await electron.launch({
    executablePath: electronPath,
    args: [electronMainPath, `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  })
  
  console.log('[Diagnostic] Electron launched')
  
  // Capture Electron main process logs
  const mainLogs: string[] = []
  app.process().stdout?.on('data', (data) => {
    const log = `[Electron stdout] ${data.toString()}`
    console.log(log)
    mainLogs.push(log)
  })
  app.process().stderr?.on('data', (data) => {
    const log = `[Electron stderr] ${data.toString()}`
    console.log(log)
    mainLogs.push(log)
  })
  
  // Get first window
  const page = await app.firstWindow()
  console.log('[Diagnostic] Got first window')
  
  // Capture browser console logs
  const browserLogs: string[] = []
  page.on('console', (msg) => {
    const log = `[Browser ${msg.type()}] ${msg.text()}`
    console.log(log)
    browserLogs.push(log)
  })
  
  // Wait for DOM to load
  await page.waitForLoadState('domcontentloaded')
  console.log('[Diagnostic] DOM content loaded')
  
  // Wait a bit for initialization
  await page.waitForTimeout(3000)
  
  // Take screenshot
  await page.screenshot({ path: 'diagnostic-screenshot.png', fullPage: true })
  console.log('[Diagnostic] Screenshot saved to diagnostic-screenshot.png')
  
  // Get detailed debug info
  const debugInfo = await page.evaluate(() => {
    return {
      // Window API
      hasApi: typeof (window as any).api !== 'undefined',
      apiKeys: (window as any).api ? Object.keys((window as any).api) : [],
      
      // Brio globals
      brio_notesLoaded: (window as any).__brio_notesLoaded,
      brio_isLoading: (window as any).__brio_isLoading,
      brio_error: (window as any).__brio_error,
      
      // App attributes
      appReady: document.querySelector('#app')?.getAttribute('data-app-ready'),
      notesLoaded: document.querySelector('#app')?.getAttribute('data-notes-loaded'),
      
      // DOM elements
      hasApp: !!document.querySelector('#app'),
      hasNotesList: !!document.querySelector('[data-testid="notes-list"]'),
      hasErrorDisplay: !!document.querySelector('[data-testid="error-display"]'),
      
      // App HTML (first 1000 chars)
      appHTML: document.querySelector('#app')?.innerHTML.substring(0, 1000) || 'NO #app',
      
      // Body classes
      bodyClasses: document.body.className,
      
      // All data-testid elements
      testIds: Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid'))
    }
  })
  
  console.log('[Diagnostic] ===== DEBUG INFO =====')
  console.log(JSON.stringify(debugInfo, null, 2))
  
  console.log('[Diagnostic] ===== MAIN PROCESS LOGS =====')
  console.log(mainLogs.join('\n'))
  
  console.log('[Diagnostic] ===== BROWSER LOGS =====')
  console.log(browserLogs.join('\n'))
  
  await app.close()
  console.log('[Diagnostic] Test completed')
})
