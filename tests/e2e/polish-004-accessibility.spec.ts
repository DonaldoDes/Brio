import { test, expect, isWebMode } from './helpers/setup'

test.describe('POLISH-004 Accessibility & Dark Mode @e2e @polish', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForSelector('[data-testid="notes-list"]', { timeout: 10000 })
    await page.waitForTimeout(500)
  })

  test('Scenario 1: QuickCaptureModal should not crash in web mode', async ({ page }) => {
    // Given: app is running in web mode (no window.api)
    if (!isWebMode) {
      test.skip()
      return
    }

    // When: QuickCaptureModal component is mounted
    // Then: no JavaScript errors should occur
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    // Trigger modal (if accessible via keyboard shortcut)
    await page.keyboard.press('Meta+Shift+N')
    await page.waitForTimeout(500)

    // Verify no errors related to window.api
    const apiErrors = errors.filter((e) => e.includes('window.api') || e.includes('ipcRenderer'))
    expect(apiErrors).toHaveLength(0)
  })

  test('Scenario 2: New Note button should have reduced saturation', async ({ page }) => {
    // Given: app is open
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await expect(newNoteButton).toBeVisible()

    // When: inspecting button opacity
    const opacity = await newNoteButton.evaluate((el) => {
      return window.getComputedStyle(el).opacity
    })

    // Then: opacity should be less than 1 (reduced saturation)
    expect(parseFloat(opacity)).toBeLessThan(1)
    expect(parseFloat(opacity)).toBeGreaterThanOrEqual(0.8) // At least 0.8 for visibility
  })

  test('Scenario 3: Dark mode colors should be consistent', async ({ page }) => {
    // Given: app is in dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
    })
    await page.waitForTimeout(300)

    // When: checking CSS variables
    const darkModeColors = await page.evaluate(() => {
      const root = document.documentElement
      const styles = window.getComputedStyle(root)
      return {
        bgPrimary: styles.getPropertyValue('--bg-primary').trim(),
        bgSecondary: styles.getPropertyValue('--bg-secondary').trim(),
        bgTertiary: styles.getPropertyValue('--bg-tertiary').trim(),
        textPrimary: styles.getPropertyValue('--text-primary').trim(),
        textSecondary: styles.getPropertyValue('--text-secondary').trim(),
        border: styles.getPropertyValue('--border').trim(),
      }
    })

    // Then: all dark mode colors should be defined and consistent
    expect(darkModeColors.bgPrimary).toBe('#1a1a1a')
    expect(darkModeColors.bgSecondary).toBe('#242424')
    expect(darkModeColors.bgTertiary).toBe('#2a2a2a')
    expect(darkModeColors.textPrimary).toBe('#e5e5e5')
    expect(darkModeColors.textSecondary).toBe('#a0a0a0')
    expect(darkModeColors.border).toBe('#333333')
  })

  test('Scenario 4: Interactive buttons should have aria-labels', async ({ page }) => {
    // Given: app is open
    await page.waitForSelector('[data-testid="notes-list"]')

    // When: checking interactive buttons without visible text
    const buttons = [
      { selector: '[data-testid="collapse-sidebar-button"]', expectedLabel: /Collapse|Expand/ },
      { selector: '.quick-capture-close', expectedLabel: 'Close' },
    ]

    for (const { selector, expectedLabel } of buttons) {
      const button = page.locator(selector).first()
      if (await button.count() > 0) {
        const ariaLabel = await button.getAttribute('aria-label')
        const title = await button.getAttribute('title')
        
        // Either aria-label or title should be present
        const hasAccessibleLabel = ariaLabel || title
        expect(hasAccessibleLabel).toBeTruthy()
        
        if (ariaLabel) {
          if (typeof expectedLabel === 'string') {
            expect(ariaLabel).toContain(expectedLabel)
          } else {
            expect(ariaLabel).toMatch(expectedLabel)
          }
        }
      }
    }
  })

  test('Scenario 5: Images should have alt text', async ({ page }) => {
    // Given: app is open
    await page.waitForSelector('[data-testid="notes-list"]')

    // When: checking all images
    const images = page.locator('img')
    const imageCount = await images.count()

    // Then: all images should have alt attribute
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      expect(alt).toBeTruthy()
    }
  })
})
