import { test, expect } from './helpers/setup'

/**
 * BUG-010: Tokens POLISH-001 non appliqués dans l'éditeur
 * 
 * Vérifie que les tokens CSS définis dans tokens.css sont correctement appliqués
 * aux éléments CodeMirror de l'éditeur.
 */
test.describe('Editor POLISH-001 Tokens @e2e', () => {
  test.beforeEach(async ({ page }) => {
    // Attendre que l'app charge
    await page.waitForSelector('[data-testid="notes-list"]')
    await page.waitForTimeout(500)

    // Créer une nouvelle note
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    await newNoteButton.click()

    // Attendre que l'éditeur soit visible
    const editor = page.locator('[data-testid="codemirror-editor"]')
    await expect(editor).toBeVisible({ timeout: 5000 })
  })

  test('should apply --editor-font-size token (16px)', async ({ page }) => {
    // Given: l'éditeur est ouvert
    const cmEditor = page.locator('.cm-editor')
    await expect(cmEditor).toBeVisible()

    // When: on récupère le font-size calculé
    const fontSize = await cmEditor.evaluate((el) => {
      return window.getComputedStyle(el).fontSize
    })

    // Then: le font-size doit être 16px
    expect(fontSize).toBe('16px')
  })

  test('should apply --editor-max-width token (700px) to .cm-content', async ({ page }) => {
    // Given: l'éditeur est ouvert
    const cmContent = page.locator('.cm-content')
    await expect(cmContent).toBeVisible()

    // When: on récupère le max-width calculé
    const maxWidth = await cmContent.evaluate((el) => {
      return window.getComputedStyle(el).maxWidth
    })

    // Then: le max-width doit être 700px
    expect(maxWidth).toBe('700px')
  })

  test('should center .cm-content with margin auto', async ({ page }) => {
    // Given: l'éditeur est ouvert
    const cmContent = page.locator('.cm-content')
    await expect(cmContent).toBeVisible()

    // When: on récupère les marges calculées
    const margins = await cmContent.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        marginLeft: style.marginLeft,
        marginRight: style.marginRight,
      }
    })

    // Then: les marges doivent être auto (ou égales pour centrage)
    // Note: auto se résout en valeurs égales quand max-width est défini
    expect(margins.marginLeft).toBe(margins.marginRight)
  })

  test('should apply --editor-padding token (48px) to .cm-content', async ({ page }) => {
    // Given: l'éditeur est ouvert
    const cmContent = page.locator('.cm-content')
    await expect(cmContent).toBeVisible()

    // When: on récupère le padding calculé
    const padding = await cmContent.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return {
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
      }
    })

    // Then: le padding doit être 48px sur tous les côtés
    expect(padding.paddingLeft).toBe('48px')
    expect(padding.paddingRight).toBe('48px')
    expect(padding.paddingTop).toBe('48px')
    expect(padding.paddingBottom).toBe('48px')
  })

  test('should apply --editor-line-height token (1.7) to .cm-line', async ({ page }) => {
    // Given: l'éditeur est ouvert avec du contenu
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await page.waitForTimeout(100)
    await cmContent.pressSequentially('Test line', { delay: 50 })

    // When: on récupère le line-height calculé d'une ligne
    const cmLine = page.locator('.cm-line').first()
    const lineHeight = await cmLine.evaluate((el) => {
      return window.getComputedStyle(el).lineHeight
    })

    // Then: le line-height doit être 1.7 (ou équivalent en px)
    // Note: line-height peut être retourné en px, on vérifie le ratio
    const fontSize = await cmLine.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize)
    })
    const lineHeightPx = parseFloat(lineHeight)
    const ratio = lineHeightPx / fontSize

    // Tolérance de 0.01 pour les arrondis
    expect(ratio).toBeGreaterThanOrEqual(1.69)
    expect(ratio).toBeLessThanOrEqual(1.71)
  })

  test('should not exceed max-width when typing long lines', async ({ page }) => {
    // Given: l'éditeur est ouvert
    const cmContent = page.locator('.cm-content')
    await cmContent.click()
    await page.waitForTimeout(100)

    // When: on tape une très longue ligne
    const longText = 'This is a very long line that should wrap within the max-width constraint of 700px and not extend beyond the editor boundaries. '.repeat(5)
    await page.evaluate((text: string) => {
      const view = (window as any).__brio_editorView
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text }
        })
      }
    }, longText)

    // Then: le contenu ne dépasse pas 700px de largeur
    const contentWidth = await cmContent.evaluate((el) => {
      return el.getBoundingClientRect().width
    })

    // Le contenu doit être <= 700px (max-width) + padding (48px * 2)
    // Donc <= 796px au total
    expect(contentWidth).toBeLessThanOrEqual(796)
  })
})
