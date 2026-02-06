import { test, expect } from './helpers/setup'

test('Simple test', async ({ page }) => {
  await page.waitForSelector('[data-testid="notes-list"]', { timeout: 10000 })
  console.log('Notes list found')

  const searchInput = page.locator('[data-testid="search-input"]')
  const isVisible = await searchInput.isVisible()
  console.log('Search input visible:', isVisible)

  await expect(searchInput).toBeVisible()
  console.log('Test passed!')
})
