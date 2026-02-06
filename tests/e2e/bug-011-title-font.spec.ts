import { test, expect } from './helpers/setup'

test.describe('BUG-011 Title Font Family @e2e @bug', () => {
  test.beforeEach(async ({ page }) => {
    // Clean up existing notes
    await page.evaluate(async () => {
      interface WindowWithAPI extends Window {
        api: {
          notes: {
            getAll: () => Promise<Array<{ id: string }>>
            delete: (id: string) => Promise<void>
          }
        }
      }
      const notes = await (window as WindowWithAPI).api.notes.getAll()
      for (const note of notes) {
        await (window as WindowWithAPI).api.notes.delete(note.id)
      }
    })

    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForSelector('[data-testid="notes-list"]', { timeout: 10000 })
    await page.waitForTimeout(500)
  })

  test('should use -apple-system font for note title, not Arial', async ({ page }) => {
    // Given: Create a new note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    // Wait for title input to be visible
    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })

    // When: Check the computed font-family of the title input
    const fontFamily = await titleInput.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily
    })

    // Then: Font family should start with -apple-system or system-ui (not Arial)
    // Note: Browsers may normalize font names, so we check for common system font indicators
    const isSystemFont =
      fontFamily.includes('-apple-system') ||
      fontFamily.includes('system-ui') ||
      fontFamily.includes('SF Pro') ||
      fontFamily.includes('BlinkMacSystemFont') ||
      // On macOS, -apple-system resolves to ".AppleSystemUIFont" or similar
      fontFamily.includes('.Apple')

    expect(isSystemFont).toBe(true)
    expect(fontFamily.toLowerCase()).not.toContain('arial')
  })

  test('should match ui font-family CSS variable', async ({ page }) => {
    // Given: Create a new note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })

    // When: Get the CSS variable value and computed font-family
    const result = await titleInput.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el)
      const rootStyle = window.getComputedStyle(document.documentElement)
      return {
        computed: computedStyle.fontFamily,
        variable: rootStyle.getPropertyValue('--ui-font-family').trim(),
      }
    })

    // Then: The computed font should match the CSS variable
    // (or be a resolved version of it)
    expect(result.variable).toBeTruthy()
    expect(result.variable).toContain('-apple-system')

    // The computed style should reflect the variable value
    // (browsers may resolve it differently, but it should not be Arial)
    expect(result.computed.toLowerCase()).not.toContain('arial')
  })
})
