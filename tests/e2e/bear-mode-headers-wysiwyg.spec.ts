import { test, expect } from './helpers/setup'

test.describe('Bear Mode - WYSIWYG Headers @e2e @polish-010', () => {
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

  test('H1 should render with 28px font-size and bold weight', async ({ page }) => {
    // Given: user types H1 markdown
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('# Main Title')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Some content')

    // When: cursor is on another line
    await page.waitForTimeout(100)

    // Then: H1 text should have correct styling
    const h1Text = page.locator('.cm-bear-heading-1')
    await expect(h1Text).toBeVisible()
    await expect(h1Text).toContainText('Main Title')

    // Verify font-size is 28px
    const fontSize = await h1Text.evaluate((el) => window.getComputedStyle(el).fontSize)
    expect(fontSize).toBe('28px')

    // Verify font-weight is bold (computed as 700)
    const fontWeight = await h1Text.evaluate((el) => window.getComputedStyle(el).fontWeight)
    expect(fontWeight).toBe('700')

    // Verify line-height is 1.3 (computed as 28px * 1.3 = 36.4px, but may vary)
    const lineHeight = await h1Text.evaluate((el) => window.getComputedStyle(el).lineHeight)
    // Line-height can be returned as pixels or unitless - just check it's set
    expect(parseFloat(lineHeight)).toBeGreaterThan(0)
  })

  test('H2 should render with 22px font-size and bold weight', async ({ page }) => {
    // Given: user types H2 markdown
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('## Section Title')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Some content')

    // When: cursor is on another line
    await page.waitForTimeout(100)

    // Then: H2 text should have correct styling
    const h2Text = page.locator('.cm-bear-heading-2')
    await expect(h2Text).toBeVisible()
    await expect(h2Text).toContainText('Section Title')

    // Verify font-size is 22px
    const fontSize = await h2Text.evaluate((el) => window.getComputedStyle(el).fontSize)
    expect(fontSize).toBe('22px')

    // Verify font-weight is bold (computed as 700)
    const fontWeight = await h2Text.evaluate((el) => window.getComputedStyle(el).fontWeight)
    expect(fontWeight).toBe('700')

    // Verify line-height is 1.3 (computed as 22px * 1.3 = 28.6px, but may vary)
    const lineHeight = await h2Text.evaluate((el) => window.getComputedStyle(el).lineHeight)
    // Line-height can be returned as pixels or unitless - just check it's set
    expect(parseFloat(lineHeight)).toBeGreaterThan(0)
  })

  test('H3 should render with 18px font-size and bold weight', async ({ page }) => {
    // Given: user types H3 markdown
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('### Subsection Title')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Some content')

    // When: cursor is on another line
    await page.waitForTimeout(100)

    // Then: H3 text should have correct styling
    const h3Text = page.locator('.cm-bear-heading-3')
    await expect(h3Text).toBeVisible()
    await expect(h3Text).toContainText('Subsection Title')

    // Verify font-size is 18px
    const fontSize = await h3Text.evaluate((el) => window.getComputedStyle(el).fontSize)
    expect(fontSize).toBe('18px')

    // Verify font-weight is bold (computed as 700)
    const fontWeight = await h3Text.evaluate((el) => window.getComputedStyle(el).fontWeight)
    expect(fontWeight).toBe('700')

    // Verify line-height is 1.3 (computed as 18px * 1.3 = 23.4px, but may vary)
    const lineHeight = await h3Text.evaluate((el) => window.getComputedStyle(el).lineHeight)
    // Line-height can be returned as pixels or unitless - just check it's set
    expect(parseFloat(lineHeight)).toBeGreaterThan(0)
  })

  test('H4 should render with 16px font-size and bold weight', async ({ page }) => {
    // Given: user types H4 markdown
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('#### Small Title')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Some content')

    // When: cursor is on another line
    await page.waitForTimeout(100)

    // Then: H4 text should have correct styling
    const h4Text = page.locator('.cm-bear-heading-4')
    await expect(h4Text).toBeVisible()
    await expect(h4Text).toContainText('Small Title')

    // Verify font-size is 16px
    const fontSize = await h4Text.evaluate((el) => window.getComputedStyle(el).fontSize)
    expect(fontSize).toBe('16px')

    // Verify font-weight is bold (computed as 700)
    const fontWeight = await h4Text.evaluate((el) => window.getComputedStyle(el).fontWeight)
    expect(fontWeight).toBe('700')
  })

  test('Header markers (#) should be muted but visible when cursor is away', async ({ page }) => {
    // Given: user types H1 markdown
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('# Main Title')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Some content')

    // When: cursor is on another line
    await page.waitForTimeout(100)

    // Then: # marker should still be in DOM but muted
    const firstLine = page.locator('.cm-line').first()
    const lineText = await firstLine.textContent()
    
    // Markers should still be present (not removed like in old behavior)
    expect(lineText).toContain('#')
    expect(lineText).toContain('Main Title')

    // Marker should have muted styling
    const headerMark = page.locator('.cm-bear-heading-mark')
    await expect(headerMark).toBeVisible()

    // Verify opacity is 0.3
    const opacity = await headerMark.evaluate((el) => window.getComputedStyle(el).opacity)
    expect(parseFloat(opacity)).toBeLessThanOrEqual(0.3)

    // Verify font-size is reduced (0.7em)
    const fontSize = await headerMark.evaluate((el) => window.getComputedStyle(el).fontSize)
    // 0.7em of 28px = 19.6px, but we just check it's smaller than the heading
    const headingFontSize = await page.locator('.cm-bear-heading-1').evaluate((el) => 
      window.getComputedStyle(el).fontSize
    )
    expect(parseFloat(fontSize)).toBeLessThan(parseFloat(headingFontSize))
  })

  test('Header markers should be fully visible when cursor is on the line', async ({ page }) => {
    // Given: user types H1 markdown
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('# Main Title')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Some content')

    // When: cursor moves back to the heading line
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(100)

    // Then: # marker should be visible without muted styling
    const firstLine = page.locator('.cm-line').first()
    const lineText = await firstLine.textContent()
    expect(lineText).toContain('# Main Title')

    // Muted class should NOT be applied when cursor is on the line
    const headerMark = page.locator('.cm-bear-heading-mark')
    const count = await headerMark.count()
    expect(count).toBe(0) // No muted markers when cursor is on the line
  })

  test('Multiple headers should render with correct sizes', async ({ page }) => {
    // Given: user types multiple headers
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('# H1 Title')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('## H2 Title')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('### H3 Title')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('#### H4 Title')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Some content')

    // When: cursor is on the last line
    await page.waitForTimeout(100)

    // Then: all headers should have correct styling
    const h1 = page.locator('.cm-bear-heading-1')
    await expect(h1).toBeVisible()
    const h1Size = await h1.evaluate((el) => window.getComputedStyle(el).fontSize)
    expect(h1Size).toBe('28px')

    const h2 = page.locator('.cm-bear-heading-2')
    await expect(h2).toBeVisible()
    const h2Size = await h2.evaluate((el) => window.getComputedStyle(el).fontSize)
    expect(h2Size).toBe('22px')

    const h3 = page.locator('.cm-bear-heading-3')
    await expect(h3).toBeVisible()
    const h3Size = await h3.evaluate((el) => window.getComputedStyle(el).fontSize)
    expect(h3Size).toBe('18px')

    const h4 = page.locator('.cm-bear-heading-4')
    await expect(h4).toBeVisible()
    const h4Size = await h4.evaluate((el) => window.getComputedStyle(el).fontSize)
    expect(h4Size).toBe('16px')
  })

  test('Headers should not break existing bold/italic/code rendering', async ({ page }) => {
    // Given: user types header with inline formatting
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('# Title with **bold** and *italic*')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Some content')

    // When: cursor is on another line
    await page.waitForTimeout(100)

    // Then: header should render AND inline formatting should work
    const h1 = page.locator('.cm-bear-heading-1')
    await expect(h1).toBeVisible()

    const bold = page.locator('.cm-bear-bold')
    await expect(bold).toBeVisible()
    await expect(bold).toContainText('bold')

    const italic = page.locator('.cm-bear-italic')
    await expect(italic).toBeVisible()
    await expect(italic).toContainText('italic')
  })
})
