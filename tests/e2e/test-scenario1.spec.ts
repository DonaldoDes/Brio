import { test, expect, isWebMode } from './helpers/setup'

test('Scenario 1: should open search with Cmd+F and focus input', async ({ page }) => {
  test.skip(isWebMode, 'Cmd+F intercepted by browser in web mode')

  // Given: app is open
  await page.waitForSelector('[data-testid="notes-list"]', { timeout: 10000 })

  // And: search input is visible
  const searchInput = page.locator('[data-testid="search-input"]')
  await expect(searchInput).toBeVisible()

  // When: user presses Cmd+F
  await page.keyboard.press('Meta+F')

  // Then: search input is focused
  await expect(searchInput).toBeFocused()
})
