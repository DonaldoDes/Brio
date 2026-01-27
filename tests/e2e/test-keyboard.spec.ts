import { test, expect } from './electron'

test('Test keyboard shortcut on body', async ({ page }) => {
  await page.waitForSelector('[data-testid="notes-list"]')
  await page.waitForTimeout(1000)

  // Focus on body and send keyboard event
  await page.evaluate(() => {
    document.body.focus()
  })

  await page.keyboard.press('Meta+N')

  // Wait for note to appear
  await page.waitForTimeout(2000)

  // Check if note appears
  const noteItem = page.locator('[data-testid="note-item"]').first()
  await expect(noteItem).toBeVisible({ timeout: 10000 })
})
