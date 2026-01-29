/**
 * Window IPC Handlers
 * Handles window management operations
 */

import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../../../shared/constants/channels'
import { APP_ROOT, RENDERER_DIST, VITE_DEV_SERVER_URL } from '../../constants'
import path from 'node:path'

// Use exported constants from constants.ts
const preload = path.join(APP_ROOT, 'dist-electron/preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

/**
 * Register window-related IPC handlers
 */
export function registerWindowHandlers(): void {
  // Open note in new window
  ipcMain.handle(IPC_CHANNELS.WINDOW.OPEN_NOTE, async (_, noteId: string) => {
    console.log('[IPC] Opening note in new window:', noteId)

    const newWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload,
      },
    })

    // Load the app with the note ID as a query parameter
    if (VITE_DEV_SERVER_URL) {
      await newWindow.loadURL(`${VITE_DEV_SERVER_URL}?noteId=${noteId}`)
    } else {
      await newWindow.loadFile(indexHtml, { query: { noteId } })
    }

    console.log('[IPC] New window created for note:', noteId)
  })

  console.log('[IPC] Window handlers registered successfully')
}

/**
 * Cleanup window IPC handlers
 */
export function cleanupWindowIPC(): void {
  ipcMain.removeHandler(IPC_CHANNELS.WINDOW.OPEN_NOTE)
}
