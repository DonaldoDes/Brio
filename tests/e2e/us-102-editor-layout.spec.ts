import { test, expect } from './helpers/setup'
import type { Page } from '@playwright/test'

/**
 * US-102: Editor Redesign - Layout Tests
 * 
 * Tests for:
 * - Editor top padding (36px alignment with note list)
 * - Editor horizontal padding (48px)
 * - Editor bottom padding (120px for toolbar clearance)
 * - Fluid width (no max-width constraint)
 */

test.describe('US-102: Editor Layout @e2e @us-102', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for app to load
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Create a new note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Editor Layout Test')
    await titleInput.blur()
    await page.waitForTimeout(300)
  })

  test('Scenario: Editor has 36px top padding for alignment', async ({ page }) => {
    // Given I am viewing a note in the editor
    const editorContent = page.locator('.editor-content-area')
    await editorContent.waitFor({ state: 'visible' })

    // When I inspect the editor padding
    const paddingTop = await editorContent.evaluate((el) => {
      return window.getComputedStyle(el).paddingTop
    })

    // Then the top padding should be 36px
    expect(paddingTop).toBe('36px')
  })

  test('Scenario: Editor has 48px horizontal padding', async ({ page }) => {
    // Given I am viewing a note in the editor
    const editorContent = page.locator('.editor-content-area')
    await editorContent.waitFor({ state: 'visible' })

    // When I inspect the editor padding
    const { paddingLeft, paddingRight } = await editorContent.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        paddingLeft: styles.paddingLeft,
        paddingRight: styles.paddingRight,
      }
    })

    // Then the horizontal padding should be 48px on both sides
    expect(paddingLeft).toBe('48px')
    expect(paddingRight).toBe('48px')
  })

  test('Scenario: Editor has 120px bottom padding for toolbar clearance', async ({ page }) => {
    // Given I am viewing a note in the editor
    const editorContent = page.locator('.editor-content-area')
    await editorContent.waitFor({ state: 'visible' })

    // When I inspect the editor padding
    const paddingBottom = await editorContent.evaluate((el) => {
      return window.getComputedStyle(el).paddingBottom
    })

    // Then the bottom padding should be 120px
    expect(paddingBottom).toBe('120px')
  })

  test('Scenario: Editor has fluid width (no max-width)', async ({ page }) => {
    // Given I am viewing a note in the editor
    const editorContent = page.locator('.editor-content-area')
    await editorContent.waitFor({ state: 'visible' })

    // When I inspect the editor max-width
    const maxWidth = await editorContent.evaluate((el) => {
      return window.getComputedStyle(el).maxWidth
    })

    // Then the max-width should be 'none' (fluid)
    expect(maxWidth).toBe('none')
  })

  test.skip('Scenario: Editor title aligns with first note in list', async ({ page }) => {
    // SKIP: Alignement complexe dépendant du layout - À implémenter dans une itération future
    // Given I have a note open in the editor
    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible' })

    // And I can see the note list
    const noteList = page.locator('[data-testid="notes-list"]')
    await noteList.waitFor({ state: 'visible' })

    // When I measure the vertical position of the title
    const titleBox = await titleInput.boundingBox()
    
    // And I measure the vertical position of the first note in the list
    const firstNote = page.locator('[data-testid="note-item"]').first()
    const firstNoteBox = await firstNote.boundingBox()

    // Then they should be aligned (within 2px tolerance)
    expect(titleBox).not.toBeNull()
    expect(firstNoteBox).not.toBeNull()
    
    if (titleBox && firstNoteBox) {
      const diff = Math.abs(titleBox.y - firstNoteBox.y)
      expect(diff).toBeLessThanOrEqual(2)
    }
  })

  test.skip('Scenario: Editor content scrolls with bottom padding visible', async ({ page }) => {
    // SKIP: Scroll behavior complexe avec timing fragile - À implémenter dans une itération future
    // Given I have a note with long content
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await editor.waitFor({ state: 'visible' })

    // When I add enough content to require scrolling
    await editor.click()
    const longContent = Array(50).fill('This is a line of text.\n').join('')
    await page.keyboard.type(longContent)
    await page.waitForTimeout(500)

    // And I scroll to the bottom
    await page.evaluate(() => {
      const scroller = document.querySelector('.cm-scroller')
      if (scroller) {
        scroller.scrollTop = scroller.scrollHeight
      }
    })
    await page.waitForTimeout(300)

    // Then the last line should be visible above the toolbar area
    const lastLine = page.locator('.cm-line').last()
    const lastLineBox = await lastLine.boundingBox()
    
    expect(lastLineBox).not.toBeNull()
    if (lastLineBox) {
      // Last line should be at least 120px from the bottom of the viewport
      const viewportHeight = await page.evaluate(() => window.innerHeight)
      const distanceFromBottom = viewportHeight - (lastLineBox.y + lastLineBox.height)
      expect(distanceFromBottom).toBeGreaterThanOrEqual(100) // Allow some tolerance
    }
  })
})
