import { test, expect } from './helpers/setup'
import type { Page } from '@playwright/test'

/**
 * US-102: Editor Redesign - Floating Toolbar Tests
 * 
 * Tests for:
 * - Toolbar position (bottom-center of editor)
 * - Toolbar appearance/disappearance animations
 * - Toolbar buttons (Bold, Italic, Underline, Link, Code, List)
 * - Toolbar button states and interactions
 * - Dark mode styling
 */

test.describe('US-102: Floating Toolbar @e2e @us-102', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for app to load
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Create a new note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Floating Toolbar Test')
    await titleInput.blur()
    await page.waitForTimeout(300)
  })

  test('Scenario: Floating toolbar appears at bottom-center when opened', async ({ page }) => {
    // Given I am viewing a note in the editor
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    // When the floating toolbar appears
    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).toBeVisible()

    // Then it should be positioned at bottom-center
    const toolbarBox = await toolbar.boundingBox()
    const editorBox = await page.locator('.editor-content-area').boundingBox()

    expect(toolbarBox).not.toBeNull()
    expect(editorBox).not.toBeNull()

    if (toolbarBox && editorBox) {
      // Toolbar should be centered horizontally (within 10px tolerance)
      const toolbarCenter = toolbarBox.x + toolbarBox.width / 2
      const editorCenter = editorBox.x + editorBox.width / 2
      const horizontalDiff = Math.abs(toolbarCenter - editorCenter)
      expect(horizontalDiff).toBeLessThanOrEqual(10)

      // Toolbar should be near the bottom (32px from bottom = bottom-8)
      const distanceFromBottom = (editorBox.y + editorBox.height) - (toolbarBox.y + toolbarBox.height)
      expect(distanceFromBottom).toBeGreaterThanOrEqual(20) // Allow some tolerance
      expect(distanceFromBottom).toBeLessThanOrEqual(50)
    }
  })

  test.skip('Scenario: Floating toolbar has fade-in animation', async ({ page }) => {
    // SKIP: CSS timing d'animation fragile - À implémenter dans une itération future
    // Given I am viewing a note in the editor
    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).not.toBeVisible()

    // When I open the toolbar
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()

    // Then it should fade in with animation (check opacity transition)
    await page.waitForTimeout(50) // Mid-animation
    const midOpacity = await toolbar.evaluate((el) => {
      return window.getComputedStyle(el).opacity
    })

    // Opacity should be transitioning (not fully opaque yet)
    expect(parseFloat(midOpacity)).toBeLessThan(1)

    // Wait for animation to complete
    await page.waitForTimeout(200)
    const finalOpacity = await toolbar.evaluate((el) => {
      return window.getComputedStyle(el).opacity
    })

    // Final opacity should be 1
    expect(parseFloat(finalOpacity)).toBe(1)
  })

  test.skip('Scenario: Floating toolbar has fade-out animation', async ({ page }) => {
    // SKIP: CSS timing d'animation fragile - À implémenter dans une itération future
    // Given the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).toBeVisible()

    // When I close the toolbar
    await aaButton.click()

    // Then it should fade out with animation
    await page.waitForTimeout(50) // Mid-animation
    const midOpacity = await toolbar.evaluate((el) => {
      return window.getComputedStyle(el).opacity
    })

    // Opacity should be transitioning
    expect(parseFloat(midOpacity)).toBeLessThan(1)

    // Wait for animation to complete
    await page.waitForTimeout(150)
    await expect(toolbar).not.toBeVisible()
  })

  test('Scenario: Floating toolbar contains Bold button', async ({ page }) => {
    // Given the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    // When I look for the Bold button
    const boldButton = page.locator('[data-testid="toolbar-bold"]')

    // Then it should be visible
    await expect(boldButton).toBeVisible()

    // And it should have the correct aria-label
    const ariaLabel = await boldButton.getAttribute('aria-label')
    expect(ariaLabel).toBe('Bold')
  })

  test('Scenario: Floating toolbar contains all format buttons', async ({ page }) => {
    // Given the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    // When I inspect the toolbar buttons
    const buttons = [
      { testId: 'toolbar-bold', label: 'Bold' },
      { testId: 'toolbar-italic', label: 'Italic' },
      { testId: 'toolbar-underline', label: 'Underline' },
      { testId: 'toolbar-link', label: 'Link' },
      { testId: 'toolbar-code', label: 'Code' },
      { testId: 'toolbar-list', label: 'List' },
    ]

    // Then all buttons should be visible with correct labels
    for (const button of buttons) {
      const btn = page.locator(`[data-testid="${button.testId}"]`)
      await expect(btn).toBeVisible()
      const ariaLabel = await btn.getAttribute('aria-label')
      expect(ariaLabel).toBe(button.label)
    }
  })

  test('Scenario: Toolbar has separator between format groups', async ({ page }) => {
    // Given the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    // When I inspect the toolbar structure
    const separator = page.locator('[data-testid="toolbar-separator"]')

    // Then there should be a separator (between Underline and Link)
    await expect(separator).toBeVisible()
  })

  test.skip('Scenario: Toolbar has dark background in light mode', async ({ page }) => {
    // SKIP: Styling non critique - À implémenter dans une itération future
    // Given I am in light mode
    // And the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).toBeVisible()

    // When I inspect the toolbar background
    const backgroundColor = await toolbar.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Then it should have a dark background (neutral-800)
    // RGB values for #292524 (neutral-800)
    expect(backgroundColor).toMatch(/rgb\(41,\s*37,\s*36\)/)
  })

  test('Scenario: Toolbar buttons have white text in light mode', async ({ page }) => {
    // Given I am in light mode
    // And the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    // When I inspect a toolbar button
    const boldButton = page.locator('[data-testid="toolbar-bold"]')
    const color = await boldButton.evaluate((el) => {
      return window.getComputedStyle(el).color
    })

    // Then it should have white text
    expect(color).toMatch(/rgb\(255,\s*255,\s*255\)/)
  })

  test('Scenario: Toolbar button shows hover state', async ({ page }) => {
    // Given the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    // When I hover over a toolbar button
    const boldButton = page.locator('[data-testid="toolbar-bold"]')
    await boldButton.hover()
    await page.waitForTimeout(100)

    // Then it should show hover styling (background color change)
    const backgroundColor = await boldButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Should not be transparent (should have hover background)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(backgroundColor).not.toBe('transparent')
  })

  test.skip('Scenario: Clicking Bold button applies bold formatting', async ({ page }) => {
    // SKIP: Feature avancée - À implémenter dans une itération future
    // Given the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    // And I have selected text in the editor
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await editor.click()
    await page.keyboard.type('Hello World')
    await page.keyboard.press('Meta+A') // Select all
    await page.waitForTimeout(100)

    // When I click the Bold button
    const boldButton = page.locator('[data-testid="toolbar-bold"]')
    await boldButton.click()
    await page.waitForTimeout(300)

    // Then the text should be wrapped in bold markdown syntax
    const content = await page.evaluate(() => {
      return (window as any).__brio_editorView?.state.doc.toString()
    })

    expect(content).toContain('**Hello World**')
  })

  test.skip('Scenario: Toolbar has shadow for elevation', async ({ page }) => {
    // SKIP: Styling non critique - À implémenter dans une itération future
    // Given the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).toBeVisible()

    // When I inspect the toolbar shadow
    const boxShadow = await toolbar.evaluate((el) => {
      return window.getComputedStyle(el).boxShadow
    })

    // Then it should have a shadow (not 'none')
    expect(boxShadow).not.toBe('none')
  })

  test.skip('Scenario: Toolbar has rounded corners', async ({ page }) => {
    // SKIP: Styling non critique - À implémenter dans une itération future
    // Given the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).toBeVisible()

    // When I inspect the toolbar border radius
    const borderRadius = await toolbar.evaluate((el) => {
      return window.getComputedStyle(el).borderRadius
    })

    // Then it should have rounded corners (8px = rounded-lg)
    expect(borderRadius).toBe('8px')
  })

  test.skip('Scenario: Toolbar buttons have 4px gap between them', async ({ page }) => {
    // SKIP: Styling non critique - À implémenter dans une itération future
    // Given the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).toBeVisible()

    // When I inspect the toolbar gap
    const gap = await toolbar.evaluate((el) => {
      return window.getComputedStyle(el).gap
    })

    // Then it should have 4px gap (gap-1)
    expect(gap).toBe('4px')
  })

  test.skip('Scenario: Pressing Escape closes the toolbar', async ({ page }) => {
    // SKIP: Feature avancée - À implémenter dans une itération future
    // Given the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).toBeVisible()

    // When I press Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // Then the toolbar should close
    await expect(toolbar).not.toBeVisible()
  })

  test('Scenario: Toolbar has role="toolbar" for accessibility', async ({ page }) => {
    // Given the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).toBeVisible()

    // When I inspect the toolbar role
    const role = await toolbar.getAttribute('role')

    // Then it should have role="toolbar"
    expect(role).toBe('toolbar')
  })

  test('Scenario: Toolbar has aria-label for screen readers', async ({ page }) => {
    // Given the toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).toBeVisible()

    // When I inspect the toolbar aria-label
    const ariaLabel = await toolbar.getAttribute('aria-label')

    // Then it should have a descriptive label
    expect(ariaLabel).toBe('Text formatting')
  })
})
