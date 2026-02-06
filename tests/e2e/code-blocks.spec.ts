import { test, expect } from './helpers/setup'

test.describe('Code Blocks @e2e', () => {
  test.beforeEach(async ({ page }) => {
    // Attendre que l'app charge
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Supprimer toutes les notes existantes
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

    // Créer une nouvelle note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()
    await page.waitForTimeout(300)
  })

  test('should render code block with background', async ({ page }) => {
    // Given: user types a fenced code block
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('```javascript')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('const x = 1')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('```')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Normal text')

    // When: cursor moves away from the code block
    await page.waitForTimeout(100)

    // Then: code block should have a distinct background
    const codeBlock = page.locator('.cm-bear-code-block')
    await expect(codeBlock).toBeVisible()
    
    // Verify background color is different from normal text
    const codeBlockBg = await codeBlock.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    expect(codeBlockBg).not.toBe('rgba(0, 0, 0, 0)') // Not transparent
    expect(codeBlockBg).not.toBe('transparent')
  })

  test('should use monospace font in code block', async ({ page }) => {
    // Given: user types a code block
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('```')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('const x = 1')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('```')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Normal text')

    // When: cursor moves away
    await page.waitForTimeout(100)

    // Then: code content should use monospace font
    const codeBlock = page.locator('.cm-bear-code-block')
    const fontFamily = await codeBlock.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily
    })
    
    // Should contain monospace or a monospace font name
    const isMonospace = fontFamily.toLowerCase().includes('monospace') ||
                       fontFamily.toLowerCase().includes('monaco') ||
                       fontFamily.toLowerCase().includes('consolas') ||
                       fontFamily.toLowerCase().includes('courier')
    expect(isMonospace).toBe(true)
  })

  test('should hide fences when cursor outside block', async ({ page }) => {
    // Given: user types a code block
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('```javascript')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('const x = 1')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('```')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Normal text')

    // When: cursor is on the normal text line (outside block)
    await page.waitForTimeout(100)

    // Then: fence markers (```) should NOT be visible
    const allLines = page.locator('.cm-line')
    const lineCount = await allLines.count()
    
    let foundVisibleFence = false
    for (let i = 0; i < lineCount; i++) {
      const lineText = await allLines.nth(i).textContent()
      if (lineText?.includes('```')) {
        foundVisibleFence = true
        break
      }
    }
    
    expect(foundVisibleFence).toBe(false)
  })

  test('should reveal fences when cursor inside block', async ({ page }) => {
    // Given: user types a code block and moves cursor away
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('```javascript')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('const x = 1')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('```')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Normal text')
    await page.waitForTimeout(100)

    // When: cursor moves back into the code block
    await page.keyboard.press('ArrowUp') // Move to closing fence
    await page.keyboard.press('ArrowUp') // Move to code content
    await page.waitForTimeout(100)

    // Then: fence markers should be visible
    const allLines = page.locator('.cm-line')
    const lineCount = await allLines.count()
    
    let foundVisibleFence = false
    for (let i = 0; i < lineCount; i++) {
      const lineText = await allLines.nth(i).textContent()
      if (lineText?.includes('```')) {
        foundVisibleFence = true
        break
      }
    }
    
    expect(foundVisibleFence).toBe(true)
  })

  test('should handle code block without language specifier', async ({ page }) => {
    // Given: user types a code block without language
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('```')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('plain code')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('```')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Normal text')

    // When: cursor moves away
    await page.waitForTimeout(100)

    // Then: code block should still render with background
    const codeBlock = page.locator('.cm-bear-code-block')
    await expect(codeBlock).toBeVisible()
    await expect(codeBlock).toContainText('plain code')
  })

  test('should handle multiple code blocks in same note', async ({ page }) => {
    // Given: user types multiple code blocks
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await cmContent.pressSequentially('```javascript')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('const x = 1')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('```')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('Text between')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('```python')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('y = 2')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('```')
    await page.keyboard.press('Enter')
    await cmContent.pressSequentially('End')

    // When: cursor moves away
    await page.waitForTimeout(100)

    // Then: both code blocks should be visible
    const codeBlocks = page.locator('.cm-bear-code-block')
    await expect(codeBlocks).toHaveCount(2)
  })
})
