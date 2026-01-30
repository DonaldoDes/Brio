import { test, expect } from './electron'

test('Scenario 1: should open search with Cmd+F and focus input', async ({ page }) => {
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
