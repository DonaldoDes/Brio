import { test, expect } from './helpers/setup'

test.describe('Bear Mode Extension @e2e', () => {
  test.beforeEach(async ({ page }) => {
    // Attendre que l'app charge
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Supprimer toutes les notes existantes
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

    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Créer une nouvelle note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()
    await page.waitForTimeout(300)
  })

  test('should hide markdown syntax when cursor is not on the line', async ({ page }) => {
    // Given: user types markdown with bold syntax
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('This is **bold text** here')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Another line')

    // When: cursor moves to another line
    await page.waitForTimeout(100)

    // Then: bold syntax markers should NOT be visible in the first line
    const firstLine = page.locator('.cm-line').first()
    const lineText = await firstLine.textContent()
    // Markers are removed from DOM, so we should see "This is bold text here" without **
    expect(lineText).not.toContain('**')
    expect(lineText).toContain('bold text')
  })

  test('should reveal markdown syntax when cursor is on the line', async ({ page }) => {
    // Given: user types markdown with bold syntax
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('This is **bold text** here')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Another line')

    // When: cursor moves back to the first line
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(100)

    // Then: syntax markers should be visible (not replaced)
    const firstLine = page.locator('.cm-line').first()
    const lineText = await firstLine.textContent()
    // When cursor is on the line, markers are visible
    expect(lineText).toContain('**bold text**')
  })

  test('should apply bold styling to text between markers', async ({ page }) => {
    // Given: user types bold markdown
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('This is **bold text** here')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Another line')

    // When: cursor is on another line
    await page.waitForTimeout(100)

    // Then: text should have bold styling
    const boldText = page.locator('.cm-bear-bold')
    await expect(boldText).toBeVisible()
    await expect(boldText).toContainText('bold text')
  })

  test('should handle italic syntax', async ({ page }) => {
    // Given: user types italic markdown
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('This is *italic text* here')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Another line')

    // When: cursor is on another line
    await page.waitForTimeout(100)

    // Then: italic markers should NOT be visible and text styled
    const firstLine = page.locator('.cm-line').first()
    const lineText = await firstLine.textContent()
    // Count asterisks - should be 0 when markers are hidden
    const asteriskCount = (lineText?.match(/\*/g) || []).length
    expect(asteriskCount).toBe(0)

    const italicText = page.locator('.cm-bear-italic')
    await expect(italicText).toBeVisible()
    await expect(italicText).toContainText('italic text')
  })

  test('should handle inline code syntax', async ({ page }) => {
    // Given: user types inline code
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('This is `code` here')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Another line')

    // When: cursor is on another line
    await page.waitForTimeout(100)

    // Then: backticks should NOT be visible and code styled
    const firstLine = page.locator('.cm-line').first()
    const lineText = await firstLine.textContent()
    // Backticks should be removed from DOM
    expect(lineText).not.toContain('`')
    expect(lineText).toContain('code')

    const codeText = page.locator('.cm-bear-code')
    await expect(codeText).toBeVisible()
    await expect(codeText).toContainText('code')
  })

  test('should handle heading syntax', async ({ page }) => {
    // Given: user types a heading
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('# Main Title')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Some content')

    // When: cursor is on another line
    await page.waitForTimeout(100)

    // Then: # marker should be muted (visible but grayed) and text styled as H1
    const firstLine = page.locator('.cm-line').first()
    const lineText = await firstLine.textContent()
    // The # marker is now muted (not removed) for WYSIWYG rendering
    expect(lineText).toContain('#')
    expect(lineText).toContain('Main Title')

    const headingText = page.locator('.cm-bear-heading-1')
    await expect(headingText).toBeVisible()
    await expect(headingText).toContainText('Main Title')
    
    // Verify the marker is muted
    const headerMark = page.locator('.cm-bear-heading-mark')
    await expect(headerMark).toBeVisible()
  })

  test('should handle link syntax', async ({ page }) => {
    // Given: user types a link
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('Check [this link](https://example.com) out')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Another line')

    // When: cursor is on another line
    await page.waitForTimeout(100)

    // Then: link syntax should be hidden except the text
    const firstLine = page.locator('.cm-line').first()
    const lineText = await firstLine.textContent()
    // Should only see "Check this link out" without [, ], (, ), or URL
    expect(lineText).toContain('this link')
    expect(lineText).not.toContain('[')
    expect(lineText).not.toContain(']')
    expect(lineText).not.toContain('https://example.com')

    const linkText = page.locator('.cm-bear-link')
    await expect(linkText).toBeVisible()
    await expect(linkText).toContainText('this link')
  })

  test('should remove markers from DOM when cursor is away', async ({ page }) => {
    // Given: user types markdown
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('This is **bold** text')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Another line')

    // When: cursor moves away
    await page.waitForTimeout(100)

    // Then: markers should be completely removed from DOM (using Decoration.replace)
    const firstLine = page.locator('.cm-line').first()
    const lineText = await firstLine.textContent()
    expect(lineText).toBe('This is bold text')
    expect(lineText).not.toContain('**')
    
    // Bold styling should still be applied
    const boldText = page.locator('.cm-bear-bold')
    await expect(boldText).toBeVisible()
  })
})
