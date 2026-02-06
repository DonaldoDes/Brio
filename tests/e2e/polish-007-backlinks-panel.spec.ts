import { test, expect } from './helpers/setup'

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

test.describe('POLISH-007 Backlinks Panel Polish @e2e @polish', () => {
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

  test('Scenario 1: Title "Backlinks" is not uppercase', async ({ page }) => {
    // Given: a note exists with backlinks
    const editor = page.locator('.cm-content')

    // Create Target note
    await createNoteAndWait(page, 'Target')

    // Create Source note with link
    await createNoteAndWait(page, 'Source')
    await editor.click()
    await insertInEditor(page, 'Link to [[Target]]')

    // When: user opens Target note
    const targetItem = page.locator('[data-testid="note-item"][data-note-title="Target"]')
    await targetItem.click()
    await waitForSaveComplete(page)

    // Then: backlinks header is visible
    const backlinksHeader = page.locator('.backlinks-header')
    await expect(backlinksHeader).toBeVisible()

    // And: title uses normal case "Backlinks", not "BACKLINKS"
    // Check computed style to ensure text-transform is not uppercase
    const textTransform = await backlinksHeader.evaluate((el) => {
      return window.getComputedStyle(el).textTransform
    })
    expect(textTransform).not.toBe('uppercase')

    // And: text content contains "Backlinks" (not "BACKLINKS")
    const headerText = await backlinksHeader.textContent()
    expect(headerText).toMatch(/^Backlinks/)
  })

  test('Scenario 2: Panel is hidden when no backlinks', async ({ page }) => {
    // Given: a note exists with no backlinks
    await createNoteAndWait(page, 'Lonely Note')

    // Then: backlinks panel is not visible
    const backlinksPanel = page.locator('[data-testid="backlinks-panel"]')
    await expect(backlinksPanel).not.toBeVisible()
  })

  test('Scenario 3: Panel appears when backlinks are added', async ({ page }) => {
    // Given: a note exists with no backlinks
    const editor = page.locator('.cm-content')
    await createNoteAndWait(page, 'Target')

    // Then: backlinks panel is hidden
    const backlinksPanel = page.locator('[data-testid="backlinks-panel"]')
    await expect(backlinksPanel).not.toBeVisible()

    // When: a backlink is created
    await createNoteAndWait(page, 'Source')
    await editor.click()
    await insertInEditor(page, 'Link to [[Target]]')

    // And: user opens Target note
    const targetItem = page.locator('[data-testid="note-item"][data-note-title="Target"]')
    await targetItem.click()
    await waitForSaveComplete(page)

    // Then: backlinks panel becomes visible
    await expect(backlinksPanel).toBeVisible()

    // And: shows the backlink
    const backlinkItem = page.locator('[data-testid="backlink-item"]').filter({ hasText: 'Source' })
    await expect(backlinkItem).toBeVisible()
  })
})
