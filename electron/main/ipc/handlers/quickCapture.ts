/**
 * Quick Capture IPC handlers
 *
 * Secure communication layer for quick capture feature
 */

import { ipcMain } from 'electron'
import type { PGliteDB } from '../../database/client'
import { IPC_CHANNELS } from '../../../../shared/constants/channels'

/**
 * Setup IPC handlers for quick capture operations
 *
 * @param db - Initialized PGliteDB instance
 */
export function registerQuickCaptureHandlers(db: PGliteDB): void {
  // Save a quick capture
  ipcMain.handle(IPC_CHANNELS.QUICK_CAPTURE.SAVE, async (_, content: string): Promise<void> => {
    try {
      await db.saveQuickCapture(content)
    } catch (error) {
      console.error('[IPC] quickCapture:save error:', error)
      throw error
    }
  })

  // Get quick capture history
  ipcMain.handle(IPC_CHANNELS.QUICK_CAPTURE.GET_HISTORY, async (): Promise<string[]> => {
    try {
      return await db.getQuickCaptureHistory()
    } catch (error) {
      console.error('[IPC] quickCapture:getHistory error:', error)
      throw error
    }
  })

  console.log('[IPC] Quick Capture handlers registered successfully')
}

/**
 * Cleanup IPC handlers
 */
export function cleanupQuickCaptureIPC(): void {
  ipcMain.removeHandler(IPC_CHANNELS.QUICK_CAPTURE.SAVE)
  ipcMain.removeHandler(IPC_CHANNELS.QUICK_CAPTURE.GET_HISTORY)
}
