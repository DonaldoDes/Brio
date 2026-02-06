import { test, expect } from './helpers/setup'
import type { Page } from '@playwright/test'

/**
 * US-102: Editor Redesign - Aa Format Button Tests
 * 
 * Tests for:
 * - Aa button position (top-right of editor)
 * - Aa button states (default, hover, active, focus)
 * - Toggle floating toolbar functionality
 * - Keyboard shortcut (Cmd+Shift+F)
 */

test.describe('US-102: Aa Format Button @e2e @us-102', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for app to load
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Create a new note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    const titleInput = page.locator('[data-testid="note-title-input"]')
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill('Aa Button Test')
    await titleInput.blur()
    await page.waitForTimeout(300)
  })

  test('Scenario: Aa button is visible in top-right corner', async ({ page }) => {
    // Given I am viewing a note in the editor
    // When I look for the Aa format button
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.waitFor({ state: 'visible' })

    // Then it should be positioned in the top-right corner
    const buttonBox = await aaButton.boundingBox()
    const editorBox = await page.locator('.editor-content-area').boundingBox()

    expect(buttonBox).not.toBeNull()
    expect(editorBox).not.toBeNull()

    if (buttonBox && editorBox) {
      // Button should be near the top-right (within 20px)
      const distanceFromTop = buttonBox.y - editorBox.y
      const distanceFromRight = (editorBox.x + editorBox.width) - (buttonBox.x + buttonBox.width)
      
      expect(distanceFromTop).toBeLessThanOrEqual(20)
      expect(distanceFromRight).toBeLessThanOrEqual(20)
    }
  })

  test('Scenario: Aa button has ghost variant styling', async ({ page }) => {
    // Given I am viewing a note in the editor
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.waitFor({ state: 'visible' })

    // When I inspect the button styling
    const backgroundColor = await aaButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Then it should have transparent background (ghost variant)
    // rgba(0, 0, 0, 0) or transparent
    expect(['rgba(0, 0, 0, 0)', 'transparent']).toContain(backgroundColor)
  })

  test('Scenario: Clicking Aa button toggles toolbar open', async ({ page }) => {
    // Given I am viewing a note in the editor
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.waitFor({ state: 'visible' })

    // And the floating toolbar is not visible
    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).not.toBeVisible()

    // When I click the Aa button
    await aaButton.click()
    await page.waitForTimeout(250) // Wait for animation

    // Then the floating toolbar should appear
    await expect(toolbar).toBeVisible()

    // And the Aa button should show active state
    const isActive = await aaButton.evaluate((el) => {
      return el.getAttribute('aria-pressed') === 'true'
    })
    expect(isActive).toBe(true)
  })

  test('Scenario: Clicking Aa button again toggles toolbar closed', async ({ page }) => {
    // Given the floating toolbar is open
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.click()
    await page.waitForTimeout(250)

    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).toBeVisible()

    // When I click the Aa button again
    await aaButton.click()
    await page.waitForTimeout(200) // Wait for animation

    // Then the floating toolbar should disappear
    await expect(toolbar).not.toBeVisible()

    // And the Aa button should return to default state
    const isActive = await aaButton.evaluate((el) => {
      return el.getAttribute('aria-pressed') === 'true'
    })
    expect(isActive).toBe(false)
  })

  test('Scenario: Aa button shows hover state', async ({ page }) => {
    // Given I am viewing a note in the editor
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.waitFor({ state: 'visible' })

    // When I hover over the Aa button
    await aaButton.hover()
    await page.waitForTimeout(100)

    // Then it should show hover styling (background color change)
    const backgroundColor = await aaButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // Should not be transparent anymore
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(backgroundColor).not.toBe('transparent')
  })

  test('Scenario: Aa button has accessible label', async ({ page }) => {
    // Given I am viewing a note in the editor
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.waitFor({ state: 'visible' })

    // When I inspect the button accessibility
    const ariaLabel = await aaButton.getAttribute('aria-label')

    // Then it should have a descriptive label
    expect(ariaLabel).toBe('Toggle formatting toolbar')
  })

  test('Scenario: Aa button has aria-pressed attribute', async ({ page }) => {
    // Given I am viewing a note in the editor
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.waitFor({ state: 'visible' })

    // When I inspect the button state
    const ariaPressed = await aaButton.getAttribute('aria-pressed')

    // Then it should have aria-pressed attribute
    expect(ariaPressed).not.toBeNull()
    expect(['true', 'false']).toContain(ariaPressed)
  })

  test('Scenario: Keyboard shortcut Cmd+Shift+F toggles toolbar', async ({ page }) => {
    // Given I am viewing a note in the editor
    const toolbar = page.locator('[data-testid="floating-toolbar"]')
    await expect(toolbar).not.toBeVisible()

    // When I press Cmd+Shift+F (or Ctrl+Shift+F on Windows)
    const isMac = process.platform === 'darwin'
    if (isMac) {
      await page.keyboard.press('Meta+Shift+F')
    } else {
      await page.keyboard.press('Control+Shift+F')
    }
    await page.waitForTimeout(250)

    // Then the floating toolbar should appear
    await expect(toolbar).toBeVisible()

    // When I press the shortcut again
    if (isMac) {
      await page.keyboard.press('Meta+Shift+F')
    } else {
      await page.keyboard.press('Control+Shift+F')
    }
    await page.waitForTimeout(200)

    // Then the toolbar should disappear
    await expect(toolbar).not.toBeVisible()
  })

  test('Scenario: Aa button shows focus ring on keyboard focus', async ({ page }) => {
    // Given I am viewing a note in the editor
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.waitFor({ state: 'visible' })

    // When I focus the button using keyboard (Tab)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // May need multiple tabs to reach button
    await page.waitForTimeout(100)

    // Then it should show a focus ring
    const outline = await aaButton.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
      }
    })

    // Should have either outline or box-shadow for focus ring
    const hasFocusRing = outline.outline !== 'none' || outline.boxShadow !== 'none'
    expect(hasFocusRing).toBe(true)
  })

  test('Scenario: Aa button icon is Type (Lucide)', async ({ page }) => {
    // Given I am viewing a note in the editor
    const aaButton = page.locator('[data-testid="aa-format-button"]')
    await aaButton.waitFor({ state: 'visible' })

    // When I inspect the button content
    const hasIcon = await aaButton.locator('svg').count()

    // Then it should contain an SVG icon
    expect(hasIcon).toBeGreaterThan(0)

    // And the icon should be the Type icon (Aa representation)
    const iconClass = await aaButton.locator('svg').getAttribute('class')
    expect(iconClass).toContain('lucide')
  })
})
