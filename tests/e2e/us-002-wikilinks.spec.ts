import { test, expect } from './electron'

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

test.describe('US-002 Wikilinks @e2e @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for app to be ready
    try {
      await waitForAppReady(page)
    } catch (error) {
      console.error('[Test] waitForAppReady failed, taking screenshot')
      await page.screenshot({ path: 'test-failure-screenshot.png' })
      
      // Check window properties
      const debugInfo = await page.evaluate(() => {
        return {
          brio_notesLoaded: (window as any).__brio_notesLoaded,
          brio_isLoading: (window as any).__brio_isLoading,
          hasApi: typeof (window as any).api !== 'undefined',
          apiKeys: (window as any).api ? Object.keys((window as any).api) : []
        }
      })
      console.error('[Test] Debug info:', JSON.stringify(debugInfo, null, 2))
      throw error
    }

    // Delete all existing notes via API
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

    // Reload and wait for app to be ready again
    await page.reload()
    await waitForAppReady(page)
  })

  test('Scenario 1: should create wikilink to existing note', async ({ page }) => {
    // Given: two notes exist "Source Note" and "Note B"
    await createNoteAndWait(page, 'Source Note')
    await createNoteAndWait(page, 'Note B')

    // When: user types "[[Source Note]]" in Note B
    const editor = page.locator('.cm-content')
    await editor.click()
    await insertInEditor(page, 'Link to [[Source Note]] here')

    // Then: wikilink is rendered as clickable link
    const wikilink = page.locator('[data-wikilink="Source Note"]')
    await expect(wikilink).toBeVisible()
    await expect(wikilink).toHaveText('Source Note')

    // And: link is styled as blue with underline on hover
    const linkColor = await wikilink.evaluate((el) => getComputedStyle(el).color)
    expect(linkColor).toContain('59, 130, 246') // rgb(59, 130, 246) = #3B82F6
  })

  test('Scenario 2: should create note on-the-fly for non-existent wikilink', async ({ page }) => {
    // Given: a note exists with content "[[New Note]]"
    await createNoteAndWait(page, 'Source Note')

    const editor = page.locator('.cm-content')
    await editor.click()
    await insertInEditor(page, 'Link to [[New Note]]')

    // When: user clicks on the wikilink
    const wikilink = page.locator('[data-wikilink="New Note"]')
    await wikilink.click()
    await waitForSaveComplete(page)

    // Then: new note "New Note" is created
    const newNoteItem = page.locator('[data-testid="note-item"]').filter({ hasText: 'New Note' })
    await expect(newNoteItem).toBeVisible()

    // And: editor displays the new note
    const titleInput = page.locator('[data-testid="note-title-input"]')
    await expect(titleInput).toHaveValue('New Note')

    // And: cursor is in the editor
    await expect(editor).toBeFocused()
  })

  test('Scenario 3: should navigate to note via wikilink click', async ({ page }) => {
    // Given: two notes exist with wikilink between them
    const titleInput = page.locator('[data-testid="note-title-input"]')
    const editor = page.locator('.cm-content')

    // Create Target Note with content
    await createNoteAndWait(page, 'Target Note')
    await editor.click()
    await insertInEditor(page, 'Target content')

    // Create Source Note with wikilink
    await createNoteAndWait(page, 'Source Note')
    await editor.click()
    await insertInEditor(page, 'Link: [[Target Note]]')

    // When: user clicks on wikilink
    const wikilink = page.locator('[data-wikilink="Target Note"]')
    await wikilink.click()
    await waitForSaveComplete(page)

    // Then: editor displays "Target Note"
    await expect(titleInput).toHaveValue('Target Note')
    await expect(editor).toContainText('Target content')
  })

  test('Scenario 4: should show autocomplete after typing [[', async ({ page }) => {
    // Given: notes "Apple", "Banana", "Cherry" exist
    for (const title of ['Apple', 'Banana', 'Cherry']) {
      await createNoteAndWait(page, title)
    }

    // Create new note for testing autocomplete
    await createNoteAndWait(page, 'Test Note')
    const editor = page.locator('.cm-content')
    await editor.click()

    // When: user types "[[" in editor
    await page.evaluate(() => {
      const view = (window as any).__brio_editorView
      if (!view) throw new Error('EditorView not found')
      const { state } = view
      const pos = state.selection.main.head
      view.dispatch({
        changes: { from: pos, insert: '[[' },
        selection: { anchor: pos + 2 }
      })
    })
    
    // Wait for autocomplete to appear (300ms is the debounce time)
    await page.waitForTimeout(300)

    // Then: autocomplete popup appears
    const autocomplete = page.locator('[data-testid="wikilink-autocomplete"]')
    await expect(autocomplete).toBeVisible({ timeout: 2000 })

    // And: shows all notes (Apple, Banana, Cherry)
    await expect(autocomplete).toContainText('Apple')
    await expect(autocomplete).toContainText('Banana')
    await expect(autocomplete).toContainText('Cherry')

    // And: max 8 items visible with scroll if more
    const items = page.locator('[data-testid="autocomplete-item"]')
    const count = await items.count()
    expect(count).toBeLessThanOrEqual(8)
  })

  test('Scenario 5: should support wikilinks with alias [[Note|Alias]]', async ({ page }) => {
    // Given: note "Long Technical Name" exists
    await createNoteAndWait(page, 'Long Technical Name')

    // Create note with alias wikilink
    await createNoteAndWait(page, 'Source')
    const editor = page.locator('.cm-content')
    await editor.click()

    // When: user types "[[Long Technical Name|Short]]"
    await insertInEditor(page, 'See [[Long Technical Name|Short]] for details')

    // Then: link displays "Short" (alias)
    const wikilink = page.locator('[data-wikilink="Long Technical Name"]')
    await expect(wikilink).toBeVisible()
    await expect(wikilink).toHaveText('Short')

    // And: clicking navigates to "Long Technical Name"
    await wikilink.click()
    await waitForSaveComplete(page)
    const titleInput = page.locator('[data-testid="note-title-input"]')
    await expect(titleInput).toHaveValue('Long Technical Name')
  })

  test('Scenario 6: should display backlinks panel', async ({ page }) => {
    // Given: "Target" note is linked from "Source 1" and "Source 2"
    const editor = page.locator('.cm-content')
    const titleInput = page.locator('[data-testid="note-title-input"]')

    // Create Target
    await createNoteAndWait(page, 'Target')

    // Create Source 1 with link
    await createNoteAndWait(page, 'Source 1')
    await editor.click()
    await insertInEditor(page, 'Link to [[Target]]')

    // Create Source 2 with link
    await createNoteAndWait(page, 'Source 2')
    await editor.click()
    await insertInEditor(page, 'Also links [[Target]]')

    // When: user opens "Target" note
    const targetItem = page.locator('[data-testid="note-item"]').filter({ hasText: 'Target' })
    await targetItem.click()
    await waitForSaveComplete(page)

    // Then: backlinks panel shows 2 backlinks
    const backlinksPanel = page.locator('[data-testid="backlinks-panel"]')
    await expect(backlinksPanel).toBeVisible()

    const backlink1 = page.locator('[data-testid="backlink-item"]').filter({ hasText: 'Source 1' })
    const backlink2 = page.locator('[data-testid="backlink-item"]').filter({ hasText: 'Source 2' })

    await expect(backlink1).toBeVisible()
    await expect(backlink2).toBeVisible()

    // And: clicking backlink navigates to source note
    await backlink1.click()
    await waitForSaveComplete(page)
    await expect(titleInput).toHaveValue('Source 1')
  })

  test('Scenario 7: should update all wikilinks when note is renamed', async ({ page }) => {
    // Given: "Old Name" is linked from "Source 1" and "Source 2"
    const titleInput = page.locator('[data-testid="note-title-input"]')
    const editor = page.locator('.cm-content')

    // Create target note
    await createNoteAndWait(page, 'Old Name')

    // Create source notes with links
    for (const source of ['Source 1', 'Source 2']) {
      await createNoteAndWait(page, source)
      await editor.click()
      await insertInEditor(page, `Link to [[Old Name]]`)
    }

    // When: user renames "Old Name" to "New Name"
    const oldNameItem = page.locator('[data-testid="note-item"]').filter({ hasText: 'Old Name' })
    await oldNameItem.click()
    await waitForSaveComplete(page)

    await titleInput.click()
    await titleInput.fill('New Name')
    await titleInput.blur()
    await waitForSaveComplete(page)
    await updateTitlesCache(page)

    // Then: all wikilinks are updated to "[[New Name]]"
    const source1Item = page.locator('[data-testid="note-item"]').filter({ hasText: 'Source 1' })
    await source1Item.click()
    await waitForSaveComplete(page)

    const wikilink1 = page.locator('[data-wikilink="New Name"]')
    await expect(wikilink1).toBeVisible()
    await expect(wikilink1).toHaveText('New Name')

    // Verify Source 2 as well
    const source2Item = page.locator('[data-testid="note-item"]').filter({ hasText: 'Source 2' })
    await source2Item.click()
    await waitForSaveComplete(page)

    const wikilink2 = page.locator('[data-wikilink="New Name"]')
    await expect(wikilink2).toBeVisible()
  })

  test('Scenario 8: should detect broken links when note is deleted', async ({ page }) => {
    // Given: "Target" is linked from "Source"
    const editor = page.locator('.cm-content')

    // Create Target
    await createNoteAndWait(page, 'Target')

    // Create Source with link
    await createNoteAndWait(page, 'Source')
    await editor.click()
    await insertInEditor(page, 'Link to [[Target]]')

    // When: user deletes "Target" note
    const targetItem = page.locator('[data-testid="note-item"]').filter({ hasText: 'Target' })
    await targetItem.click()
    await waitForSaveComplete(page)

    const deleteButton = page.locator('[data-testid="delete-note-button"]')
    await deleteButton.click()

    const confirmButton = page.locator('[data-testid="confirm-delete-button"]')
    await confirmButton.click()
    await waitForSaveComplete(page)

    // Then: wikilink in "Source" is styled as broken (red, dashed underline)
    const sourceItem = page.locator('[data-testid="note-item"]').filter({ hasText: 'Source' })
    await sourceItem.click()
    await waitForSaveComplete(page)

    const brokenLink = page.locator('[data-wikilink-broken="Target"]')
    await expect(brokenLink).toBeVisible()

    const linkColor = await brokenLink.evaluate((el) => getComputedStyle(el).color)
    expect(linkColor).toContain('239, 68, 68') // rgb(239, 68, 68) = #EF4444

    const borderStyle = await brokenLink.evaluate((el) => getComputedStyle(el).borderBottomStyle)
    expect(borderStyle).toBe('dashed')
  })

  test('Scenario 9: should support special characters in note titles', async ({ page }) => {
    // Given: note "Réunion: Équipe (2026)" exists
    const titleInput = page.locator('[data-testid="note-title-input"]')
    const editor = page.locator('.cm-content')

    await createNoteAndWait(page, 'Réunion: Équipe (2026)')

    // Create source note
    await createNoteAndWait(page, 'Source')
    await editor.click()

    // When: user types "[[Réunion: Équipe (2026)]]"
    await insertInEditor(page, 'See [[Réunion: Équipe (2026)]]')

    // Then: wikilink is created correctly
    const wikilink = page.locator('[data-wikilink="Réunion: Équipe (2026)"]')
    await expect(wikilink).toBeVisible()

    // And: clicking navigates to the note
    await wikilink.click()
    await waitForSaveComplete(page)
    await expect(titleInput).toHaveValue('Réunion: Équipe (2026)')
  })

  test('Scenario 10: should navigate autocomplete with keyboard', async ({ page }) => {
    // Given: notes "Alpha", "Beta", "Gamma" exist
    for (const title of ['Alpha', 'Beta', 'Gamma']) {
      await createNoteAndWait(page, title)
    }

    // Create test note
    await createNoteAndWait(page, 'Test')
    const editor = page.locator('.cm-content')
    await editor.click()

    // When: user types "[[" and autocomplete appears
    await page.evaluate(() => {
      const view = (window as any).__brio_editorView
      if (!view) throw new Error('EditorView not found')
      const { state } = view
      const pos = state.selection.main.head
      view.dispatch({
        changes: { from: pos, insert: '[[' },
        selection: { anchor: pos + 2 }
      })
    })
    await page.waitForTimeout(300) // Debounce time for autocomplete

    const autocomplete = page.locator('[data-testid="wikilink-autocomplete"]')
    await expect(autocomplete).toBeVisible()

    // And: presses ArrowDown twice
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')

    // Then: second item is highlighted
    const secondItem = page.locator('[data-testid="autocomplete-item"]').nth(1)
    await expect(secondItem).toHaveAttribute('data-highlighted', 'true')

    // When: presses Enter
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300) // Wait for wikilink insertion

    // Then: wikilink is inserted for second item (Beta)
    const wikilink = page.locator('[data-wikilink="Beta"]')
    await expect(wikilink).toBeVisible()

    // When: user types "[[" again and presses Escape
    await page.evaluate(() => {
      const view = (window as any).__brio_editorView
      if (!view) throw new Error('EditorView not found')
      const { state } = view
      const pos = state.selection.main.head
      view.dispatch({
        changes: { from: pos, insert: ' [[' },
        selection: { anchor: pos + 3 }
      })
    })
    await page.waitForTimeout(300) // Debounce time
    await page.keyboard.press('Escape')

    // Then: autocomplete closes
    await expect(autocomplete).not.toBeVisible()
  })

  test('Scenario 11: should not create wikilink for escaped \\[[', async ({ page }) => {
    // Given: a note is open
    await createNoteAndWait(page, 'Test Note')
    const editor = page.locator('.cm-content')
    await editor.click()

    // When: user types "\\[[Not a link]]"
    await insertInEditor(page, 'This is \\[[Not a link]] text')

    // Then: no wikilink is created
    const wikilinks = page.locator('[data-wikilink]')
    const count = await wikilinks.count()
    expect(count).toBe(0)

    // And: text displays "[[Not a link]]" literally
    await expect(editor).toContainText('[[Not a link]]')
  })

  test('Scenario 12: should support multiple wikilinks on same line', async ({ page }) => {
    // Given: notes "Note A", "Note B", "Note C" exist
    for (const title of ['Note A', 'Note B', 'Note C']) {
      await createNoteAndWait(page, title)
    }

    // Create source note
    await createNoteAndWait(page, 'Source')
    const editor = page.locator('.cm-content')
    await editor.click()

    // When: user types multiple wikilinks on one line
    await insertInEditor(page, 'See [[Note A]], [[Note B]], and [[Note C]]')

    // Then: all three wikilinks are rendered
    const wikilinkA = page.locator('[data-wikilink="Note A"]')
    const wikilinkB = page.locator('[data-wikilink="Note B"]')
    const wikilinkC = page.locator('[data-wikilink="Note C"]')

    await expect(wikilinkA).toBeVisible()
    await expect(wikilinkB).toBeVisible()
    await expect(wikilinkC).toBeVisible()

    // And: each is clickable
    await wikilinkB.click()
    await waitForSaveComplete(page)
    const titleInput = page.locator('[data-testid="note-title-input"]')
    await expect(titleInput).toHaveValue('Note B')
  })

  test('Scenario 13: should open note in new window with Cmd+Click', async ({ page, electronApp }) => {
    // Given: notes "Note A" and "Note B" exist with wikilink
    const titleInput = page.locator('[data-testid="note-title-input"]')
    const editor = page.locator('.cm-content')

    // Create Note A
    await createNoteAndWait(page, 'Note A')

    // Create Note B with link
    await createNoteAndWait(page, 'Note B')
    await editor.click()
    await insertInEditor(page, 'Link to [[Note A]]')

    // When: user Cmd+Clicks on wikilink
    const wikilink = page.locator('[data-wikilink="Note A"]')
    
    // Listen for new window
    const newWindowPromise = electronApp.waitForEvent('window')
    
    await wikilink.click({ modifiers: ['Meta'] }) // Meta = Cmd on macOS
    
    // Then: new window opens with "Note A"
    const newWindow = await newWindowPromise
    await newWindow.waitForLoadState('domcontentloaded')
    await newWindow.waitForSelector('[data-testid="note-title-input"]', { timeout: 5000 })
    
    const newTitleInput = newWindow.locator('[data-testid="note-title-input"]')
    await expect(newTitleInput).toHaveValue('Note A')

    // And: original window still shows "Note B"
    await expect(titleInput).toHaveValue('Note B')
  })
})
