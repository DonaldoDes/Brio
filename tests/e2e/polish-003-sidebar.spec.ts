import { test, expect } from './helpers/setup'

/**
 * POLISH-003: Sidebar Polish
 * 
 * Tests for sidebar visual improvements:
 * - Item spacing (12-16px)
 * - Hover states
 * - Text truncation/ellipsis
 * - Correct task counter
 * - Border between sidebar and content
 */

test.describe('POLISH-003 Sidebar Polish @e2e @polish', () => {
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
      
      if (api.testing?.clearAllData) {
        await api.testing.clearAllData()
      } else {
        const notes = await api.notes.getAll()
        for (const note of notes) {
          await api.notes.delete(note.id)
        }
      }
      
      const store = (window as WindowWithAPI).__brio_store
      if (store?.loadNotes) {
        await store.loadNotes()
      }
    })

    await page.waitForFunction(() => (window as any).__brio_notesLoaded === true, { timeout: 5000 })
  })

  test('should have proper spacing between task items (12-16px)', async ({ page }) => {
    // Given: Create a note with multiple tasks
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Spacing Test')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    
    await page.evaluate((text: string) => {
      const view = (window as any).__brio_editorView
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text }
        })
      }
    }, '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3')
    
    await page.evaluate(async () => {
      await (window as any).__brio_saveNow()
    })
    await page.waitForTimeout(300)

    // When: Check task items spacing
    const taskItems = page.locator('[data-testid="task-item"]')
    await expect(taskItems).toHaveCount(3)

    // Then: Items should have proper padding (at least 12px)
    const firstItem = taskItems.first()
    const padding = await firstItem.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return parseInt(styles.padding)
    })
    
    expect(padding).toBeGreaterThanOrEqual(12)
  })

  test('should display hover state on task items', async ({ page }) => {
    // Given: Create a note with a task
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Hover Test')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    
    await page.evaluate((text: string) => {
      const view = (window as any).__brio_editorView
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text }
        })
      }
    }, '- [ ] Hover task')
    
    await page.evaluate(async () => {
      await (window as any).__brio_saveNow()
    })
    await page.waitForTimeout(300)

    // When: Hover over task item
    const taskItem = page.locator('[data-testid="task-item"]').first()
    await taskItem.hover()

    // Then: Background color should change (hover state)
    const bgColorBeforeHover = await taskItem.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    
    await taskItem.hover()
    await page.waitForTimeout(100)
    
    const bgColorAfterHover = await taskItem.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    
    // Background should be different when hovering
    expect(bgColorBeforeHover).not.toBe(bgColorAfterHover)
  })

  test('should display correct task counter (pending/total)', async ({ page }) => {
    // Given: Create a note with mixed task statuses
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Counter Test')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    
    await page.evaluate((text: string) => {
      const view = (window as any).__brio_editorView
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text }
        })
      }
    }, '- [ ] Task 1\n- [ ] Task 2\n- [x] Task 3')
    
    await page.evaluate(async () => {
      await (window as any).__brio_saveNow()
    })
    await page.waitForTimeout(300)

    // When: Check task counter
    const taskCounter = page.locator('[data-testid="task-counter"]')
    await expect(taskCounter).toBeVisible()

    // Then: Counter should show "2/3" (2 pending, 3 total)
    await expect(taskCounter).toHaveText('2/3')
  })

  test('should have visible border between sidebar and content', async ({ page }) => {
    // When: Check navigation sidebar border
    const navigation = page.locator('.navigation')
    await expect(navigation).toBeVisible()

    // Then: Should have a border-right
    const borderRight = await navigation.evaluate((el) => {
      return window.getComputedStyle(el).borderRightWidth
    })
    
    expect(borderRight).not.toBe('0px')
    expect(parseInt(borderRight)).toBeGreaterThanOrEqual(1)
  })

  test('should handle long task text with ellipsis or proper wrapping', async ({ page }) => {
    // Given: Create a note with a very long task
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Long Text Test')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    
    const longText = '- [ ] This is a very long task description that should either be truncated with ellipsis or wrapped properly without breaking the layout'
    await page.evaluate((text: string) => {
      const view = (window as any).__brio_editorView
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text }
        })
      }
    }, longText)
    
    await page.evaluate(async () => {
      await (window as any).__brio_saveNow()
    })
    await page.waitForTimeout(300)

    // When: Check task item
    const taskItem = page.locator('[data-testid="task-item"]').first()
    await expect(taskItem).toBeVisible()

    // Then: Task text should not overflow the container
    const taskText = taskItem.locator('.task-text')
    const isOverflowing = await taskText.evaluate((el) => {
      return el.scrollWidth > el.clientWidth
    })
    
    // If overflowing, should have text-overflow: ellipsis
    if (isOverflowing) {
      const textOverflow = await taskText.evaluate((el) => {
        return window.getComputedStyle(el).textOverflow
      })
      expect(textOverflow).toBe('ellipsis')
    }
  })

  test('should have proper spacing between tag items', async ({ page }) => {
    // Given: Create notes with tags
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Tag Test 1')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    
    await page.evaluate((text: string) => {
      const view = (window as any).__brio_editorView
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text }
        })
      }
    }, '#work #important')
    
    await page.evaluate(async () => {
      await (window as any).__brio_saveNow()
    })
    await page.waitForTimeout(500)

    // When: Check tag items spacing
    const tagItems = page.locator('[data-testid="tag-item"]')
    const count = await tagItems.count()
    
    if (count > 0) {
      const firstTag = tagItems.first()
      const padding = await firstTag.evaluate((el) => {
        const styles = window.getComputedStyle(el)
        return parseInt(styles.padding)
      })
      
      // Then: Tags should have proper padding (at least 8px)
      expect(padding).toBeGreaterThanOrEqual(8)
    }
  })

  test('should display hover state on tag items', async ({ page }) => {
    // Given: Create a note with tags
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Tag Hover Test')
    await titleInput.blur()

    const editor = page.locator('.cm-content')
    await editor.click()
    await page.waitForTimeout(100)
    
    await page.evaluate((text: string) => {
      const view = (window as any).__brio_editorView
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text }
        })
      }
    }, '#test')
    
    await page.evaluate(async () => {
      await (window as any).__brio_saveNow()
    })
    await page.waitForTimeout(500)

    // When: Hover over tag item
    const tagItem = page.locator('[data-testid="tag-item"]').first()
    const count = await page.locator('[data-testid="tag-item"]').count()
    
    if (count > 0) {
      await tagItem.hover()
      await page.waitForTimeout(100)

      // Then: Should have visible hover state (background change)
      const bgColor = await tagItem.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })
      
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)')
      expect(bgColor).not.toBe('transparent')
    }
  })
})
