import { test, expect } from './electron'
import type { Page } from '@playwright/test'

/**
 * Helper to get editor content as string
 */
async function getEditorContent(page: Page): Promise<string> {
  const lines = await page.locator('.cm-line').all()
  const texts = await Promise.all(lines.map(line => line.textContent()))
  return texts.join('\n')
}

test.describe('Markdown Lists Auto-continuation @e2e', () => {
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

    // Créer une nouvelle note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Markdown Lists Test')
    await titleInput.blur()

    // Focus sur l'éditeur
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
  })

  test.describe('Bullet Lists', () => {
    test('should auto-continue bullet list on Enter', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: user types a bullet list item
      await cmContent.pressSequentially('- Item 1')

      // When: user presses Enter
      await page.keyboard.press('Enter')

      // Then: new line starts with "- "
      const text = await getEditorContent(page)
      expect(text).toBe('- Item 1\n- ')
    })

    test.skip('should exit bullet list on empty line Enter', async ({ page }) => {
      // TODO: Fix list exit logic - extra newline issue
      const cmContent = page.locator('.cm-content')

      // Given: user has a bullet list with one item
      await cmContent.pressSequentially('- Item 1')
      await page.keyboard.press('Enter')

      // When: user presses Enter on empty bullet line
      await page.keyboard.press('Enter')

      // Then: the "- " marker is removed and list is exited
      const text = await getEditorContent(page)
      expect(text).toBe('- Item 1\n')
    })

    test('should handle multiple bullet list items', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: user creates multiple items
      await cmContent.pressSequentially('- First')
      await page.keyboard.press('Enter')
      await cmContent.pressSequentially('Second')
      await page.keyboard.press('Enter')
      await cmContent.pressSequentially('Third')

      // Then: all items have bullet markers
      const text = await getEditorContent(page)
      expect(text).toBe('- First\n- Second\n- Third')
    })

    test('should work with alternative bullet markers (* and +)', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Test with *
      await cmContent.pressSequentially('* Item with asterisk')
      await page.keyboard.press('Enter')
      let text = await getEditorContent(page)
      expect(text).toBe('* Item with asterisk\n* ')

      // Clear and test with +
      await page.keyboard.press('Meta+a')
      await page.keyboard.press('Backspace')
      await cmContent.pressSequentially('+ Item with plus')
      await page.keyboard.press('Enter')
      text = await getEditorContent(page)
      expect(text).toBe('+ Item with plus\n+ ')
    })
  })

  test.describe('Numbered Lists', () => {
    test('should auto-increment numbered list on Enter', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: user types a numbered list item
      await cmContent.pressSequentially('1. First item', { delay: 50 })
      await page.waitForTimeout(200) // Wait for text to be rendered

      // When: user presses Enter
      await page.keyboard.press('Enter')
      await page.waitForTimeout(200) // Wait for auto-continuation to apply

      // Then: new line starts with "2. "
      const text = await getEditorContent(page)
      expect(text).toBe('1. First item\n2. ')
    })

    test.skip('should exit numbered list on empty line Enter', async ({ page }) => {
      // TODO: Fix list exit logic - extra newline issue
      const cmContent = page.locator('.cm-content')

      // Given: user has a numbered list with one item
      await cmContent.pressSequentially('1. First item')
      await page.keyboard.press('Enter')

      // When: user presses Enter on empty numbered line
      await page.keyboard.press('Enter')

      // Then: the "2. " marker is removed and list is exited
      const text = await getEditorContent(page)
      expect(text).toBe('1. First item\n')
    })

    test('should handle multiple numbered list items', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: user creates multiple items
      await cmContent.pressSequentially('1. First')
      await page.keyboard.press('Enter')
      await cmContent.pressSequentially('Second')
      await page.keyboard.press('Enter')
      await cmContent.pressSequentially('Third')
      await page.keyboard.press('Enter')
      await cmContent.pressSequentially('Fourth')

      // Then: all items are numbered sequentially
      const text = await getEditorContent(page)
      expect(text).toBe('1. First\n2. Second\n3. Third\n4. Fourth')
    })

    test('should continue from any starting number', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: user starts with number 5
      await cmContent.pressSequentially('5. Fifth item')

      // When: user presses Enter
      await page.keyboard.press('Enter')

      // Then: next number is 6
      const text = await getEditorContent(page)
      expect(text).toBe('5. Fifth item\n6. ')
    })
  })

  test.describe('Mixed Lists', () => {
    test('should not interfere with regular text', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: user types regular text
      await cmContent.pressSequentially('This is regular text')

      // When: user presses Enter
      await page.keyboard.press('Enter')

      // Then: no list marker is added
      const text = await getEditorContent(page)
      expect(text).toBe('This is regular text\n')
    })

    test.skip('should handle transition from bullet to numbered list', async ({ page }) => {
      // TODO: Fix list exit logic - extra newline issue
      const cmContent = page.locator('.cm-content')

      // Given: user has a bullet list
      await cmContent.pressSequentially('- Bullet item')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter') // Exit bullet list

      // When: user starts a numbered list
      await cmContent.pressSequentially('1. Numbered item')
      await page.keyboard.press('Enter')

      // Then: numbered list continues correctly
      const text = await getEditorContent(page)
      expect(text).toBe('- Bullet item\n\n1. Numbered item\n2. ')
    })
  })

  test.describe('Edge Cases', () => {
    test.skip('should handle list item with only marker', async ({ page }) => {
      // TODO: Fix list exit logic - extra newline issue
      const cmContent = page.locator('.cm-content')

      // Given: user types just the marker
      await cmContent.pressSequentially('- ')

      // When: user presses Enter
      await page.keyboard.press('Enter')

      // Then: list is exited (empty item)
      const text = await getEditorContent(page)
      expect(text).toBe('')
    })

    test.skip('should preserve indentation in nested lists', async ({ page }) => {
      // TODO: Implement nested list indentation support
      const cmContent = page.locator('.cm-content')

      // Given: user creates an indented list item
      await cmContent.pressSequentially('- Parent')
      await page.keyboard.press('Enter')
      await cmContent.pressSequentially('  - Child')

      // When: user presses Enter
      await page.keyboard.press('Enter')

      // Then: indentation is preserved
      const text = await getEditorContent(page)
      expect(text).toBe('- Parent\n  - Child\n  - ')
    })
  })
})
