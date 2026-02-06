import { test, expect } from './helpers/setup'

test.describe('US-005 Note Types @e2e', () => {
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

  test('Scenario 1: New note has default type "note"', async ({ page }) => {
    // Given: app is open with no notes
    await page.waitForSelector('[data-testid="notes-list"]')

    // When: user creates a new note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()
    await page.waitForTimeout(500)

    // Then: note has type "note" (default)
    const noteType = await page.evaluate(async () => {
      interface WindowWithAPI extends Window {
        api: {
          notes: {
            getAll: () => Promise<Array<{ id: string; type: string }>>
          }
        }
      }
      const notes = await (window as WindowWithAPI).api.notes.getAll()
      return notes[0]?.type
    })
    expect(noteType).toBe('note')

    // And: note icon is 📝 (note icon)
    const noteItem = page.locator('[data-testid="note-item"]').first()
    const icon = noteItem.locator('[data-testid="note-type-icon"]')
    await expect(icon).toHaveText('📝')
  })

  test('Scenario 2: Change note type via selector', async ({ page }) => {
    // Given: a note exists
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()
    await page.waitForTimeout(500)

    // When: user opens the type selector
    const typeSelector = page.locator('[data-testid="note-type-selector"]')
    await typeSelector.click()

    // And: selects "project"
    const projectOption = page.locator('[data-testid="note-type-option-project"]')
    await projectOption.click()

    // Wait for save and UI update
    await page.waitForTimeout(1000)

    // Force reload to refresh the notes list
    await page.reload()
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Then: note type is updated to "project"
    const noteType = await page.evaluate(async () => {
      interface WindowWithAPI extends Window {
        api: {
          notes: {
            getAll: () => Promise<Array<{ id: string; type: string }>>
          }
        }
      }
      const notes = await (window as WindowWithAPI).api.notes.getAll()
      return notes[0]?.type
    })
    expect(noteType).toBe('project')

    // And: note icon is 📁 (project icon)
    const noteItem = page.locator('[data-testid="note-item"]').first()
    const icon = noteItem.locator('[data-testid="note-type-icon"]')
    await expect(icon).toHaveText('📁')
  })

  test('Scenario 3: Type icon displayed in note list', async ({ page }) => {
    // Given: notes with different types exist
    await page.evaluate(async () => {
      interface WindowWithAPI extends Window {
        api: {
          notes: {
            create: (title: string, slug: string, content: string | null) => Promise<string>
            updateType: (id: string, type: string) => Promise<void>
            getAll: () => Promise<Array<{ id: string }>>
          }
        }
      }
      const api = (window as WindowWithAPI).api.notes
      
      // Create notes with different types
      const noteId = await api.create('My Note', 'my-note', '')
      const projectId = await api.create('My Project', 'my-project', '')
      const personId = await api.create('John Doe', 'john-doe', '')
      
      // Update types
      await api.updateType(noteId, 'note')
      await api.updateType(projectId, 'project')
      await api.updateType(personId, 'person')
    })

    // Reload to see changes
    await page.reload()
    await page.waitForSelector('[data-testid="notes-list"]')
    // Wait for notes to actually load from database
    await page.waitForFunction(() => (window as any).__brio_notesLoaded === true, { timeout: 5000 })
    await page.waitForTimeout(500)

    // Then: each note displays its type icon
    const noteIcons = await page.locator('[data-testid="note-type-icon"]').allTextContents()
    expect(noteIcons).toContain('📝') // note
    expect(noteIcons).toContain('📁') // project
    expect(noteIcons).toContain('👤') // person
  })

  test('Scenario 4: Filter notes by type', async ({ page }) => {
    // Given: notes with different types exist
    await page.evaluate(async () => {
      interface WindowWithAPI extends Window {
        api: {
          notes: {
            create: (title: string, slug: string, content: string | null) => Promise<string>
            updateType: (id: string, type: string) => Promise<void>
          }
        }
      }
      const api = (window as WindowWithAPI).api.notes
      
      const note1 = await api.create('Note 1', 'note-1', '')
      const note2 = await api.create('Project 1', 'project-1', '')
      const note3 = await api.create('Note 2', 'note-2', '')
      
      await api.updateType(note1, 'note')
      await api.updateType(note2, 'project')
      await api.updateType(note3, 'note')
    })

    await page.reload()
    await page.waitForSelector('[data-testid="notes-list"]')
    // Wait for notes to actually load from database
    await page.waitForFunction(() => (window as any).__brio_notesLoaded === true, { timeout: 5000 })
    await page.waitForTimeout(500)

    // When: user filters by type "note"
    const typeFilter = page.locator('[data-testid="note-type-filter"]')
    await typeFilter.selectOption('note')
    await page.waitForTimeout(300)

    // Then: only notes with type "note" are displayed
    const visibleNotes = await page.locator('[data-testid="note-item"]').count()
    expect(visibleNotes).toBe(2)

    // And: project note is not visible
    const projectNote = page.locator('[data-testid="note-item"]').filter({ hasText: 'Project 1' })
    await expect(projectNote).not.toBeVisible()
  })

  test('Scenario 5: Type detected from frontmatter', async ({ page }) => {
    test.skip(process.env.BRIO_MODE === 'web', 'Frontmatter parsing not implemented in web mode')
    
    // Given: a note exists
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()
    await page.waitForTimeout(500)

    // When: user adds frontmatter with type: project
    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.fill('My Project')
    await titleInput.blur()
    await page.waitForTimeout(300)

    // Type frontmatter in editor
    const editor = page.locator('.cm-content')
    await editor.click()
    await page.keyboard.type('---\ntype: project\n---\n\nProject content')
    
    // Wait for auto-save
    await page.waitForTimeout(2000)

    // Force save
    await page.evaluate(async () => {
      interface WindowWithBrio extends Window {
        __brio_saveNow?: () => Promise<void>
      }
      if ((window as WindowWithBrio).__brio_saveNow) {
        await (window as WindowWithBrio).__brio_saveNow!()
      }
    })
    await page.waitForTimeout(500)

    // Then: note type is updated to "project"
    const noteType = await page.evaluate(async () => {
      interface WindowWithAPI extends Window {
        api: {
          notes: {
            getAll: () => Promise<Array<{ id: string; type: string }>>
          }
        }
      }
      const notes = await (window as WindowWithAPI).api.notes.getAll()
      return notes[0]?.type
    })
    expect(noteType).toBe('project')

    // And: note icon is 📁 (project icon)
    const noteItem = page.locator('[data-testid="note-item"]').first()
    const icon = noteItem.locator('[data-testid="note-type-icon"]')
    await expect(icon).toHaveText('📁')
  })

  test('Scenario 6: All 5 predefined types work', async ({ page }) => {
    // Given: app is open
    await page.waitForSelector('[data-testid="notes-list"]')

    // Create notes for each type
    const types = [
      { type: 'note', icon: '📝' },
      { type: 'project', icon: '📁' },
      { type: 'person', icon: '👤' },
      { type: 'meeting', icon: '📅' },
      { type: 'daily', icon: '🗓️' },
    ]

    for (const { type, icon } of types) {
      // Create note
      const newNoteButton = page.locator('[data-testid="new-note-button"]')
      await newNoteButton.click()
      await page.waitForTimeout(300)

      // Set title
      const titleInput = page.locator('[data-testid="note-title-input"]')
      await titleInput.fill(`Test ${type}`)
      await titleInput.blur()
      await page.waitForTimeout(200)

      // Set type via selector
      const typeSelector = page.locator('[data-testid="note-type-selector"]')
      await typeSelector.click()
      const option = page.locator(`[data-testid="note-type-option-${type}"]`)
      await option.click()
      await page.waitForTimeout(300)
    }

    // Reload to see all notes
    await page.reload()
    await page.waitForSelector('[data-testid="notes-list"]')
    // Wait for notes to actually load from database
    await page.waitForFunction(() => (window as any).__brio_notesLoaded === true, { timeout: 5000 })
    await page.waitForTimeout(500)

    // Then: all icons are displayed correctly
    const noteIcons = await page.locator('[data-testid="note-type-icon"]').allTextContents()
    expect(noteIcons).toContain('📝')
    expect(noteIcons).toContain('📁')
    expect(noteIcons).toContain('👤')
    expect(noteIcons).toContain('📅')
    expect(noteIcons).toContain('🗓️')
  })
})
