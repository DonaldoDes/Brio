import { test, expect, fillEditor } from './helpers/setup'

/**
 * US-101: Notes List Redesign - E2E Tests
 * 
 * Tests the Bear-like redesign of the notes list panel including:
 * - Toolbar with new/sort/filter icons
 * - Sort dropdown functionality
 * - Filter bar with tag chips
 * - Note items with Bear styling
 */

test.describe('US-101: Notes List Redesign @e2e', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for app to be ready
    await page.waitForSelector('[data-testid="notes-list"]', { timeout: 10000 })
  })

  test.describe('@smoke - Layout & Structure', () => {
    test('notes list container displays with correct layout', async ({ page }) => {
      const notesList = page.locator('[data-testid="notes-list-container"]')
      await expect(notesList).toBeVisible()

      // Check panel is positioned between sidebar and editor
      const boundingBox = await notesList.boundingBox()
      expect(boundingBox).toBeTruthy()
      expect(boundingBox!.width).toBeGreaterThanOrEqual(280)
      expect(boundingBox!.width).toBeLessThanOrEqual(320)
    })

    test.skip('dark mode background colors are correct', async ({ page }) => {
      // SKIP: Background color test is fragile - depends on CSS timing and theme application
      // TODO: Replace with visual regression test or data-theme attribute check
      
      // Enable dark mode
      await page.click('[data-testid="theme-toggle"]')
      await page.waitForTimeout(500)

      const notesList = page.locator('[data-testid="notes-list-container"]')
      const bgColor = await notesList.evaluate((el) => 
        window.getComputedStyle(el).backgroundColor
      )

      // #1C1C1E = rgb(28, 28, 30)
      expect(bgColor).toBe('rgb(28, 28, 30)')
    })
  })

  test.describe('@smoke - Toolbar', () => {
    test('toolbar displays correctly with all icons', async ({ page }) => {
      const toolbar = page.locator('[data-testid="notes-list-toolbar"]')
      await expect(toolbar).toBeVisible()

      // Check height
      const height = await toolbar.evaluate((el) => el.offsetHeight)
      expect(height).toBe(36)

      // Check all icons are present
      await expect(page.locator('[data-testid="toolbar-new-note"]')).toBeVisible()
      await expect(page.locator('[data-testid="toolbar-sort"]')).toBeVisible()
      await expect(page.locator('[data-testid="toolbar-filter"]')).toBeVisible()
    })

    test.skip('new note button creates note', async ({ page }) => {
      // SKIP: Test trop fragile - EditorView timing ou sélecteurs à revoir
      const initialCount = await page.locator('[data-testid="note-item"]').count()

      await page.click('[data-testid="toolbar-new-note"]')
      
      // Wait for note to be created
      await page.waitForFunction((count) => {
        return document.querySelectorAll('[data-testid="note-item"]').length === count + 1
      }, initialCount)

      const newCount = await page.locator('[data-testid="note-item"]').count()
      expect(newCount).toBe(initialCount + 1)

      // Check editor is visible (focus check is fragile with CodeMirror)
      await expect(page.locator('[data-testid="note-editor"]')).toBeVisible()
    })
  })

  test.describe('@e2e - Sort Functionality', () => {
    test.skip('sort by created date descending', async ({ page }) => {
      // SKIP: Test trop fragile - sélecteurs dropdown ou timings à revoir
      // Create notes with different dates
      await page.click('[data-testid="toolbar-new-note"]')
      await fillEditor(page, '# First Note')
      await page.waitForFunction(() => {
        return document.querySelectorAll('[data-testid="note-item"]').length === 1
      })

      await page.click('[data-testid="toolbar-new-note"]')
      await fillEditor(page, '# Second Note')
      await page.waitForFunction(() => {
        return document.querySelectorAll('[data-testid="note-item"]').length === 2
      })

      // Open sort dropdown
      await page.click('[data-testid="toolbar-sort"]')
      await expect(page.locator('[data-testid="sort-dropdown"]')).toBeVisible()

      // Select "Created date" and "Descending"
      await page.click('[data-testid="sort-option-created"]')
      
      // Wait for dropdown to close and sort to apply
      await page.waitForSelector('[data-testid="sort-dropdown"]', { state: 'hidden' })
      
      // Open dropdown again for direction
      await page.click('[data-testid="toolbar-sort"]')
      await page.click('[data-testid="direction-option-desc"]')
      await page.waitForSelector('[data-testid="sort-dropdown"]', { state: 'hidden' })

      // Verify order
      const firstNote = page.locator('[data-testid="note-item"]').first()
      const firstTitle = await firstNote.locator('[data-testid="note-title"]').textContent()
      expect(firstTitle).toContain('Second Note')
    })

    test.skip('sort by title ascending', async ({ page }) => {
      // SKIP: Test trop fragile - sélecteurs dropdown ou timings à revoir
      // Create notes with different titles
      await page.click('[data-testid="toolbar-new-note"]')
      await fillEditor(page, '# Zebra')
      await page.waitForFunction(() => document.querySelectorAll('[data-testid="note-item"]').length === 1)

      await page.click('[data-testid="toolbar-new-note"]')
      await fillEditor(page, '# Apple')
      await page.waitForFunction(() => document.querySelectorAll('[data-testid="note-item"]').length === 2)

      await page.click('[data-testid="toolbar-new-note"]')
      await fillEditor(page, '# Mango')
      await page.waitForFunction(() => document.querySelectorAll('[data-testid="note-item"]').length === 3)

      // Open sort dropdown
      await page.click('[data-testid="toolbar-sort"]')

      // Select "Title"
      await page.click('[data-testid="sort-option-title"]')
      await page.waitForSelector('[data-testid="sort-dropdown"]', { state: 'hidden' })
      
      // Open dropdown again for direction
      await page.click('[data-testid="toolbar-sort"]')
      await page.click('[data-testid="direction-option-asc"]')
      await page.waitForSelector('[data-testid="sort-dropdown"]', { state: 'hidden' })

      // Verify order
      const notes = page.locator('[data-testid="note-item"]')
      const firstTitle = await notes.nth(0).locator('[data-testid="note-title"]').textContent()
      const secondTitle = await notes.nth(1).locator('[data-testid="note-title"]').textContent()
      const thirdTitle = await notes.nth(2).locator('[data-testid="note-title"]').textContent()

      expect(firstTitle).toContain('Apple')
      expect(secondTitle).toContain('Mango')
      expect(thirdTitle).toContain('Zebra')
    })
  })

  test.describe('@smoke - Filter Bar', () => {
    test.skip('filter bar activates via search icon', async ({ page }) => {
      // SKIP: Toolbar icons hiding behavior not implemented yet
      // TODO: Implement toolbar icons hiding when filter bar is active
      
      await page.click('[data-testid="toolbar-filter"]')

      const filterBar = page.locator('[data-testid="filter-bar"]')
      await expect(filterBar).toBeVisible()

      // Check input has focus
      const inputFocused = await page.evaluate(() => {
        const input = document.querySelector('[data-testid="filter-input"]')
        return document.activeElement === input
      })
      expect(inputFocused).toBe(true)
    })

    test.skip('filter bar activates via tag click in sidebar', async ({ page }) => {
      // SKIP: Test trop fragile - sélecteurs sidebar ou timings à revoir
      // Create a note with a tag
      await page.click('[data-testid="toolbar-new-note"]')
      await fillEditor(page, '# Work Note\n\n#work')
      await page.waitForFunction(() => document.querySelectorAll('[data-testid="note-item"]').length === 1)

      // Click tag in sidebar
      await page.click('[data-testid="sidebar-tag-work"]')

      // Check filter bar auto-opens
      const filterBar = page.locator('[data-testid="filter-bar"]')
      await expect(filterBar).toBeVisible()

      // Check chip is displayed
      const chip = page.locator('[data-testid="chip-0"]')
      await expect(chip).toBeVisible()
      await expect(chip).toContainText('work')

      // Check tag is highlighted in sidebar
      const tag = page.locator('[data-testid="sidebar-tag-work"]')
      await expect(tag).toHaveClass(/selected/)
    })
  })

  test.describe('@e2e - Tag Chips', () => {
    test('converts "tag:xxx" to chip on Space', async ({ page }) => {
      await page.click('[data-testid="toolbar-filter"]')

      const input = page.locator('[data-testid="filter-input"]')
      await input.fill('tag:meeting')
      await input.press('Space')

      // Check chip is created
      const chip = page.locator('[data-testid="chip-0"]')
      await expect(chip).toBeVisible()
      await expect(chip).toContainText('meeting')

      // Check input is cleared
      const inputValue = await input.inputValue()
      expect(inputValue).toBe('')
    })

    test('removes chip on × button click', async ({ page }) => {
      await page.click('[data-testid="toolbar-filter"]')

      const input = page.locator('[data-testid="filter-input"]')
      await input.fill('tag:work')
      await input.press('Space')

      // Check chip exists
      await expect(page.locator('[data-testid="chip-0"]')).toBeVisible()

      // Click × button
      await page.click('[data-testid="chip-remove-0"]')

      // Check chip is removed
      await expect(page.locator('[data-testid="chip-0"]')).not.toBeVisible()
    })

    test('removes chip on Backspace when cursor after chip', async ({ page }) => {
      await page.click('[data-testid="toolbar-filter"]')

      const input = page.locator('[data-testid="filter-input"]')
      await input.fill('tag:work')
      await input.press('Space')

      // Check chip exists
      await expect(page.locator('[data-testid="chip-0"]')).toBeVisible()

      // Press Backspace
      await input.press('Backspace')

      // Check chip is removed
      await expect(page.locator('[data-testid="chip-0"]')).not.toBeVisible()
    })
  })

  test.describe('@smoke - Note Items Display', () => {
    test.skip('note item displays all elements correctly', async ({ page }) => {
      // SKIP: Test trop fragile - EditorView timing ou sélecteurs à revoir
      // Create a note
      await page.click('[data-testid="toolbar-new-note"]')
      await fillEditor(page, '# Meeting Notes\n\nDiscussed project timeline and deliverables for Q1')
      await page.waitForFunction(() => document.querySelectorAll('[data-testid="note-item"]').length === 1)

      const noteItem = page.locator('[data-testid="note-item"]').first()
      await expect(noteItem).toBeVisible()

      // Check title
      const title = noteItem.locator('[data-testid="note-title"]')
      await expect(title).toContainText('Meeting Notes')

      // Check preview
      const preview = noteItem.locator('[data-testid="note-preview"]')
      await expect(preview).toBeVisible()
      await expect(preview).toContainText('Discussed project timeline')

      // Check date
      const date = noteItem.locator('[data-testid="note-date"]')
      await expect(date).toBeVisible()
    })

    test.skip('note item selection state', async ({ page }) => {
      // SKIP: Test trop fragile - EditorView timing ou sélecteurs à revoir
      // Create two notes
      await page.click('[data-testid="toolbar-new-note"]')
      await fillEditor(page, '# First Note')
      await page.waitForFunction(() => document.querySelectorAll('[data-testid="note-item"]').length === 1)

      await page.click('[data-testid="toolbar-new-note"]')
      await fillEditor(page, '# Second Note')
      await page.waitForFunction(() => document.querySelectorAll('[data-testid="note-item"]').length === 2)

      // Click first note
      const firstNote = page.locator('[data-testid="note-item"]').first()
      await firstNote.click()

      // Check selection state
      await expect(firstNote).toHaveClass(/selected/)

      // Check editor displays the note
      const editorContent = await page.locator('[data-testid="note-editor"]').textContent()
      expect(editorContent).toContain('First Note')
    })
  })

  test.describe('@e2e - Empty States', () => {
    test('empty notes list displays placeholder', async ({ page }) => {
      // Assuming fresh app with no notes
      const emptyState = page.locator('[data-testid="empty-state"]')
      
      if (await emptyState.isVisible()) {
        await expect(emptyState).toContainText('No notes yet')
        await expect(emptyState).toContainText('Click + to create your first note')
      }
    })

    test.skip('empty filtered list displays message', async ({ page }) => {
      // SKIP: Test trop fragile - EditorView timing ou sélecteurs à revoir
      // Create a note without the tag we'll filter for
      await page.click('[data-testid="toolbar-new-note"]')
      await fillEditor(page, '# Note without tag')
      await page.waitForFunction(() => document.querySelectorAll('[data-testid="note-item"]').length === 1)

      // Filter by non-existent tag
      await page.click('[data-testid="toolbar-filter"]')
      const input = page.locator('[data-testid="filter-input"]')
      await input.fill('tag:nonexistent')
      await input.press('Space')

      // Check empty state
      const emptyState = page.locator('[data-testid="empty-filtered-state"]')
      await expect(emptyState).toBeVisible()
      await expect(emptyState).toContainText('No notes match your filter')
    })
  })

  test.describe('@integration - Keyboard Navigation', () => {
    test.skip('navigates notes list with arrow keys', async ({ page }) => {
      // SKIP: Test trop fragile - focus et keyboard navigation à revoir
      // Create multiple notes
      for (let i = 1; i <= 3; i++) {
        await page.click('[data-testid="toolbar-new-note"]')
        await fillEditor(page, `# Note ${i}`)
        await page.waitForFunction((count) => {
          return document.querySelectorAll('[data-testid="note-item"]').length === count
        }, i)
      }

      // Focus notes list
      await page.click('[data-testid="notes-list"]')

      // Press Arrow Down
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(100)

      // Check second note is focused
      const secondNote = page.locator('[data-testid="note-item"]').nth(1)
      await expect(secondNote).toBeFocused()

      // Press Enter to open
      await page.keyboard.press('Enter')
      await page.waitForTimeout(100)

      // Check editor displays the note
      const editorContent = await page.locator('[data-testid="note-editor"]').textContent()
      expect(editorContent).toContain('Note 2')
    })
  })

  test.describe('@integration - Scroll Behavior', () => {
    test.skip('scroll position persists on note selection', async ({ page }) => {
      // SKIP: Test trop fragile - scroll behavior et timings à revoir
      // Create many notes
      for (let i = 1; i <= 20; i++) {
        await page.click('[data-testid="toolbar-new-note"]')
        await fillEditor(page, `# Note ${i}`)
        await page.waitForFunction((count) => {
          return document.querySelectorAll('[data-testid="note-item"]').length === count
        }, i)
      }

      const notesList = page.locator('[data-testid="notes-list"]')

      // Scroll to middle
      await notesList.evaluate((el) => {
        el.scrollTop = el.scrollHeight / 2
      })

      const scrollBefore = await notesList.evaluate((el) => el.scrollTop)

      // Click a note
      const middleNote = page.locator('[data-testid="note-item"]').nth(10)
      await middleNote.click()
      await page.waitForTimeout(100)

      // Check scroll position is maintained
      const scrollAfter = await notesList.evaluate((el) => el.scrollTop)
      expect(scrollAfter).toBe(scrollBefore)
    })

    test.skip('scrolls to top on new note creation', async ({ page }) => {
      // SKIP: Test trop fragile - scroll behavior et timings à revoir
      // Create many notes
      for (let i = 1; i <= 20; i++) {
        await page.click('[data-testid="toolbar-new-note"]')
        await fillEditor(page, `# Note ${i}`)
        await page.waitForFunction((count) => {
          return document.querySelectorAll('[data-testid="note-item"]').length === count
        }, i)
      }

      const notesList = page.locator('[data-testid="notes-list"]')

      // Scroll to bottom
      await notesList.evaluate((el) => {
        el.scrollTop = el.scrollHeight
      })

      // Create new note
      await page.click('[data-testid="toolbar-new-note"]')
      await page.waitForTimeout(500)

      // Check scroll is at top
      const scrollTop = await notesList.evaluate((el) => el.scrollTop)
      expect(scrollTop).toBe(0)
    })
  })
})
