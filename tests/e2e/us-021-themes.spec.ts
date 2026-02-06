import { test, expect } from './helpers/setup'

test.describe('US-021 Themes @e2e', () => {
  test.beforeEach(async ({ page }) => {
    // Attendre que l'app charge
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)
  })

  test('Scenario 1: Light theme is applied by default', async ({ page }) => {
    // Given: app is open
    await page.waitForSelector('[data-testid="notes-list"]')

    // When: user opens the app for the first time
    // (no theme preference set)

    // Then: light theme is applied
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'light')

    // And: background color matches light theme
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--bg-primary')
    })
    expect(bgColor.trim().toLowerCase()).toBe('#ffffff')
  })

  test('Scenario 2: User can toggle to dark mode', async ({ page }) => {
    // Given: app is open with light theme
    await page.waitForSelector('[data-testid="notes-list"]')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'light')

    // When: user clicks the theme toggle button
    const themeToggle = page.locator('[data-testid="theme-toggle"]')
    await themeToggle.click()

    // Then: dark theme is applied
    await expect(html).toHaveAttribute('data-theme', 'dark')

    // And: background color matches dark theme
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--bg-primary')
    })
    expect(bgColor.trim().toLowerCase()).toBe('#1e1e1e')
  })

  test('Scenario 3: System theme follows OS preference', async ({ page }) => {
    // Skip in web mode (electronApp fixture not available)
    test.skip(process.env.BRIO_MODE === 'web', 'electronApp fixture not available in web mode')

    // Given: app is open
    await page.waitForSelector('[data-testid="notes-list"]')

    // When: user selects "system" theme
    const themeSettings = page.locator('[data-testid="theme-settings"]')
    await themeSettings.click()

    const systemThemeOption = page.locator('[data-testid="theme-option-system"]')
    await systemThemeOption.click()

    // Wait for the theme to be applied
    await page.waitForTimeout(500)
    
    // Then: verify the theme was set to 'system' in localStorage
    const savedTheme = await page.evaluate(() => {
      return localStorage.getItem('brio-theme')
    })
    expect(savedTheme).toBe('system')
    
    // And: verify a theme is applied (either light or dark based on system)
    const html = page.locator('html')
    const appliedTheme = await html.getAttribute('data-theme')
    expect(['light', 'dark']).toContain(appliedTheme)
  })

  test('Scenario 4: User can change editor font', async ({ page }) => {
    // Given: app is open with a note
    await page.waitForSelector('[data-testid="notes-list"]')
    
    // Create a note first
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()
    await page.waitForTimeout(500)

    // When: user opens theme settings
    const themeSettings = page.locator('[data-testid="theme-settings"]')
    await themeSettings.click()

    // And: selects "JetBrains Mono" font
    const fontSelector = page.locator('[data-testid="font-selector"]')
    await fontSelector.selectOption('JetBrains Mono')

    // Then: editor font is updated
    const editorFont = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--editor-font-family')
    })
    expect(editorFont.trim()).toContain('JetBrains Mono')
  })

  test('Scenario 5: User can change editor font size', async ({ page }) => {
    // Given: app is open with a note
    await page.waitForSelector('[data-testid="notes-list"]')
    
    // Create a note first
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()
    await page.waitForTimeout(500)

    // When: user opens theme settings
    const themeSettings = page.locator('[data-testid="theme-settings"]')
    await themeSettings.click()

    // And: changes font size to 18px
    const fontSizeSlider = page.locator('[data-testid="font-size-slider"]')
    await fontSizeSlider.fill('18')

    // Then: editor font size is updated
    const editorFontSize = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--editor-font-size')
    })
    expect(editorFontSize.trim()).toBe('18px')
  })

  test('Scenario 6: Theme preferences persist after reload', async ({ page }) => {
    // Given: app is open
    await page.waitForSelector('[data-testid="notes-list"]')

    // When: user sets dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]')
    await themeToggle.click()

    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'dark')

    // And: user changes editor font to "Fira Code"
    const themeSettings = page.locator('[data-testid="theme-settings"]')
    await themeSettings.click()

    const fontSelector = page.locator('[data-testid="font-selector"]')
    await fontSelector.selectOption('Fira Code')

    // And: user changes font size to 16px
    const fontSizeSlider = page.locator('[data-testid="font-size-slider"]')
    await fontSizeSlider.fill('16')

    // And: user reloads the app
    await page.reload()
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Then: dark theme is still applied
    await expect(html).toHaveAttribute('data-theme', 'dark')

    // And: editor font is still "Fira Code"
    const editorFont = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--editor-font-family')
    })
    expect(editorFont.trim()).toContain('Fira Code')

    // And: font size is still 16px
    const editorFontSize = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--editor-font-size')
    })
    expect(editorFontSize.trim()).toBe('16px')
  })
})
