import { test, expect } from './helpers/setup'

test('Test button click', async ({ page }) => {
  await page.waitForSelector('[data-testid="notes-list"]')
  await page.waitForTimeout(1000)

  // Click the "+ New Note" button
  const newNoteButton = page.locator('[data-testid="new-note-button"]')
  await newNoteButton.click()

  // Wait for note to appear
  await page.waitForTimeout(2000)

  // Check if note appears
  const noteItem = page.locator('[data-testid="note-item"]').first()
  await expect(noteItem).toBeVisible({ timeout: 10000 })
})
