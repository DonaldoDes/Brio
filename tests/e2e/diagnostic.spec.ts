import { test } from './helpers/setup'

test('Diagnostic: Check app state', async ({ page }) => {
  test.setTimeout(10000) // 10 seconds max
  console.log('[Diagnostic] Test started')
  
  // Capture console logs from the start
  const logs: string[] = []
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`))
  
  // Wait a bit for app to initialize
  await page.waitForTimeout(2000)
  
  // Take screenshot
  await page.screenshot({ path: 'diagnostic-screenshot.png' })
  console.log('[Diagnostic] Screenshot saved')
  
  // Check window properties
  const debugInfo = await page.evaluate(() => {
    return {
      hasApi: typeof (window as any).api !== 'undefined',
      apiKeys: (window as any).api ? Object.keys((window as any).api) : [],
      brio_notesLoaded: (window as any).__brio_notesLoaded,
      brio_isLoading: (window as any).__brio_isLoading,
      appReady: document.querySelector('#app')?.getAttribute('data-app-ready'),
      notesLoaded: document.querySelector('#app')?.getAttribute('data-notes-loaded'),
      hasNotesList: !!document.querySelector('[data-testid="notes-list"]'),
      bodyHTML: document.body.innerHTML.substring(0, 500)
    }
  })
  
  console.log('[Diagnostic] Debug info:', JSON.stringify(debugInfo, null, 2))
  console.log('[Diagnostic] Console logs captured:', logs.length)
  console.log('[Diagnostic] Console logs:', logs.join('\n'))
})
