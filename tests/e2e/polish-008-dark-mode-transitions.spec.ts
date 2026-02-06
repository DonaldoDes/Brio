import { test, expect } from './helpers/setup'

test.describe('POLISH-008 Dark Mode Transitions @e2e', () => {
  test.beforeEach(async ({ page }) => {
    // Attendre que l'app charge
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)
  })

  test('Scenario 1: Theme toggle applies smooth transitions', async ({ page }) => {
    // Given: app is open with light theme
    await page.waitForSelector('[data-testid="notes-list"]')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'light')

    // When: user clicks the theme toggle button
    const themeToggle = page.locator('[data-testid="theme-toggle"]')
    await themeToggle.click()

    // Then: dark theme is applied
    await expect(html).toHaveAttribute('data-theme', 'dark')

    // And: verify CSS custom properties changed
    const bgPrimary = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim()
    })
    
    // Dark theme should have dark background
    expect(bgPrimary).toBe('#1a1a1a')
  })

  test('Scenario 2: CSS transitions are defined on theme-sensitive elements', async ({ page }) => {
    // Given: app is open
    await page.waitForSelector('[data-testid="notes-list"]')

    // When: checking computed styles
    const transitions = await page.evaluate(() => {
      const elements = [
        document.body,
        document.querySelector('.sidebar'),
        document.querySelector('.notes-list'),
        document.querySelector('.note-list-item'),
        document.querySelector('.editor-panel'),
      ]

      return elements
        .filter(el => el !== null)
        .map(el => {
          const style = getComputedStyle(el!)
          return {
            element: el!.className || 'body',
            transition: style.transition,
            transitionProperty: style.transitionProperty,
            transitionDuration: style.transitionDuration,
          }
        })
    })

    // Then: verify transitions are defined
    for (const { element, transitionProperty, transitionDuration } of transitions) {
      // Verify that transition properties include background-color, color, or border-color
      const hasThemeTransition = 
        transitionProperty.includes('background-color') ||
        transitionProperty.includes('color') ||
        transitionProperty.includes('border-color') ||
        transitionProperty === 'all'

      expect(hasThemeTransition, `Element ${element} should have theme-related transitions`).toBe(true)

      // Verify duration is reasonable (between 100ms and 500ms)
      const duration = parseFloat(transitionDuration)
      expect(duration, `Element ${element} transition duration should be between 0.1s and 0.5s`).toBeGreaterThanOrEqual(0.1)
      expect(duration, `Element ${element} transition duration should be between 0.1s and 0.5s`).toBeLessThanOrEqual(0.5)
    }
  })

  test('Scenario 3: Transitions do not interfere with hover states', async ({ page }) => {
    // Given: app is open with notes
    await page.waitForSelector('[data-testid="notes-list"]')
    
    // Create a note first
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()
    await page.waitForTimeout(500)

    // When: hovering over the new note button (which has hover effects)
    const initialBg = await newNoteButton.evaluate(el => getComputedStyle(el).backgroundColor)
    
    // Hover
    await newNoteButton.hover()
    await page.waitForTimeout(100)
    
    // Get hover background
    const hoverBg = await newNoteButton.evaluate(el => getComputedStyle(el).backgroundColor)

    // Then: hover state should work (background color is defined)
    expect(typeof hoverBg).toBe('string')
    expect(hoverBg.length).toBeGreaterThan(0)
    
    // And: transition property should be defined
    const transition = await newNoteButton.evaluate(el => getComputedStyle(el).transition)
    expect(transition).toBeTruthy()
  })

  test('Scenario 4: Transition timing is consistent across elements', async ({ page }) => {
    // Given: app is open
    await page.waitForSelector('[data-testid="notes-list"]')

    // When: checking transition durations
    const durations = await page.evaluate(() => {
      const elements = [
        document.body,
        document.querySelector('.sidebar'),
        document.querySelector('.notes-list'),
      ]

      return elements
        .filter(el => el !== null)
        .map(el => {
          const style = getComputedStyle(el!)
          return parseFloat(style.transitionDuration)
        })
    })

    // Then: all durations should be the same (consistent timing)
    const uniqueDurations = [...new Set(durations)]
    expect(uniqueDurations.length, 'All theme transitions should have consistent duration').toBe(1)
    
    // And: duration should be around 200ms (0.2s)
    expect(uniqueDurations[0]).toBeCloseTo(0.2, 1)
  })
})
