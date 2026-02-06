import { test, expect } from './helpers/setup'

test('Debug: Check app initialization', async ({ page }) => {
  console.log('=== Test started ===')
  
  // Check if app loaded
  const appDiv = await page.locator('#app').count()
  console.log('App div found:', appDiv)
  
  // Check window globals
  const globals = await page.evaluate(() => {
    return {
      hasApi: typeof (window as any).api !== 'undefined',
      hasStore: typeof (window as any).__brio_store !== 'undefined',
      hasEditorView: typeof (window as any).__brio_editorView !== 'undefined',
      notesLoaded: (window as any).__brio_notesLoaded,
      isLoading: (window as any).__brio_isLoading,
    }
  })
  console.log('Window globals:', globals)
  
  // Wait a bit and check again
  await page.waitForTimeout(2000)
  
  const globalsAfter = await page.evaluate(() => {
    return {
      notesLoaded: (window as any).__brio_notesLoaded,
      isLoading: (window as any).__brio_isLoading,
    }
  })
  console.log('Window globals after 2s:', globalsAfter)
  
  // Try to get notes count
  const notesCount = await page.evaluate(async () => {
    try {
      const notes = await (window as any).api.notes.getAll()
      return notes.length
    } catch (error) {
      return `Error: ${error}`
    }
  })
  console.log('Notes count:', notesCount)
  
  expect(true).toBe(true) // Dummy assertion
})
