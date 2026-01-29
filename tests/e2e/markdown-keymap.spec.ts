import { test, expect } from './electron'

test.describe('Markdown Keymap @e2e', () => {
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
    await titleInput.fill('Markdown Keymap Test')
    await titleInput.blur()

    // Focus sur l'éditeur
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
  })

  test.describe('Cmd+B (Bold)', () => {
    test('should wrap selected text with **', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: user types and selects text
      await cmContent.pressSequentially('Hello World')
      await cmContent.press('Meta+a') // Select all

      // When: user presses Cmd+B
      await cmContent.press('Meta+b')

      // Then: text is wrapped with **
      await expect(cmContent).toContainText('**Hello World**')
    })

    test('should insert ** markers with cursor in middle when no selection', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: empty editor
      await page.waitForTimeout(200) // Wait for focus to be ready
      
      // When: user presses Cmd+B
      await page.keyboard.press('Meta+b')

      // Then: ** markers are inserted
      await expect(cmContent).toContainText('****')

      // And: user can type between markers
      await cmContent.pressSequentially('bold text')
      await expect(cmContent).toContainText('**bold text**')
    })

    test('should remove ** markers when text is already bold', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: text is already bold
      await cmContent.pressSequentially('**bold text**')
      
      // Select "bold text" (without markers)
      await page.keyboard.press('Home')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Shift+ArrowRight')
      await page.keyboard.press('Shift+ArrowRight')
      await page.keyboard.press('Shift+ArrowRight')
      await page.keyboard.press('Shift+ArrowRight')
      await page.keyboard.press('Shift+ArrowRight')
      await page.keyboard.press('Shift+ArrowRight')
      await page.keyboard.press('Shift+ArrowRight')
      await page.keyboard.press('Shift+ArrowRight')
      await page.keyboard.press('Shift+ArrowRight')

      // When: user presses Cmd+B
      await page.keyboard.press('Meta+b')

      // Then: ** markers are removed
      const text = await cmContent.textContent()
      expect(text).toBe('bold text')
    })
  })

  test.describe('Cmd+I (Italic)', () => {
    test('should wrap selected text with *', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: user types and selects text
      await cmContent.pressSequentially('Hello World')
      await page.keyboard.press('Meta+a')

      // When: user presses Cmd+I
      await page.keyboard.press('Meta+i')

      // Then: text is wrapped with *
      await expect(cmContent).toContainText('*Hello World*')
    })

    test('should insert * markers with cursor in middle when no selection', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: empty editor
      await page.waitForTimeout(200) // Wait for focus to be ready
      
      // When: user presses Cmd+I
      await page.keyboard.press('Meta+i')

      // Then: * markers are inserted
      await expect(cmContent).toContainText('**')

      // And: user can type between markers
      await cmContent.pressSequentially('italic text')
      await expect(cmContent).toContainText('*italic text*')
    })

    test('should remove * markers when text is already italic', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: text is already italic
      await cmContent.pressSequentially('*italic text*')
      
      // Select "italic text" (without markers) using Shift+End
      await page.keyboard.press('Home')
      await page.keyboard.press('ArrowRight') // Move past first *
      await page.keyboard.down('Shift')
      await page.keyboard.press('End')
      await page.keyboard.up('Shift')
      await page.keyboard.press('Shift+ArrowLeft') // Deselect last *

      // When: user presses Cmd+I
      await page.keyboard.press('Meta+i')

      // Then: * markers are removed
      const text = await cmContent.textContent()
      expect(text).toBe('italic text')
    })
  })

  test.describe('Cmd+E (Inline Code)', () => {
    test('should wrap selected text with backticks', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: user types and selects text
      await cmContent.pressSequentially('console.log')
      await page.waitForTimeout(100) // Wait for text to be rendered
      await page.keyboard.press('Meta+a')
      await page.waitForTimeout(50) // Wait for selection to be stable

      // When: user presses Cmd+E
      await page.keyboard.press('Meta+e')
      await page.waitForTimeout(100) // Wait for formatting to apply

      // Then: text is wrapped with backticks
      await expect(cmContent).toContainText('`console.log`')
    })

    test('should insert backticks with cursor in middle when no selection', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // When: user presses Cmd+E
      await page.keyboard.press('Meta+e')

      // Then: backticks are inserted
      await expect(cmContent).toContainText('``')

      // And: user can type between markers
      await cmContent.pressSequentially('code', { delay: 50 })
      await expect(cmContent).toContainText('`code`')
    })

    test('should remove backticks when text is already code', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: text is already code
      await cmContent.pressSequentially('`code text`')
      await page.waitForTimeout(100) // Wait for text to be rendered
      
      // Select "code text" (without markers) using Shift+End
      await page.keyboard.press('Home')
      await page.keyboard.press('ArrowRight') // Move past first `
      await page.keyboard.down('Shift')
      await page.keyboard.press('End')
      await page.keyboard.up('Shift')
      await page.keyboard.press('Shift+ArrowLeft') // Deselect last `
      await page.waitForTimeout(50) // Wait for selection to be stable

      // When: user presses Cmd+E
      await page.keyboard.press('Meta+e')
      await page.waitForTimeout(100) // Wait for formatting to apply

      // Then: backticks are removed
      const text = await cmContent.textContent()
      expect(text).toBe('code text')
    })
  })

  test.describe('Cmd+K (Link)', () => {
    test('should insert link template with selected text', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: user types and selects text
      await cmContent.pressSequentially('Click here')
      await page.keyboard.press('Meta+a')

      // When: user presses Cmd+K
      await page.keyboard.press('Meta+k')

      // Then: link template is inserted
      await expect(cmContent).toContainText('[Click here](url)')
    })

    test('should insert link template with cursor on url when no selection', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // When: user presses Cmd+K
      await page.keyboard.press('Meta+k')

      // Then: link template is inserted
      await expect(cmContent).toContainText('[text](url)')

      // And: user can type the URL
      await cmContent.pressSequentially('https://example.com')
      await expect(cmContent).toContainText('[text](https://example.com)')
    })
  })

  test.describe('Combined formatting', () => {
    test('should support bold + italic', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: user types text
      await cmContent.pressSequentially('important')
      await page.keyboard.press('Meta+a')

      // When: user applies bold then italic
      await page.keyboard.press('Meta+b')
      await page.keyboard.press('Meta+i')

      // Then: text has both formats
      await expect(cmContent).toContainText('***important***')
    })

    test('should support code inside bold', async ({ page }) => {
      const cmContent = page.locator('.cm-content')

      // Given: user types text
      await cmContent.pressSequentially('const x = 1')
      await page.keyboard.press('Meta+a')

      // When: user applies code then bold
      await page.keyboard.press('Meta+e')
      await page.keyboard.press('Meta+a')
      await page.keyboard.press('Meta+b')

      // Then: text has both formats
      await expect(cmContent).toContainText('**`const x = 1`**')
    })
  })
})
