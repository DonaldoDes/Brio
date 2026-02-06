import { test, expect } from './helpers/setup'

test.describe('BUG-016 Note list ARIA roles @e2e @accessibility', () => {
  test.beforeEach(async ({ page }) => {
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
    await page.waitForTimeout(500)

    // Recharger la page pour réinitialiser l'état
    await page.reload()
    await page.waitForSelector('[data-testid="notes-list"]', { timeout: 10000 })
    await page.waitForTimeout(500)
  })

  test('Scenario 1: Note list container should have role="list"', async ({ page }) => {
    // Given: app is open
    await page.waitForSelector('[data-testid="notes-list"]')

    // When: user views the note list
    const notesList = page.locator('[data-testid="notes-list"]')

    // Then: the container should have role="list"
    const role = await notesList.getAttribute('role')
    expect(role).toBe('list')
  })

  test('Scenario 2: Each note item should have role="listitem"', async ({ page }) => {
    // Given: app has at least one note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()
    await page.waitForTimeout(500)

    // Create a second note
    await newNoteButton.click()
    await page.waitForTimeout(500)

    // When: user views the note list
    const noteItems = page.locator('[data-testid="note-item"]')
    const count = await noteItems.count()
    expect(count).toBeGreaterThanOrEqual(2)

    // Then: each note item should have role="listitem"
    for (let i = 0; i < count; i++) {
      const item = noteItems.nth(i)
      const role = await item.getAttribute('role')
      expect(role).toBe('listitem')
    }
  })

  test('Scenario 3: Selected note item should have aria-selected="true"', async ({ page }) => {
    // Given: app has multiple notes
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()
    await page.waitForTimeout(500)
    await newNoteButton.click()
    await page.waitForTimeout(500)

    // When: user selects a note
    const noteItems = page.locator('[data-testid="note-item"]')
    const firstNote = noteItems.first()
    await firstNote.click()
    await page.waitForTimeout(300)

    // Then: the selected note should have aria-selected="true"
    const ariaSelected = await firstNote.getAttribute('aria-selected')
    expect(ariaSelected).toBe('true')

    // And: other notes should have aria-selected="false"
    const secondNote = noteItems.nth(1)
    const secondAriaSelected = await secondNote.getAttribute('aria-selected')
    expect(secondAriaSelected).toBe('false')
  })

  test('Scenario 4: Each note item should have descriptive aria-label', async ({ page }) => {
    // Given: app has a note with a title
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()
    await page.waitForTimeout(500)

    // Set a custom title
    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.fill('My Test Note')
    
    // Trigger blur to save the title
    await page.locator('.markdown-editor').click()
    await page.waitForTimeout(1000) // Wait for title to be saved and reflected in the list

    // When: user views the note list
    const noteItem = page.locator('[data-testid="note-item"]').filter({ hasText: 'My Test Note' })
    await expect(noteItem).toBeVisible({ timeout: 10000 })

    // Then: the note item should have an aria-label with the note title
    const ariaLabel = await noteItem.getAttribute('aria-label')
    expect(ariaLabel).toContain('My Test Note')
    expect(ariaLabel).toMatch(/Note:.*My Test Note/)
  })

  test('Scenario 5: Empty state should not have list roles', async ({ page }) => {
    // Given: app has no notes
    await page.waitForSelector('[data-testid="notes-list"]')

    // When: user views the empty note list
    const emptyState = page.locator('.empty-state')
    await expect(emptyState).toBeVisible()

    // Then: the empty state should not have role="listitem"
    const role = await emptyState.getAttribute('role')
    expect(role).toBeNull()
  })
})
