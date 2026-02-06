import { test, expect, isWebMode } from './helpers/setup'

/**
 * Helper to set editor content reliably in web mode
 * Uses CodeMirror's dispatch API instead of pressSequentially to avoid garbled content
 */
async function setEditorContent(page: any, content: string) {
  await page.evaluate((text: string) => {
    const view = (window as any).__brio_editorView
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text }
      })
    }
  }, content)
  
  // Force save to ensure content is persisted
  await page.evaluate(async () => {
    await (window as any).__brio_saveNow()
  })
}

test.describe('CodeMirror Editor @e2e', () => {
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

  test('should display CodeMirror editor', async ({ page }) => {
    // Given: user creates a new note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    // Then: CodeMirror editor is visible
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await expect(editor).toBeVisible({ timeout: 5000 })

    // And: CodeMirror container has the correct class
    const cmEditor = page.locator('.cm-editor')
    await expect(cmEditor).toBeVisible()
  })

  test('should type text in CodeMirror editor', async ({ page }) => {
    // Given: a note is open
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })

    // When: user types in the editor using pressSequentially
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await page.waitForTimeout(100)
    await cmContent.pressSequentially('Hello CodeMirror', { delay: 50 })

    // Then: text is visible in the editor
    await expect(cmContent).toContainText('Hello CodeMirror')
  })

  test('should save content typed in CodeMirror', async ({ page }) => {
    // Given: user creates a note and types content
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('CodeMirror Test')
    await titleInput.blur()

    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await page.waitForTimeout(100)
    
    // Use setEditorContent for reliable content insertion (especially in web mode)
    await setEditorContent(page, 'This is a test note')

    // Wait for auto-save (500ms debounce + buffer)
    await page.waitForTimeout(700)

    // When: user switches to another note and back
    await newNoteButton.click()
    await page.waitForTimeout(200)

    const testNote = page.locator('[data-testid="note-item"]').filter({ hasText: 'CodeMirror Test' })
    await testNote.click()

    // Then: content is preserved
    await expect(cmContent).toContainText('This is a test note')
  })

  test('should support undo/redo with Cmd+Z/Cmd+Shift+Z', async ({ page }) => {
    // Given: user types content
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await page.waitForTimeout(100)
    await cmContent.pressSequentially('First line', { delay: 50 })
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Second line', { delay: 50 })

    // When: user presses Cmd+Z (undo)
    await page.keyboard.press('Meta+z')

    // Then: "Second line" is removed
    await expect(cmContent).not.toContainText('Second line')
    await expect(cmContent).toContainText('First line')

    // When: user presses Cmd+Shift+Z (redo)
    await page.keyboard.press('Meta+Shift+z')

    // Then: "Second line" is restored
    await expect(cmContent).toContainText('Second line')
  })
})
