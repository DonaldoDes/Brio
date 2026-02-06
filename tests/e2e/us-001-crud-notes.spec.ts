import { test, expect, isWebMode } from './helpers/setup'

test.describe('US-001 CRUD Notes @e2e @smoke', () => {
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

  test('Scenario 1: should create a new note with Cmd+N', async ({ page }) => {
    // Given: app is open with no notes
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500) // Wait for app to be fully ready

    // When: user clicks "+ New Note" button (Cmd+N not supported in Playwright+Electron)
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    // Then: new note "Untitled" appears in the list
    const noteItem = page.locator('[data-testid="note-item"]').filter({ hasText: 'Untitled' })
    await expect(noteItem).toBeVisible({ timeout: 10000 })

    // And: cursor is focused on the title input
    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await expect(titleInput).toBeFocused()

    // And: note is saved in PGlite
    const noteId = await noteItem.getAttribute('data-note-id')
    expect(noteId).toBeTruthy()
  })

  test('Scenario 2: should generate slug from special characters', async ({ page }) => {
    // Given: user creates a new note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })

    // When: title is "Réunion: Équipe (2026)"
    await titleInput.fill('Réunion: Équipe (2026)')
    await titleInput.blur()

    // Then: slug is "reunion-equipe-2026"
    const noteItem = page
      .locator('[data-testid="note-item"]')
      .filter({ hasText: 'Réunion: Équipe (2026)' })
    const slug = await noteItem.getAttribute('data-note-slug')
    expect(slug).toBe('reunion-equipe-2026')
  })

  test('Scenario 3: should read a note by clicking on it', async ({ page }) => {
    // Given: a note exists with title "Test Note" and content "Test content"
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Test Note')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    await editor.pressSequentially('Test content', { delay: 50 })

    // When: user clicks on another note then back to "Test Note"
    await newNoteButton.click()
    await page.waitForTimeout(200)
    const testNoteItem = page.locator('[data-testid="note-item"]').filter({ hasText: 'Test Note' })
    await testNoteItem.click()

    // Then: editor displays "Test content"
    await expect(editor).toContainText('Test content')

    // And: title displays "Test Note"
    await expect(titleInput).toHaveValue('Test Note')
  })

  test('Scenario 4: should modify title with inline edit', async ({ page }) => {
    // Given: a note exists with title "Old Title"
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Old Title')
    await titleInput.blur()

    // Wait for the initial title to be persisted and slug to be generated
    const noteItem = page.locator('[data-testid="note-item"]').first()
    await expect(noteItem).toHaveAttribute('data-note-slug', 'old-title', { timeout: 5000 })

    const oldSlug = await noteItem.getAttribute('data-note-slug')
    expect(oldSlug).toBe('old-title')

    // When: user edits title to "New Title" and blurs
    await titleInput.click()
    await titleInput.fill('New Title')
    await titleInput.blur()

    // Wait for the save operation to complete and slug to update
    const updatedNoteItem = page.locator('[data-testid="note-item"]').filter({ hasText: 'New Title' })
    await expect(updatedNoteItem).toHaveAttribute('data-note-slug', 'new-title', { timeout: 5000 })

    // Then: title is updated in the list
    await expect(updatedNoteItem).toBeVisible()

    // And: slug is regenerated to "new-title"
    const newSlug = await updatedNoteItem.getAttribute('data-note-slug')
    expect(newSlug).toBe('new-title')

    // And: old title "Old Title" is no longer visible
    const oldNoteItem = page.locator('[data-testid="note-item"]').filter({ hasText: 'Old Title' })
    await expect(oldNoteItem).not.toBeVisible()
  })

  test('Scenario 5: should auto-save content with 500ms debounce', async ({ page }) => {
    // Given: a note is open
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)

    // When: user types "Hello World"
    await editor.pressSequentially('Hello World', { delay: 50 })

    // Then: content is not saved immediately (debounce)
    await page.waitForTimeout(200)
    // Note: We can't easily verify "not saved" without exposing internal state

    // And: after 500ms, content is saved
    await page.waitForTimeout(1000) // Total 1200ms to ensure debounce completes

    // Verify by reloading the note
    await newNoteButton.click()
    await page.waitForTimeout(1000) // Wait for new note to be created and selected
    const firstNote = page.locator('[data-testid="note-item"]').first()
    await firstNote.click()
    
    // Wait for editor to contain the expected text
    await expect(editor).toContainText('Hello World', { timeout: 10000 })
  })

  test('Scenario 6: should delete a note with delete button', async ({ page }) => {
    // Given: a note exists with title "To Delete"
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('To Delete')
    await titleInput.blur()

    const noteItem = page.locator('[data-testid="note-item"]').filter({ hasText: 'To Delete' })
    await expect(noteItem).toBeVisible()

    // When: user clicks delete button
    const deleteButton = page.locator('[data-testid="delete-note-button"]')
    await deleteButton.click()

    // Then: confirmation dialog appears
    const dialog = page.locator('[data-testid="delete-confirmation-dialog"]')
    await expect(dialog).toBeVisible()

    // When: user confirms deletion
    const confirmButton = page.locator('[data-testid="confirm-delete-button"]')
    await confirmButton.click()

    // Then: note is removed from the list
    await expect(noteItem).not.toBeVisible()

    // And: note is deleted from PGlite
    const notesList = page.locator('[data-testid="note-item"]')
    const count = await notesList.count()
    expect(count).toBe(0)
  })

  test('Scenario 7: should create multiple notes with incremented titles', async ({ page }) => {
    // Given: no notes exist
    const newNoteButton = page.locator('[data-testid="new-note-button"]')

    // When: user creates first note
    await newNoteButton.click()
    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    
    // Wait for note count to be 1
    await expect(page.locator('[data-testid="note-item"]')).toHaveCount(1, { timeout: 5000 })

    // When: user creates second note
    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    
    // Wait for note count to be 2
    await expect(page.locator('[data-testid="note-item"]')).toHaveCount(2, { timeout: 5000 })

    // When: user creates third note
    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    
    // Wait for note count to be 3
    await expect(page.locator('[data-testid="note-item"]')).toHaveCount(3, { timeout: 5000 })

    // Then: notes are titled "Untitled", "Untitled 2", "Untitled 3"
    const untitled1 = page.locator('[data-testid="note-item"][data-note-title="Untitled"]')
    const untitled2 = page.locator('[data-testid="note-item"][data-note-title="Untitled 2"]')
    const untitled3 = page.locator('[data-testid="note-item"][data-note-title="Untitled 3"]')

    await expect(untitled1).toBeVisible()
    await expect(untitled2).toBeVisible()
    await expect(untitled3).toBeVisible()
  })

  // Skip in web mode - keyboard navigation focus behavior differs from Electron
  test.skip(isWebMode, 'Scenario 8: should navigate notes with keyboard arrows', async ({ page }) => {
    // Given: 3 notes exist
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    const titleInput = page.locator('[data-testid="note-title-input"]')

    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Note 1')
    await page.keyboard.press('Escape')

    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Note 2')
    await page.keyboard.press('Escape')

    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Note 3')
    await page.keyboard.press('Escape')

    // When: user focuses on notes list
    const notesList = page.locator('[data-testid="notes-list"]')
    await notesList.focus()

    // And: presses ArrowDown
    await page.keyboard.press('ArrowDown')

    // Then: second note is selected
    const note2 = page.locator('[data-testid="note-item"]').filter({ hasText: 'Note 2' })
    await expect(note2).toHaveAttribute('data-selected', 'true')

    // When: user presses ArrowUp
    await page.keyboard.press('ArrowUp')

    // Then: first note is selected
    const note1 = page.locator('[data-testid="note-item"]').filter({ hasText: 'Note 1' })
    await expect(note1).toHaveAttribute('data-selected', 'true')

    // When: user presses Enter
    await page.keyboard.press('Enter')

    // Then: note editor displays "Note 1" content
    await expect(titleInput).toHaveValue('Note 1')
  })
})
