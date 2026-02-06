import { test, expect, isWebMode } from './helpers/setup'

// ============================================================================
// HELPERS - Using state indicators instead of arbitrary timeouts
// ============================================================================

/**
 * Wait for app to be fully loaded
 */
async function waitForAppReady(page: any): Promise<void> {
  await page.waitForFunction(() => (window as any).__brio_notesLoaded === true, { timeout: 10000 })
}

/**
 * Wait for all save operations to complete
 */
async function waitForSaveComplete(page: any): Promise<void> {
  await page.waitForFunction(() => {
    const w = window as any
    return w.__brio_isSaving === false && w.__brio_titleSaving === false
  }, { timeout: 5000 })
}

/**
 * Force immediate save and wait for completion
 */
async function saveAndWait(page: any): Promise<void> {
  await page.evaluate(async () => {
    if ((window as any).__brio_saveNow) {
      await (window as any).__brio_saveNow()
    }
  })
  await waitForSaveComplete(page)
}

/**
 * Update note titles cache
 */
async function updateTitlesCache(page: any): Promise<void> {
  await page.evaluate(async () => {
    if ((window as any).__brio_updateNoteTitlesCache) {
      await (window as any).__brio_updateNoteTitlesCache()
    }
  })
}

/**
 * Create a note and wait for it to be saved
 */
async function createNoteAndWait(page: any, title: string): Promise<void> {
  // Create note directly via store API with the correct title
  await page.evaluate(async (noteTitle: string) => {
    interface WindowWithStore extends Window {
      __brio_store?: {
        createNote: (title: string) => Promise<string>
        selectNote: (id: string) => void
      }
    }
    const store = (window as WindowWithStore).__brio_store
    if (store) {
      const noteId = await store.createNote(noteTitle)
      store.selectNote(noteId)
    }
  }, title)
  
  // Wait for the note to appear in the UI
  await page.waitForSelector('[data-testid="note-title-input"]')
  
  // Small delay to ensure UI is ready
  await page.waitForTimeout(100)
  
  // Update titles cache for wikilink autocomplete
  await updateTitlesCache(page)
}

/**
 * Insert text into CodeMirror editor and wait for save
 */
async function insertInEditor(page: any, text: string): Promise<void> {
  await page.evaluate((t: string) => {
    const view = (window as any).__brio_editorView
    if (!view) throw new Error('EditorView not found')
    const { state } = view
    const pos = state.selection.main.head
    view.dispatch({
      changes: { from: pos, insert: t },
      selection: { anchor: pos + t.length }
    })
  }, text)
  
  await saveAndWait(page)
}

test.describe('US-009 Backlinks Panel @e2e @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for app to be ready
    await waitForAppReady(page)

    // Clear all data (Web mode only)
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
    })

    // Reload and wait for app to be ready again
    await page.reload()
    await waitForAppReady(page)
  })

  test('Scenario 1: Backlinks panel visible in layout', async ({ page }) => {
    // Given: a note with a backlink exists
    const editor = page.locator('.cm-content')
    
    // Create Target note
    await createNoteAndWait(page, 'Target')
    
    // Create Source note with link
    await createNoteAndWait(page, 'Source')
    await editor.click()
    await insertInEditor(page, 'Link to [[Target]]')
    
    // Open Target note
    const targetItem = page.locator('[data-testid="note-item"][data-note-title="Target"]')
    await targetItem.click()
    await waitForSaveComplete(page)

    // Then: backlinks panel is visible in the layout
    const backlinksPanel = page.locator('[data-testid="backlinks-panel"]')
    await expect(backlinksPanel).toBeVisible()

    // And: panel has a header with title
    const backlinksHeader = backlinksPanel.locator('.backlinks-header')
    await expect(backlinksHeader).toBeVisible()
    await expect(backlinksHeader).toContainText('Backlinks')
  })

  test('Scenario 2: Display backlinks with context', async ({ page }) => {
    // Given: "Target" note is linked from "Source 1" with context
    const editor = page.locator('.cm-content')

    // Create Target
    await createNoteAndWait(page, 'Target')

    // Create Source 1 with link and context
    await createNoteAndWait(page, 'Source 1')
    await editor.click()
    await insertInEditor(page, 'This is a link to [[Target]] in context')

    // When: user opens "Target" note
    const targetItem = page.locator('[data-testid="note-item"][data-note-title="Target"]')
    await targetItem.click()
    await waitForSaveComplete(page)

    // Then: backlinks panel shows the backlink
    const backlinksPanel = page.locator('[data-testid="backlinks-panel"]')
    await expect(backlinksPanel).toBeVisible()

    const backlinkItem = page.locator('[data-testid="backlink-item"]').filter({ hasText: 'Source 1' })
    await expect(backlinkItem).toBeVisible()

    // And: backlink shows the source note title
    await expect(backlinkItem).toContainText('Source 1')
  })

  test('Scenario 3: Click on backlink navigates to source note', async ({ page }) => {
    // Given: "Target" is linked from "Source 1"
    const editor = page.locator('.cm-content')
    const titleInput = page.locator('[data-testid="note-title-input"]')

    // Create Target
    await createNoteAndWait(page, 'Target')

    // Create Source 1 with link
    await createNoteAndWait(page, 'Source 1')
    await editor.click()
    await insertInEditor(page, 'Link to [[Target]]')

    // Open Target note
    const targetItem = page.locator('[data-testid="note-item"][data-note-title="Target"]')
    await targetItem.click()
    await waitForSaveComplete(page)

    // When: user clicks on backlink
    const backlinkItem = page.locator('[data-testid="backlink-item"]').filter({ hasText: 'Source 1' })
    await backlinkItem.click()
    await waitForSaveComplete(page)

    // Then: editor displays "Source 1"
    await expect(titleInput).toHaveValue('Source 1')
    await expect(editor).toContainText('Link to')
    
    // And: wikilink to Target is visible
    const wikilink = page.locator('[data-wikilink="Target"]')
    await expect(wikilink).toBeVisible()
  })

  test('Scenario 4: Update backlinks when changing notes', async ({ page }) => {
    test.skip(isWebMode, 'Backlink count affected by test isolation in web mode')
    
    // Given: "Target A" has 1 backlink, "Target B" has 2 backlinks
    const editor = page.locator('.cm-content')

    // Create Target A
    await createNoteAndWait(page, 'Target A')

    // Create Target B
    await createNoteAndWait(page, 'Target B')

    // Create Source 1 linking to Target A
    await createNoteAndWait(page, 'Source 1')
    await editor.click()
    await insertInEditor(page, 'Link to [[Target A]]')

    // Create Source 2 linking to Target B
    await createNoteAndWait(page, 'Source 2')
    await editor.click()
    await insertInEditor(page, 'Link to [[Target B]]')

    // Create Source 3 also linking to Target B
    await createNoteAndWait(page, 'Source 3')
    await editor.click()
    await insertInEditor(page, 'Another link to [[Target B]]')

    // When: user opens "Target A"
    const targetAItem = page.locator('[data-testid="note-item"][data-note-title="Target A"]')
    await targetAItem.click()
    await waitForSaveComplete(page)

    // Then: backlinks panel shows 1 backlink
    const backlinksCount = page.locator('[data-testid="backlinks-count"]')
    await expect(backlinksCount).toHaveText('1')

    const backlinkItems = page.locator('[data-testid="backlink-item"]')
    await expect(backlinkItems).toHaveCount(1)

    // When: user switches to "Target B"
    const targetBItem = page.locator('[data-testid="note-item"][data-note-title="Target B"]')
    await targetBItem.click()
    await waitForSaveComplete(page)

    // Then: backlinks panel shows 2 backlinks
    await expect(backlinksCount).toHaveText('2')
    await expect(backlinkItems).toHaveCount(2)
  })

  test('Scenario 5: Display backlinks count', async ({ page }) => {
    // Given: "Target" is linked from 3 different notes
    const editor = page.locator('.cm-content')

    // Create Target
    await createNoteAndWait(page, 'Target')

    // Create 3 source notes with links
    for (let i = 1; i <= 3; i++) {
      await createNoteAndWait(page, `Source ${i}`)
      await editor.click()
      await insertInEditor(page, `Link to [[Target]]`)
    }

    // When: user opens "Target" note
    const targetItem = page.locator('[data-testid="note-item"][data-note-title="Target"]')
    await targetItem.click()
    await waitForSaveComplete(page)

    // Then: backlinks count shows "3"
    const backlinksCount = page.locator('[data-testid="backlinks-count"]')
    await expect(backlinksCount).toHaveText('3')

    // And: panel header shows "Backlinks (3)"
    const backlinksHeader = page.locator('.backlinks-header')
    await expect(backlinksHeader).toContainText('Backlinks (3)')
  })

  test('Scenario 6: Panel hidden when no backlinks', async ({ page }) => {
    // Given: a note exists with no backlinks
    await createNoteAndWait(page, 'Lonely Note')

    // Then: backlinks panel is not visible
    const backlinksPanel = page.locator('[data-testid="backlinks-panel"]')
    await expect(backlinksPanel).not.toBeVisible()
  })
})
