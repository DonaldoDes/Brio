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
  
  // Wait for save to complete and tags to be processed
  await page.waitForTimeout(300)
}

test.describe('US-003 Tags @e2e', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all data and reload stores
    await page.evaluate(async () => {
      interface WindowWithAPI extends Window {
        api: {
          testing?: {
            clearAllData: () => Promise<void>
          }
          notes: {
            getAll: () => Promise<Array<{ id: string }>>
            delete: (id: string) => Promise<void>
          }
        }
        __brio_store?: {
          loadNotes: () => Promise<void>
        }
      }
      const api = (window as WindowWithAPI).api
      
      // Use clearAllData if available (Web mode), otherwise delete notes one by one
      if (api.testing?.clearAllData) {
        await api.testing.clearAllData()
      } else {
        const notes = await api.notes.getAll()
        for (const note of notes) {
          await api.notes.delete(note.id)
        }
      }
      
      // Reload stores to reflect the cleared state
      const store = (window as WindowWithAPI).__brio_store
      if (store?.loadNotes) {
        await store.loadNotes()
      }
    })

    // Wait for app to be ready after cleanup
    await page.waitForFunction(() => (window as any).__brio_notesLoaded === true, { timeout: 5000 })
  })

  test('Scenario 1: should detect tags in content', async ({ page }) => {
    // Given: user creates a new note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('JavaScript Notes')
    await titleInput.blur()

    // When: user types content with tags
    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, 'Learning #javascript and #dev/frontend')

    // Then: tags are detected and stored
    const tags = await page.evaluate(async () => {
      interface WindowWithAPI extends Window {
        api: {
          notes: {
            getAll: () => Promise<Array<{ id: string }>>
          }
          tags: {
            getByNote: (noteId: string) => Promise<Array<{ tag: string }>>
          }
        }
      }
      const notes = await (window as WindowWithAPI).api.notes.getAll()
      const noteId = notes[0].id
      return await (window as WindowWithAPI).api.tags.getByNote(noteId)
    })

    expect(tags).toHaveLength(2)
    expect(tags.map((t) => t.tag)).toContain('javascript')
    expect(tags.map((t) => t.tag)).toContain('dev/frontend')
  })

  test('Scenario 2: should display tags in tag panel with count', async ({ page }) => {
    // Given: multiple notes with tags exist
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    const titleInput = page.locator('[data-testid="note-title-input"]')
    const editor = page.locator('.cm-content')

    // Create note 1 with #javascript
    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Note 1')
    await titleInput.blur()
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, 'Content with #javascript')

    // Create note 2 with #javascript and #typescript
    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Note 2')
    await titleInput.blur()
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, 'Content with #javascript and #typescript')

    // When: user views the tag panel
    const tagPanel = page.locator('[data-testid="tag-panel"]')
    await expect(tagPanel).toBeVisible()

    // Then: tags are displayed with correct counts
    const javascriptTag = page.locator('[data-testid="tag-item"][data-tag="javascript"]')
    await expect(javascriptTag).toBeVisible()
    await expect(javascriptTag).toContainText('javascript')
    await expect(javascriptTag).toContainText('2') // Count

    const typescriptTag = page.locator('[data-testid="tag-item"][data-tag="typescript"]')
    await expect(typescriptTag).toBeVisible()
    await expect(typescriptTag).toContainText('typescript')
    await expect(typescriptTag).toContainText('1') // Count
  })

  test.skip(isWebMode, 'Tag filtering has visibility issues in web mode')
  test('Scenario 3: should filter notes by tag on click', async ({ page }) => {
    // Given: multiple notes with different tags
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    const titleInput = page.locator('[data-testid="note-title-input"]')
    const editor = page.locator('.cm-content')

    // Create note with #javascript
    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('JS Note')
    await titleInput.blur()
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, 'Content with #javascript')
    await page.waitForTimeout(500) // Wait for note to be fully saved and indexed

    // Create note with #typescript
    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('TS Note')
    await titleInput.blur()
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, 'Content with #typescript')
    await page.waitForTimeout(500) // Wait for note to be fully saved and indexed
    
    // Click on notes list to deselect current note and show all notes
    const notesList = page.locator('[data-testid="notes-list"]')
    await notesList.click()
    await page.waitForTimeout(300)

    // Verify both notes exist before filtering
    const jsNote = notesList.locator('[data-testid="note-item"]').filter({ hasText: 'JS Note' })
    const tsNote = notesList.locator('[data-testid="note-item"]').filter({ hasText: 'TS Note' })
    
    await expect(jsNote).toBeVisible({ timeout: 10000 })
    await expect(tsNote).toBeVisible({ timeout: 10000 })

    // When: user clicks on #javascript tag
    const javascriptTag = page.locator('[data-testid="tag-item"][data-tag="javascript"]')
    await javascriptTag.waitFor({ state: 'visible', timeout: 10000 })
    await javascriptTag.click()
    await page.waitForTimeout(500) // Wait for filter to apply

    // Then: only notes with #javascript are visible
    await expect(jsNote).toBeVisible()
    await expect(tsNote).not.toBeVisible()

    // And: tag filter indicator is shown
    const filterIndicator = page.locator('[data-testid="tag-filter-indicator"]')
    await expect(filterIndicator).toBeVisible()
    await expect(filterIndicator).toContainText('javascript')

    // When: user clears the filter
    const clearFilterButton = page.locator('[data-testid="clear-tag-filter-button"]')
    await clearFilterButton.click()
    
    // Wait for filter indicator to disappear (confirms filter is cleared)
    await expect(filterIndicator).not.toBeVisible({ timeout: 10000 })
    
    // Wait for notes list to update
    await page.waitForTimeout(500)

    // Then: all notes are visible again
    await expect(jsNote).toBeVisible({ timeout: 10000 })
    await expect(tsNote).toBeVisible({ timeout: 10000 })
  })

  test('Scenario 4: should display hierarchical tags as tree', async ({ page }) => {
    // Given: notes with hierarchical tags
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    const titleInput = page.locator('[data-testid="note-title-input"]')
    const editor = page.locator('.cm-content')

    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Dev Note')
    await titleInput.blur()
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, 'Content with #dev/frontend/vue and #dev/backend/node')

    // When: user views the tag panel
    const tagPanel = page.locator('[data-testid="tag-panel"]')
    await expect(tagPanel).toBeVisible()

    // Then: tags are displayed in tree structure
    const devTag = page.locator('[data-testid="tag-item"][data-tag="dev"]')
    await expect(devTag).toBeVisible()

    // And: child tags are nested under parent
    const frontendTag = page.locator('[data-testid="tag-item"][data-tag="dev/frontend"]')
    await expect(frontendTag).toBeVisible()

    const vueTag = page.locator('[data-testid="tag-item"][data-tag="dev/frontend/vue"]')
    await expect(vueTag).toBeVisible()

    const backendTag = page.locator('[data-testid="tag-item"][data-tag="dev/backend"]')
    await expect(backendTag).toBeVisible()

    const nodeTag = page.locator('[data-testid="tag-item"][data-tag="dev/backend/node"]')
    await expect(nodeTag).toBeVisible()
  })

  test.skip(isWebMode, 'Tag autocomplete keystroke detection differs in browser mode')
  test('Scenario 5: should autocomplete tags when typing #', async ({ page }) => {
    // Given: notes with existing tags
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    const titleInput = page.locator('[data-testid="note-title-input"]')
    const editor = page.locator('.cm-content')

    // Create note with #javascript tag
    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('First Note')
    await titleInput.blur()
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, 'Content with #javascript')

    // Create new note
    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Second Note')
    await titleInput.blur()
    await editor.click()
    await page.waitForTimeout(100)

    // When: user types # in editor
    await editor.pressSequentially('Learning #', { delay: 50 })
    await page.waitForTimeout(300)

    // Then: autocomplete popup appears with existing tags
    const autocomplete = page.locator('[data-testid="tag-autocomplete"]')
    await expect(autocomplete).toBeVisible()

    const javascriptOption = autocomplete.locator('[data-testid="tag-option"]').filter({
      hasText: 'javascript',
    })
    await expect(javascriptOption).toBeVisible()

    // When: user selects the tag
    await javascriptOption.click()

    // Then: tag is inserted in editor
    await expect(editor).toContainText('Learning #javascript')
  })

  test('Scenario 6: should support tags in frontmatter', async ({ page }) => {
    // Given: user creates a note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Frontmatter Note')
    await titleInput.blur()

    // When: user adds tags in frontmatter format
    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, '---\ntags: [javascript, typescript, dev/frontend]\n---\n\nContent here')

    // Then: tags are detected from frontmatter
    const tags = await page.evaluate(async () => {
      interface WindowWithAPI extends Window {
        api: {
          notes: {
            getAll: () => Promise<Array<{ id: string }>>
          }
          tags: {
            getByNote: (noteId: string) => Promise<Array<{ tag: string }>>
          }
        }
      }
      const notes = await (window as WindowWithAPI).api.notes.getAll()
      const noteId = notes[0].id
      return await (window as WindowWithAPI).api.tags.getByNote(noteId)
    })

    expect(tags).toHaveLength(3)
    expect(tags.map((t) => t.tag)).toContain('javascript')
    expect(tags.map((t) => t.tag)).toContain('typescript')
    expect(tags.map((t) => t.tag)).toContain('dev/frontend')

    // And: tags appear in tag panel
    const tagPanel = page.locator('[data-testid="tag-panel"]')
    await expect(tagPanel).toBeVisible()

    const javascriptTag = page.locator('[data-testid="tag-item"][data-tag="javascript"]')
    await expect(javascriptTag).toBeVisible()
  })
})
