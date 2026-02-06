import { test, expect } from './helpers/setup'

test('Debug: Check if notes persist after reload', async ({ page }) => {
  // Create notes
  await page.evaluate(async () => {
    const api = (window as any).api.notes
    const noteId = await api.create('My Note', 'my-note', '')
    await api.updateType(noteId, 'note')
    console.log('Created note:', noteId)
  })

  // Check notes before reload
  const notesBefore = await page.evaluate(async () => {
    const notes = await (window as any).api.notes.getAll()
    console.log('Notes before reload:', notes)
    return notes
  })
  console.log('Notes before reload:', notesBefore)

  // Reload
  await page.reload()
  await page.waitForSelector('[data-testid="notes-list"]')
  await page.waitForFunction(() => (window as any).__brio_notesLoaded === true, { timeout: 5000 })
  await page.waitForTimeout(500)

  // Check notes after reload
  const notesAfter = await page.evaluate(async () => {
    const notes = await (window as any).api.notes.getAll()
    console.log('Notes after reload:', notes)
    return notes
  })
  console.log('Notes after reload:', notesAfter)

  // Check if note items are visible
  const noteItems = await page.locator('[data-testid="note-item"]').count()
  console.log('Note items visible:', noteItems)

  const noteIcons = await page.locator('[data-testid="note-type-icon"]').allTextContents()
  console.log('Note icons:', noteIcons)
})
