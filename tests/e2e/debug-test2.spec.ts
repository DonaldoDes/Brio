import { test, expect } from './helpers/setup'

test('Debug: Scenario 3 reproduction', async ({ page }) => {
  // Delete all notes (like beforeEach)
  await page.evaluate(async () => {
    const notes = await (window as any).api.notes.getAll()
    for (const note of notes) {
      await (window as any).api.notes.delete(note.id)
    }
  })
  await page.waitForTimeout(500)
  await page.reload()
  await page.waitForSelector('[data-testid="notes-list"]', { timeout: 10000 })
  await page.waitForTimeout(500)

  // Create notes with different types (like Scenario 3)
  await page.evaluate(async () => {
    const api = (window as any).api.notes
    const noteId = await api.create('My Note', 'my-note', '')
    const projectId = await api.create('My Project', 'my-project', '')
    const personId = await api.create('John Doe', 'john-doe', '')
    await api.updateType(noteId, 'note')
    await api.updateType(projectId, 'project')
    await api.updateType(personId, 'person')
  })

  // Reload to see changes
  await page.reload()
  await page.waitForSelector('[data-testid="notes-list"]')
  await page.waitForFunction(() => (window as any).__brio_notesLoaded === true, { timeout: 5000 })
  await page.waitForTimeout(500)

  // Debug: Check what we have
  const noteCount = await page.locator('[data-testid="note-item"]').count()
  console.log('Note items count:', noteCount)

  const iconCount = await page.locator('[data-testid="note-type-icon"]').count()
  console.log('Icon count:', iconCount)

  const noteIcons = await page.locator('[data-testid="note-type-icon"]').allTextContents()
  console.log('Note icons:', noteIcons)

  // Check notes in database
  const notesInDB = await page.evaluate(async () => {
    return await (window as any).api.notes.getAll()
  })
  console.log('Notes in DB:', notesInDB.length, notesInDB.map((n: any) => ({ title: n.title, type: n.type })))
})
