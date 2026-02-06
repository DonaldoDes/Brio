import { test, expect } from './helpers/setup'

test.describe('US-014 Quick Capture @e2e', () => {
  test.beforeEach(async ({ page }) => {
    // Attendre que l'app charge
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Supprimer toutes les notes existantes via l'API
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

    // Attendre que la suppression soit complète
    await page.waitForTimeout(200)

    // Recharger la liste
    await page.reload()
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)
  })

  test('Scenario 1: should open quick capture modal with Cmd+Shift+N', async ({ page }) => {
    // Given: app is open
    await page.waitForSelector('[data-testid="notes-list"]')

    // When: user presses Cmd+Shift+N
    await page.keyboard.press('Meta+Shift+N')

    // Then: quick capture modal appears
    const modal = page.locator('[data-testid="quick-capture-modal"]')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // And: input is focused
    const input = page.locator('[data-testid="quick-capture-input"]')
    await expect(input).toBeFocused()
  })

  test('Scenario 2: should save text with Cmd+Enter', async ({ page }) => {
    // Given: quick capture modal is open
    await page.keyboard.press('Meta+Shift+N')
    const modal = page.locator('[data-testid="quick-capture-modal"]')
    await expect(modal).toBeVisible({ timeout: 5000 })

    const input = page.locator('[data-testid="quick-capture-input"]')

    // When: user types "Quick idea" and presses Cmd+Enter
    await input.fill('Quick idea')
    await page.keyboard.press('Meta+Enter')

    // Then: modal closes
    await expect(modal).not.toBeVisible({ timeout: 5000 })
  })

  test('Scenario 3: should add text to Inbox note', async ({ page }) => {
    // Given: quick capture modal is open
    await page.keyboard.press('Meta+Shift+N')
    const modal = page.locator('[data-testid="quick-capture-modal"]')
    await expect(modal).toBeVisible({ timeout: 5000 })

    const input = page.locator('[data-testid="quick-capture-input"]')

    // When: user types "First capture" and saves
    await input.fill('First capture')
    await page.keyboard.press('Meta+Enter')
    await expect(modal).not.toBeVisible({ timeout: 5000 })

    // Wait for save to complete
    await page.waitForTimeout(500)

    // Then: "Inbox" note exists in the list
    const inboxNote = page.locator('[data-testid="note-item"]').filter({ hasText: 'Inbox' })
    await expect(inboxNote).toBeVisible({ timeout: 5000 })

    // When: user clicks on Inbox note
    await inboxNote.click()
    await page.waitForTimeout(200)

    // Then: content contains "First capture"
    const editor = page.locator('.cm-content')
    await expect(editor).toContainText('First capture', { timeout: 5000 })

    // When: user captures another idea
    await page.keyboard.press('Meta+Shift+N')
    await expect(modal).toBeVisible({ timeout: 5000 })
    await input.fill('Second capture')
    await page.keyboard.press('Meta+Enter')
    await expect(modal).not.toBeVisible({ timeout: 5000 })

    // Wait for save
    await page.waitForTimeout(500)

    // Then: both captures are in Inbox
    await expect(editor).toContainText('First capture', { timeout: 5000 })
    await expect(editor).toContainText('Second capture', { timeout: 5000 })
  })

  test('Scenario 4: should close without saving with Escape', async ({ page }) => {
    // Given: quick capture modal is open with text
    await page.keyboard.press('Meta+Shift+N')
    const modal = page.locator('[data-testid="quick-capture-modal"]')
    await expect(modal).toBeVisible({ timeout: 5000 })

    const input = page.locator('[data-testid="quick-capture-input"]')
    await input.fill('This should not be saved')

    // When: user presses Escape
    await page.keyboard.press('Escape')

    // Then: modal closes
    await expect(modal).not.toBeVisible({ timeout: 5000 })

    // And: text is not saved (Inbox note should not exist)
    await page.waitForTimeout(500)
    const inboxNote = page.locator('[data-testid="note-item"]').filter({ hasText: 'Inbox' })
    await expect(inboxNote).not.toBeVisible()
  })

  test('Scenario 5: should navigate history with arrow keys', async ({ page }) => {
    // Given: user has made 3 captures
    const captures = ['First idea', 'Second idea', 'Third idea']
    
    for (const capture of captures) {
      await page.keyboard.press('Meta+Shift+N')
      const modal = page.locator('[data-testid="quick-capture-modal"]')
      await expect(modal).toBeVisible({ timeout: 5000 })
      
      const input = page.locator('[data-testid="quick-capture-input"]')
      await input.fill(capture)
      await page.keyboard.press('Meta+Enter')
      await expect(modal).not.toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(300)
    }

    // When: user opens quick capture again
    await page.keyboard.press('Meta+Shift+N')
    const modal = page.locator('[data-testid="quick-capture-modal"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    const input = page.locator('[data-testid="quick-capture-input"]')

    // And: presses ArrowUp
    await page.keyboard.press('ArrowUp')

    // Then: input shows "Third idea" (most recent)
    await expect(input).toHaveValue('Third idea', { timeout: 2000 })

    // When: user presses ArrowUp again
    await page.keyboard.press('ArrowUp')

    // Then: input shows "Second idea"
    await expect(input).toHaveValue('Second idea', { timeout: 2000 })

    // When: user presses ArrowDown
    await page.keyboard.press('ArrowDown')

    // Then: input shows "Third idea" again
    await expect(input).toHaveValue('Third idea', { timeout: 2000 })
  })
})
