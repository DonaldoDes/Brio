/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { test, expect, Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'

// Skip entire suite in web mode (requires Electron app launch)
test.describe('Debug Drag', () => {
  test.skip(process.env.BRIO_MODE === 'web', 'Requires Electron app launch')
  let electronApp: any
  let page: Page

  test.beforeEach(async () => {
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
  })

  test.afterEach(async () => {
    await electronApp.close()
  })

  test('Debug drag event', async () => {
    const sidebar = page.locator('.navigation')
    const sidebarSeparator = page.locator('.sidebar-separator')

    // Check initial width
    const initialBox = await sidebar.boundingBox()
    console.log('Initial sidebar width:', initialBox?.width)

    // Get separator position
    const separatorBox = await sidebarSeparator.boundingBox()
    console.log('Separator box:', separatorBox)

    if (!separatorBox) throw new Error('Separator not found')

    // Try drag with dispatchEvent
    await sidebarSeparator.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const startX = rect.right
      const startY = rect.top + rect.height / 2

      // Dispatch mousedown
      el.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: startX,
          clientY: startY,
          button: 0,
        })
      )

      // Dispatch mousemove on document
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: startX + 60,
          clientY: startY,
          button: 0,
        })
      )

      // Dispatch mouseup on document
      document.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          clientX: startX + 60,
          clientY: startY,
          button: 0,
        })
      )
    })

    await page.waitForTimeout(200)

    // Check new width
    const newBox = await sidebar.boundingBox()
    console.log('New sidebar width:', newBox?.width)
    console.log('Expected: ~300px')
  })
})
