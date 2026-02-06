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
  
  // Wait for save to complete and tasks to be processed
  await page.waitForTimeout(300)
}

test.describe('US-004 Tasks @e2e', () => {
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

  test('Scenario 1: should detect tasks in markdown content', async ({ page }) => {
    // Given: user creates a new note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('My Tasks')
    await titleInput.blur()

    // When: user types content with tasks
    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, '- [ ] Task pending\n- [x] Task done\n- [>] Task deferred\n- [-] Task cancelled')

    // Then: tasks are detected and stored
    const tasks = await page.evaluate(async () => {
      interface WindowWithAPI extends Window {
        api: {
          notes: {
            getAll: () => Promise<Array<{ id: string }>>
          }
          tasks: {
            getByNote: (noteId: string) => Promise<
              Array<{ content: string; status: string; line_number: number }>
            >
          }
        }
      }
      const notes = await (window as WindowWithAPI).api.notes.getAll()
      const noteId = notes[0].id
      return await (window as WindowWithAPI).api.tasks.getByNote(noteId)
    })

    expect(tasks).toHaveLength(4)
    expect(tasks[0]).toMatchObject({ content: 'Task pending', status: 'pending', line_number: 0 })
    expect(tasks[1]).toMatchObject({ content: 'Task done', status: 'done', line_number: 1 })
    expect(tasks[2]).toMatchObject({ content: 'Task deferred', status: 'deferred', line_number: 2 })
    expect(tasks[3]).toMatchObject({ content: 'Task cancelled', status: 'cancelled', line_number: 3 })
  })

  test('Scenario 2: should render interactive checkboxes in editor', async ({ page }) => {
    // Given: note with tasks
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Task Note')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, '- [ ] Buy milk\n- [x] Write tests')

    // When: checkboxes are rendered
    const pendingCheckbox = page.locator('[data-testid="task-checkbox"][data-status="pending"]').first()
    const doneCheckbox = page.locator('[data-testid="task-checkbox"][data-status="done"]').first()
    
    // Wait for checkboxes to be rendered
    await page.waitForTimeout(500)

    // Then: checkboxes are visible
    await expect(pendingCheckbox).toBeVisible()
    await expect(doneCheckbox).toBeVisible()

    // And: checkboxes reflect correct state
    await expect(pendingCheckbox).not.toBeChecked()
    await expect(doneCheckbox).toBeChecked()
  })

  test('Scenario 3: should toggle task status on checkbox click', async ({ page }) => {
    // Given: note with pending task
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Toggle Task')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, '- [ ] Task to toggle')

    // When: user clicks on checkbox
    const checkbox = page.locator('[data-testid="task-checkbox"][data-status="pending"]').first()
    await checkbox.click()

    // Wait for auto-save
    await page.waitForTimeout(1000)

    // Then: markdown is updated to [x]
    const content = await editor.textContent()
    expect(content).toContain('- [x] Task to toggle')

    // And: checkbox is now checked
    const doneCheckbox = page.locator('[data-testid="task-checkbox"][data-status="done"]').first()
    await expect(doneCheckbox).toBeChecked()

    // And: task status is updated in database
    const tasks = await page.evaluate(async () => {
      interface WindowWithAPI extends Window {
        api: {
          notes: {
            getAll: () => Promise<Array<{ id: string }>>
          }
          tasks: {
            getByNote: (noteId: string) => Promise<Array<{ status: string }>>
          }
        }
      }
      const notes = await (window as WindowWithAPI).api.notes.getAll()
      const noteId = notes[0].id
      return await (window as WindowWithAPI).api.tasks.getByNote(noteId)
    })

    expect(tasks[0].status).toBe('done')
  })

  test.skip(isWebMode, 'Task-to-note association has timing issues in web mode')
  test('Scenario 4: should display all tasks in task panel', async ({ page }) => {
    // Given: multiple notes with tasks
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    const titleInput = page.locator('[data-testid="note-title-input"]')
    const editor = page.locator('.cm-content')

    // Create note 1 with tasks
    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Work Tasks')
    await titleInput.blur()
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, '- [ ] Review PR\n- [x] Deploy app')
    
    // Ensure note is fully saved before creating next note
    await page.evaluate(async () => {
      await (window as any).__brio_saveNow()
    })
    await page.waitForTimeout(800) // Wait for tasks to be fully indexed

    // Create note 2 with tasks
    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Personal Tasks')
    await titleInput.blur()
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, '- [ ] Buy groceries')
    
    // Ensure note is fully saved before checking tasks
    await page.evaluate(async () => {
      await (window as any).__brio_saveNow()
    })
    await page.waitForTimeout(800) // Wait for tasks to be fully indexed

    // When: user opens task panel
    const taskPanel = page.locator('[data-testid="task-panel"]')
    await expect(taskPanel).toBeVisible()

    // Then: all tasks are displayed
    const taskItems = page.locator('[data-testid="task-item"]')
    await expect(taskItems).toHaveCount(3)

    // And: tasks show their source note
    const reviewTask = taskPanel.locator('[data-testid="task-item"]').filter({ hasText: 'Review PR' })
    await expect(reviewTask).toBeVisible()
    await expect(reviewTask).toContainText('Work Tasks')

    const groceriesTask = taskPanel.locator('[data-testid="task-item"]').filter({ hasText: 'Buy groceries' })
    await expect(groceriesTask).toBeVisible()
    await expect(groceriesTask).toContainText('Personal Tasks')
  })

  test('Scenario 5: should filter tasks by status', async ({ page }) => {
    // Given: note with tasks in different statuses
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Mixed Tasks')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, '- [ ] Pending task\n- [x] Done task\n- [>] Deferred task\n- [-] Cancelled task')

    // When: user filters by "pending"
    const taskPanel = page.locator('[data-testid="task-panel"]')
    const pendingFilter = taskPanel.locator('[data-testid="task-filter-pending"]')
    await pendingFilter.click()

    // Then: only pending tasks are visible
    const taskItems = page.locator('[data-testid="task-item"]')
    await expect(taskItems).toHaveCount(1)
    await expect(taskItems.first()).toContainText('Pending task')

    // When: user filters by "done"
    const doneFilter = taskPanel.locator('[data-testid="task-filter-done"]')
    await doneFilter.click()

    // Then: only done tasks are visible
    await expect(taskItems).toHaveCount(1)
    await expect(taskItems.first()).toContainText('Done task')

    // When: user clears filter (show all)
    const allFilter = taskPanel.locator('[data-testid="task-filter-all"]')
    await allFilter.click()

    // Then: all tasks are visible
    await expect(taskItems).toHaveCount(4)
  })

  test('Scenario 6: should display task counter (pending/total)', async ({ page }) => {
    // Given: note with mixed tasks
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Counter Test')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, '- [ ] Task 1\n- [ ] Task 2\n- [x] Task 3\n- [x] Task 4\n- [x] Task 5')

    // When: user views task panel
    const taskPanel = page.locator('[data-testid="task-panel"]')
    const taskCounter = taskPanel.locator('[data-testid="task-counter"]')

    // Then: counter shows pending/total
    await expect(taskCounter).toBeVisible()
    await expect(taskCounter).toContainText('2/5') // 2 pending, 5 total
  })

  test.skip(isWebMode, 'Task navigation depends on correct task-to-note association (see Scenario 4)')
  test('Scenario 7: should navigate to note when clicking task in panel', async ({ page }) => {
    // Given: multiple notes with tasks
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    const titleInput = page.locator('[data-testid="note-title-input"]')
    const editor = page.locator('.cm-content')

    // Create note 1
    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Note A')
    await titleInput.blur()
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, '- [ ] Task A')

    // Create note 2
    await newNoteButton.click()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Note B')
    await titleInput.blur()
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, '- [ ] Task B')

    // When: user clicks on Task A in task panel
    const taskPanel = page.locator('[data-testid="task-panel"]')
    const taskA = taskPanel.locator('[data-testid="task-item"]').filter({ hasText: 'Task A' })
    await taskA.click()

    // Then: Note A is selected and displayed
    const selectedNoteTitle = page.locator('[data-testid="note-title-input"]')
    await expect(selectedNoteTitle).toHaveValue('Note A')
  })

  test('BUG-017: should not concatenate task text with note title', async ({ page }) => {
    // Given: note with task
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Premiere ligne')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    
    // Content with task
    await setEditorContent(page, '- [x] Tâche terminée')

    // When: tasks are displayed in task panel
    const taskPanel = page.locator('[data-testid="task-panel"]')
    const taskItems = page.locator('[data-testid="task-item"]')
    
    // Wait for tasks to be indexed
    await page.waitForTimeout(500)

    // Then: task text and note title should be visually separated
    const firstTask = taskItems.first()
    await expect(firstTask).toBeVisible()
    
    // Get the full text content of the task item
    const fullText = await firstTask.textContent()
    
    // Should contain both task text and note title
    expect(fullText).toContain('Tâche terminée')
    expect(fullText).toContain('Premiere ligne')
    
    // But they should NOT be concatenated without separator
    expect(fullText).not.toContain('terminéePremiere')
    
    // Verify the task text element only contains the task content
    const taskText = await firstTask.locator('.task-text').textContent()
    expect(taskText).toBe('Tâche terminée')
    
    // Verify the note title element only contains the note title
    const noteTitle = await firstTask.locator('.task-note-title').textContent()
    expect(noteTitle).toBe('Premiere ligne')
  })

  test('Scenario 8: should cycle through task statuses on repeated clicks', async ({ page }) => {
    // Given: note with pending task
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Cycle Test')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    await setEditorContent(page, '- [ ] Cycle task')

    // When: user clicks checkbox multiple times
    // Click 1: [ ] -> [x]
    let checkbox = page.locator('[data-testid="task-checkbox"]').first()
    await checkbox.click()
    await page.waitForTimeout(500)
    let content = await editor.textContent()
    expect(content).toContain('- [x] Cycle task')

    // Click 2: [x] -> [>]
    checkbox = page.locator('[data-testid="task-checkbox"]').first()
    await checkbox.click()
    await page.waitForTimeout(500)
    content = await editor.textContent()
    expect(content).toContain('- [>] Cycle task')

    // Click 3: [>] -> [-]
    checkbox = page.locator('[data-testid="task-checkbox"]').first()
    await checkbox.click()
    await page.waitForTimeout(500)
    content = await editor.textContent()
    expect(content).toContain('- [-] Cycle task')

    // Click 4: [-] -> [ ]
    checkbox = page.locator('[data-testid="task-checkbox"]').first()
    await checkbox.click()
    await page.waitForTimeout(500)
    content = await editor.textContent()
    expect(content).toContain('- [ ] Cycle task')
  })
})
