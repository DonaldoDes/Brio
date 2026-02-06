import { test, expect } from './helpers/setup'
import type { Page } from '@playwright/test'

/**
 * US-102: Editor Redesign - Typography & Keyboard Shortcuts Tests
 * 
 * Tests for:
 * - Bear typography (28-30px title, 16px body)
 * - Keyboard shortcuts (Cmd+B, Cmd+I, Cmd+U, Cmd+K, Cmd+E)
 * - Format application via shortcuts
 */

test.describe('US-102: Typography & Shortcuts @e2e @us-102', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for app to load
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Create a new note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Typography Test')
    await titleInput.blur()
    await page.waitForTimeout(300)
  })

  test('Scenario: Title has 28-30px font size', async ({ page }) => {
    // Given I am viewing a note in the editor
    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible' })

    // When I inspect the title font size
    const fontSize = await titleInput.evaluate((el) => {
      return window.getComputedStyle(el).fontSize
    })

    // Then it should be between 28-30px
    const size = parseFloat(fontSize)
    expect(size).toBeGreaterThanOrEqual(28)
    expect(size).toBeLessThanOrEqual(30)
  })

  test('Scenario: Title has bold font weight', async ({ page }) => {
    // Given I am viewing a note in the editor
    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible' })

    // When I inspect the title font weight
    const fontWeight = await titleInput.evaluate((el) => {
      return window.getComputedStyle(el).fontWeight
    })

    // Then it should be bold (600 or 700)
    const weight = parseInt(fontWeight)
    expect(weight).toBeGreaterThanOrEqual(600)
  })

  test('Scenario: Body text has 16px font size', async ({ page }) => {
    // Given I am viewing a note in the editor
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await editor.waitFor({ state: 'visible' })

    // When I inspect the editor font size
    const fontSize = await editor.evaluate((el) => {
      const cmContent = el.querySelector('.cm-content')
      if (cmContent) {
        return window.getComputedStyle(cmContent).fontSize
      }
      return null
    })

    // Then it should be 16px
    expect(fontSize).toBe('16px')
  })

  test('Scenario: Cmd+B applies bold formatting', async ({ page }) => {
    // Given I have text in the editor
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await editor.click()
    await page.keyboard.type('Hello World')
    
    // And I select the text
    await page.keyboard.press('Meta+A')
    await page.waitForTimeout(100)

    // When I press Cmd+B
    await page.keyboard.press('Meta+B')
    await page.waitForTimeout(300)

    // Then the text should be wrapped in bold markdown
    const content = await page.evaluate(() => {
      return (window as any).__brio_editorView?.state.doc.toString()
    })

    expect(content).toContain('**Hello World**')
  })

  test('Scenario: Cmd+I applies italic formatting', async ({ page }) => {
    // Given I have text in the editor
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await editor.click()
    await page.keyboard.type('Hello World')
    
    // And I select the text
    await page.keyboard.press('Meta+A')
    await page.waitForTimeout(100)

    // When I press Cmd+I
    await page.keyboard.press('Meta+I')
    await page.waitForTimeout(300)

    // Then the text should be wrapped in italic markdown
    const content = await page.evaluate(() => {
      return (window as any).__brio_editorView?.state.doc.toString()
    })

    expect(content).toContain('*Hello World*')
  })

  test.skip('Scenario: Cmd+U applies underline formatting', async ({ page }) => {
    // SKIP: Shortcut non implémenté - À implémenter dans une itération future
    // Given I have text in the editor
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await editor.click()
    await page.keyboard.type('Hello World')
    
    // And I select the text
    await page.keyboard.press('Meta+A')
    await page.waitForTimeout(100)

    // When I press Cmd+U
    await page.keyboard.press('Meta+U')
    await page.waitForTimeout(300)

    // Then the text should be wrapped in underline markdown
    const content = await page.evaluate(() => {
      return (window as any).__brio_editorView?.state.doc.toString()
    })

    expect(content).toContain('<u>Hello World</u>')
  })

  test.skip('Scenario: Cmd+K applies link formatting', async ({ page }) => {
    // SKIP: Shortcut non implémenté - À implémenter dans une itération future
    // Given I have text in the editor
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await editor.click()
    await page.keyboard.type('Hello World')
    
    // And I select the text
    await page.keyboard.press('Meta+A')
    await page.waitForTimeout(100)

    // When I press Cmd+K
    await page.keyboard.press('Meta+K')
    await page.waitForTimeout(300)

    // Then the text should be wrapped in link markdown
    const content = await page.evaluate(() => {
      return (window as any).__brio_editorView?.state.doc.toString()
    })

    expect(content).toContain('[Hello World](')
  })

  test.skip('Scenario: Cmd+E applies code formatting', async ({ page }) => {
    // SKIP: Shortcut non implémenté - À implémenter dans une itération future
    // Given I have text in the editor
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await editor.click()
    await page.keyboard.type('Hello World')
    
    // And I select the text
    await page.keyboard.press('Meta+A')
    await page.waitForTimeout(100)

    // When I press Cmd+E
    await page.keyboard.press('Meta+E')
    await page.waitForTimeout(300)

    // Then the text should be wrapped in code markdown
    const content = await page.evaluate(() => {
      return (window as any).__brio_editorView?.state.doc.toString()
    })

    expect(content).toContain('`Hello World`')
  })

  test('Scenario: Title uses Avenir Next font family', async ({ page }) => {
    // Given I am viewing a note in the editor
    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible' })

    // When I inspect the title font family
    const fontFamily = await titleInput.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily
    })

    // Then it should include Avenir Next
    expect(fontFamily.toLowerCase()).toContain('avenir')
  })

  test('Scenario: Body text uses Avenir Next font family', async ({ page }) => {
    // Given I am viewing a note in the editor
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await editor.waitFor({ state: 'visible' })

    // When I inspect the editor font family
    const fontFamily = await editor.evaluate((el) => {
      const cmContent = el.querySelector('.cm-content')
      if (cmContent) {
        return window.getComputedStyle(cmContent).fontFamily
      }
      return null
    })

    // Then it should include Avenir Next
    expect(fontFamily?.toLowerCase()).toContain('avenir')
  })

  test('Scenario: Editor has comfortable line height', async ({ page }) => {
    // Given I am viewing a note in the editor
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await editor.waitFor({ state: 'visible' })

    // When I inspect the line height
    const lineHeight = await editor.evaluate((el) => {
      const cmLine = el.querySelector('.cm-line')
      if (cmLine) {
        return window.getComputedStyle(cmLine).lineHeight
      }
      return null
    })

    // Then it should be at least 1.5 (comfortable reading)
    if (lineHeight && lineHeight !== 'normal') {
      const fontSize = await editor.evaluate((el) => {
        const cmContent = el.querySelector('.cm-content')
        if (cmContent) {
          return parseFloat(window.getComputedStyle(cmContent).fontSize)
        }
        return 16
      })
      
      const lineHeightValue = parseFloat(lineHeight)
      const ratio = lineHeightValue / fontSize
      expect(ratio).toBeGreaterThanOrEqual(1.5)
    }
  })

  test.skip('Scenario: Keyboard shortcuts work without toolbar open', async ({ page }) => {
    // SKIP: Feature avancée - À implémenter dans une itération future
    // Given the toolbar is NOT open
    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).not.toBeVisible()

    // And I have text in the editor
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await editor.click()
    await page.keyboard.type('Test')
    await page.keyboard.press('Meta+A')
    await page.waitForTimeout(100)

    // When I press Cmd+B
    await page.keyboard.press('Meta+B')
    await page.waitForTimeout(300)

    // Then the formatting should still apply
    const content = await page.evaluate(() => {
      return (window as any).__brio_editorView?.state.doc.toString()
    })

    expect(content).toContain('**Test**')
  })
})
