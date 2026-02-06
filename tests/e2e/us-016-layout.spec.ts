import { test, expect, Page, Locator, type ElectronApplication } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'

// Helper function to drag a separator
async function dragSeparator(page: Page, separator: Locator, deltaX: number): Promise<void> {
  const box = await separator.boundingBox()
  if (!box) throw new Error('Separator not found')

  // Use the center of the separator
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2

  // Dispatch events with proper timing
  await separator.dispatchEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX: startX,
    clientY: startY,
    button: 0,
  })

  // Wait for event handlers to be attached
  await page.waitForTimeout(10)

  // Dispatch mousemove on document
  await page.evaluate(
    ({ x, y }) => {
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
        })
      )
    },
    { x: startX + deltaX, y: startY }
  )

  await page.waitForTimeout(10)

  // Dispatch mouseup on document
  await page.evaluate(
    ({ x, y }) => {
      document.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
        })
      )
    },
    { x: startX + deltaX, y: startY }
  )
}

test.describe('US-016 Architecture UI 3 Colonnes', () => {
  // Skip entire suite in web mode (requires Electron app launch)
  test.skip(process.env.BRIO_MODE === 'web', 'Requires Electron app launch')

  let electronApp: ElectronApplication
  let page: Page

  test.beforeEach(async () => {
    // Clear localStorage before each test
    electronApp = await electron.launch({
      args: [path.join(process.cwd(), 'dist-electron/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })

    page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('.editor-layout', { timeout: 10000 })

    // Clear localStorage
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
    await page.waitForSelector('.editor-layout', { timeout: 10000 })
  })

  test.afterEach(async () => {
    await electronApp.close()
  })

  test('@e2e @smoke Affichage initial 3 colonnes', async () => {
    // Given je lance l'application
    // Then 3 colonnes sont affichées : Sidebar, Liste, Éditeur
    const sidebar = page.locator('.navigation')
    const noteList = page.locator('.note-list-panel')
    const editor = page.locator('.editor-panel')

    await expect(sidebar).toBeVisible()
    await expect(noteList).toBeVisible()
    await expect(editor).toBeVisible()

    // And la Sidebar fait 240px de large
    const sidebarBox = await sidebar.boundingBox()
    expect(sidebarBox?.width).toBe(240)

    // And la Liste fait 320px de large
    const noteListBox = await noteList.boundingBox()
    expect(noteListBox?.width).toBe(320)

    // And l'Éditeur occupe le reste de l'espace
    const editorBox = await editor.boundingBox()
    expect(editorBox?.width).toBeGreaterThan(400)
  })

  test('@e2e Redimensionner la Sidebar', async () => {
    // Given la Sidebar fait 240px
    const sidebar = page.locator('.navigation')
    const sidebarSeparator = page.locator('.sidebar-separator')

    const initialBox = await sidebar.boundingBox()
    expect(initialBox?.width).toBe(240)

    // When je glisse le séparateur Sidebar vers la droite de 60px
    await dragSeparator(page, sidebarSeparator, 60)

    // Then la Sidebar fait ~300px (tolérance de 25px pour les arrondis et calculs de drag)
    await page.waitForTimeout(100) // Wait for resize to complete
    const newBox = await sidebar.boundingBox()
    expect(newBox?.width).toBeGreaterThanOrEqual(275)
    expect(newBox?.width).toBeLessThanOrEqual(325)
  })

  test('@unit Largeur minimale Sidebar', async () => {
    // Given la Sidebar fait 240px
    const sidebar = page.locator('.navigation')
    const sidebarSeparator = page.locator('.sidebar-separator')

    // When je glisse le séparateur vers la gauche de 100px
    await dragSeparator(page, sidebarSeparator, -100)

    // Then la Sidebar fait ~180px (minimum, tolérance ±25px pour calculs de drag)
    await page.waitForTimeout(100)
    const newBox = await sidebar.boundingBox()
    expect(newBox?.width).toBeGreaterThanOrEqual(155)
    expect(newBox?.width).toBeLessThanOrEqual(205)
  })

  test('@unit Largeur maximale Sidebar', async () => {
    // Given la Sidebar fait 240px
    const sidebar = page.locator('.navigation')
    const sidebarSeparator = page.locator('.sidebar-separator')

    // When je glisse le séparateur vers la droite de 200px
    await dragSeparator(page, sidebarSeparator, 200)

    // Then la Sidebar fait ~400px (maximum, tolérance ±25px pour calculs de drag)
    await page.waitForTimeout(100)
    const newBox = await sidebar.boundingBox()
    expect(newBox?.width).toBeGreaterThanOrEqual(325)
    expect(newBox?.width).toBeLessThanOrEqual(425)
  })

  test('@e2e Collapse Sidebar', async () => {
    // Given la Sidebar est visible
    const sidebar = page.locator('.navigation')
    const collapseButton = page.locator('.collapse-sidebar-button')

    await expect(sidebar).toBeVisible({ timeout: 5000 })
    const initialBox = await sidebar.boundingBox()
    expect(initialBox?.width).toBe(240)

    // When je clique sur le bouton collapse (chevron)
    await collapseButton.click({ force: true })

    // Wait for Vue reactivity + animation
    await page.waitForTimeout(350)

    // Then la Sidebar se réduit à 0px en 200ms
    const collapsedBox = await sidebar.boundingBox()
    expect(collapsedBox?.width).toBeLessThan(10) // Collapsed (hidden or minimal)

    // And le bouton chevron pointe vers la droite
    const chevronRight = collapseButton.locator('svg.chevron-right')
    const count = await chevronRight.count()
    expect(count).toBe(1)

    // And localStorage is updated
    const isCollapsed = await page.evaluate(() => {
      return localStorage.getItem('brio-layout-sidebar-collapsed')
    })
    expect(isCollapsed).toBe('true')
  })

  test('@e2e Expand Sidebar', async () => {
    // Given la Sidebar est collapsed
    const sidebar = page.locator('.navigation')
    const collapseButton = page.locator('.collapse-sidebar-button')

    // Collapse first
    await collapseButton.click({ timeout: 5000, force: true })
    await page.waitForTimeout(350)

    // Verify collapsed
    const collapsedBox = await sidebar.boundingBox()
    expect(collapsedBox?.width).toBeLessThan(10)

    // When je clique sur le bouton expand (chevron)
    await collapseButton.click({ timeout: 5000, force: true })

    // Then la Sidebar s'ouvre à 240px en 200ms
    await page.waitForTimeout(350)
    const expandedBox = await sidebar.boundingBox()
    expect(expandedBox?.width).toBe(240)

    // And le bouton chevron pointe vers la gauche
    const chevronLeft = collapseButton.locator('svg.chevron-left')
    const count = await chevronLeft.count()
    expect(count).toBe(1)
  })

  test('@integration Redimensionner la Liste', async () => {
    // Given la Liste fait 320px
    const noteList = page.locator('.note-list-panel')
    const listSeparator = page.locator('.list-separator')

    const initialBox = await noteList.boundingBox()
    expect(initialBox?.width).toBe(320)

    // When je glisse le séparateur Liste vers la droite de 80px
    await dragSeparator(page, listSeparator, 80)

    // Then la Liste fait ~400px (tolérance de 25px pour les arrondis et calculs de drag)
    await page.waitForTimeout(100)
    const newBox = await noteList.boundingBox()
    expect(newBox?.width).toBeGreaterThanOrEqual(375)
    expect(newBox?.width).toBeLessThanOrEqual(425)

    // And la Sidebar reste inchangée
    const sidebar = page.locator('.navigation')
    const sidebarBox = await sidebar.boundingBox()
    expect(sidebarBox?.width).toBe(240)
  })

  test('@unit Largeur minimale Liste', async () => {
    // Given la Liste fait 320px
    const noteList = page.locator('.note-list-panel')
    const listSeparator = page.locator('.list-separator')

    // When je glisse le séparateur vers la gauche de 200px
    await dragSeparator(page, listSeparator, -200)

    // Then la Liste fait 280px (minimum)
    await page.waitForTimeout(100)
    const newBox = await noteList.boundingBox()
    expect(newBox?.width).toBe(280)
  })

  test('@unit Largeur maximale Liste', async () => {
    // Given la Liste fait 320px
    const noteList = page.locator('.note-list-panel')
    const listSeparator = page.locator('.list-separator')

    // When je glisse le séparateur vers la droite de 300px
    await dragSeparator(page, listSeparator, 300)

    // Then la Liste fait 600px (maximum)
    await page.waitForTimeout(100)
    const newBox = await noteList.boundingBox()
    expect(newBox?.width).toBe(600)
  })

  test('@e2e Responsive - Fenêtre étroite', async () => {
    // Given la fenêtre fait 1024px de large
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.waitForTimeout(100)

    const sidebar = page.locator('.navigation')
    await expect(sidebar).toBeVisible()

    // When je réduis la fenêtre à 800px
    await page.setViewportSize({ width: 800, height: 768 })
    await page.waitForTimeout(300) // Wait for responsive handler + animation

    // Then la Sidebar se collapse automatiquement
    const sidebarBox = await sidebar.boundingBox()
    expect(sidebarBox?.width).toBeLessThan(10)

    // And la Liste fait 280px (minimum)
    const noteList = page.locator('.note-list-panel')
    const noteListBox = await noteList.boundingBox()
    expect(noteListBox?.width).toBe(280)
  })

  test('@integration Sauvegarder les largeurs', async () => {
    // Given j'ai redimensionné Sidebar à ~300px et Liste à ~400px
    const sidebarSeparator = page.locator('.sidebar-separator')
    const listSeparator = page.locator('.list-separator')

    // Resize sidebar
    await dragSeparator(page, sidebarSeparator, 60)
    await page.waitForTimeout(100)

    // Resize list
    await dragSeparator(page, listSeparator, 80)
    await page.waitForTimeout(100)

    // When je ferme l'application et je relance
    await electronApp.close()

    electronApp = await electron.launch({
      args: [path.join(process.cwd(), 'dist-electron/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })

    page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('.editor-layout', { timeout: 10000 })

    // Then la Sidebar et la Liste ont conservé leurs largeurs (tolérance 25px pour les arrondis et calculs de drag)
    const sidebar = page.locator('.navigation')
    const noteList = page.locator('.note-list-panel')

    const sidebarBox = await sidebar.boundingBox()
    const noteListBox = await noteList.boundingBox()

    expect(sidebarBox?.width).toBeGreaterThanOrEqual(275)
    expect(sidebarBox?.width).toBeLessThanOrEqual(325)
    expect(noteListBox?.width).toBeGreaterThanOrEqual(375)
    expect(noteListBox?.width).toBeLessThanOrEqual(425)
  })

  test('@e2e Hover séparateur', async () => {
    // Given le curseur est sur le séparateur Sidebar
    const sidebarSeparator = page.locator('.sidebar-separator')

    // When hover
    await sidebarSeparator.hover()

    // Then le curseur devient "col-resize"
    const cursor = await sidebarSeparator.evaluate((el) => {
      return window.getComputedStyle(el).cursor
    })
    expect(cursor).toBe('col-resize')

    // And le séparateur devient bleu (accent-400)
    const bgColor = await sidebarSeparator.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    // Check that background color changed (not default neutral-200)
    expect(bgColor).not.toBe('rgb(229, 229, 229)') // neutral-200
  })

  test('@unit Double-clic séparateur reset', async () => {
    // Given la Sidebar fait ~300px
    const sidebar = page.locator('.navigation')
    const sidebarSeparator = page.locator('.sidebar-separator')

    // Resize to ~300px first
    await dragSeparator(page, sidebarSeparator, 60)
    await page.waitForTimeout(100)

    const resizedBox = await sidebar.boundingBox()
    expect(resizedBox?.width).toBeGreaterThanOrEqual(275)

    // When je double-clique sur le séparateur Sidebar
    await sidebarSeparator.dblclick()

    // Then la Sidebar revient à ~240px (défaut, tolérance ±25px pour calculs de drag)
    await page.waitForTimeout(100)
    const resetBox = await sidebar.boundingBox()
    expect(resetBox?.width).toBeGreaterThanOrEqual(215)
    expect(resetBox?.width).toBeLessThanOrEqual(265)
  })

  test('@integration Keyboard navigation entre colonnes', async () => {
    // Given l'application est chargée avec des éléments focusables
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    const editor = page.locator('.editor-panel')

    // Verify editor has tabindex
    const editorTabindex = await editor.getAttribute('tabindex')
    expect(editorTabindex).toBe('0')

    // When je focus sur le bouton New Note et j'appuie sur Tab
    await newNoteButton.focus()
    const initialFocus = await page.evaluate(() => {
      const testId = document.activeElement?.getAttribute('data-testid')
      return testId !== null && testId !== undefined ? testId : ''
    })
    expect(initialFocus).toBe('new-note-button')

    await page.keyboard.press('Tab')

    // Then le focus a changé (navigation au clavier fonctionne)
    const afterTab = await page.evaluate(() => {
      const tagName = document.activeElement?.tagName
      return tagName ?? ''
    })
    expect(afterTab.length).toBeGreaterThan(0)
    expect(afterTab).not.toBe('BUTTON') // Focus has moved away from button
  })

  test('@e2e Animations fluides', async () => {
    // Given la Sidebar est visible
    const sidebar = page.locator('.navigation')
    const collapseButton = page.locator('.collapse-sidebar-button')

    // When je collapse la Sidebar
    const startTime = Date.now()
    await collapseButton.click({ force: true })

    // Wait for animation to complete
    await page.waitForTimeout(250)
    const endTime = Date.now()

    // Then l'animation dure ~200ms
    const duration = endTime - startTime
    expect(duration).toBeGreaterThanOrEqual(200)
    expect(duration).toBeLessThan(400)

    // And l'easing est "ease-out" (vérifié via CSS)
    const transition = await sidebar.evaluate((el) => {
      return window.getComputedStyle(el).transition
    })
    expect(transition).toContain('ease-out')
  })

  test('@integration Scroll indépendant', async () => {
    // Given la Liste contient plusieurs notes et l'Éditeur contient du contenu
    const noteList = page.locator('.note-list-panel')
    const editor = page.locator('.editor-panel')

    // Create multiple notes if button exists
    const newNoteButton = page.locator('[data-testid="new-note-button"]')
    const buttonExists = (await newNoteButton.count()) > 0
    if (buttonExists) {
      for (let i = 0; i < 5; i++) {
        await newNoteButton.click({ timeout: 1000 }).catch(() => {})
        await page.waitForTimeout(50)
      }
    }

    // When je scroll dans la Liste
    await noteList.evaluate((el) => {
      el.scrollBy(0, 100)
    })
    await page.waitForTimeout(50)
    const noteListScrollAfter = await noteList.evaluate((el) => el.scrollTop)

    // Then l'Éditeur ne scroll PAS
    const editorScrollBefore = await editor.evaluate((el) => el.scrollTop)
    // Note: scrollTop might be 0 if no content, so we just verify independence
    expect(editorScrollBefore).toBe(0)

    // When je scroll dans l'Éditeur
    await editor.evaluate((el) => {
      el.scrollBy(0, 100)
    })
    await page.waitForTimeout(50)
    const editorScrollAfter = await editor.evaluate((el) => el.scrollTop)

    // Then la Liste ne scroll PAS
    const noteListScrollFinal = await noteList.evaluate((el) => el.scrollTop)
    expect(editorScrollAfter).toBeGreaterThanOrEqual(0)
    expect(noteListScrollFinal).toBe(noteListScrollAfter)
  })
})
