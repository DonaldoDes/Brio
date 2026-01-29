import { test, expect } from './electron'

test.describe('Bear Mode Debug @e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Clean all notes
    await page.evaluate(async () => {
      interface WindowWithAPI extends Window {
        api: {
          notes: {
            getAll: () => Promise<Array<{ id: string }>>
            delete: (id: string) => Promise<void>
          }
        }
      }
      const notes = await (window as WindowWithAPI).api.notes.getAll()
      for (const note of notes) {
        await (window as WindowWithAPI).api.notes.delete(note.id)
      }
    })

    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Create new note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()
    await page.waitForTimeout(300)
  })

  test('debug: inspect DOM structure', async ({ page }) => {
    // Capture console logs
    const consoleLogs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('[Bear Mode]')) {
        consoleLogs.push(msg.text())
      }
    })

    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('This is **bold text** here')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Another line')
    await page.waitForTimeout(500)
    
    console.log('=== CONSOLE LOGS ===')
    consoleLogs.forEach(log => console.log(log))

    // Inspect the DOM
    const html = await page.locator('.cm-editor').innerHTML()
    console.log('=== EDITOR HTML ===')
    console.log(html)
    
    // Check for classes
    const allClasses = await page.evaluate(() => {
      const elements = document.querySelectorAll('.cm-line *')
      const classes = new Set<string>()
      elements.forEach(el => {
        el.classList.forEach(cls => classes.add(cls))
      })
      return Array.from(classes).sort()
    })
    console.log('=== ALL CLASSES ===')
    console.log(allClasses)
    
    // Check console logs
    const logs = await page.evaluate(() => {
      return (window as any).__bearModeLogs || []
    })
    console.log('=== BEAR MODE LOGS ===')
    console.log(logs)
  })
})
