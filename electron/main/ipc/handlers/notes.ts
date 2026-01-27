/**
 * Notes IPC handlers
 *
 * Secure communication layer between main and renderer processes
 */

import { ipcMain } from 'electron'
import type { PGliteDB } from '../../database/client'
import type { Note } from '../../../../shared/types/note'
import { IPC_CHANNELS } from '../../../../shared/constants/channels'

/**
 * Setup IPC handlers for notes operations
 * Uses ipcMain.handle() for async request-response pattern
 *
 * @param db - Initialized PGliteDB instance
 */
export function registerNotesHandlers(db: PGliteDB): void {
  // Create a new note
  ipcMain.handle(
    IPC_CHANNELS.NOTES.CREATE,
    async (_, title: string, slug: string, content: string | null): Promise<string> => {
      try {
        return await db.createNote(title, slug, content)
      } catch (error) {
        console.error('[IPC] notes:create error:', error)
        throw error
      }
    }
  )

  // Get a single note by ID
  ipcMain.handle(IPC_CHANNELS.NOTES.GET, async (_, id: string): Promise<Note | null> => {
    try {
      return await db.getNote(id)
    } catch (error) {
      console.error('[IPC] notes:get error:', error)
      throw error
    }
  })

  // Get all notes
  ipcMain.handle(IPC_CHANNELS.NOTES.GET_ALL, async (): Promise<Note[]> => {
    try {
      return await db.getAllNotes()
    } catch (error) {
      console.error('[IPC] notes:getAll error:', error)
      throw error
    }
  })

  // Update an existing note
  ipcMain.handle(
    IPC_CHANNELS.NOTES.UPDATE,
    async (_, id: string, title: string, slug: string, content: string | null): Promise<void> => {
      try {
        await db.updateNote(id, title, slug, content)
      } catch (error) {
        console.error('[IPC] notes:update error:', error)
        throw error
      }
    }
  )

  // Delete a note
  ipcMain.handle(IPC_CHANNELS.NOTES.DELETE, async (_, id: string): Promise<void> => {
    try {
      await db.deleteNote(id)
    } catch (error) {
      console.error('[IPC] notes:delete error:', error)
      throw error
    }
  })

  console.log('[IPC] Notes handlers registered successfully')
}

/**
 * Remove all IPC handlers (cleanup on app quit)
 */
export function cleanupIPC(): void {
  ipcMain.removeHandler(IPC_CHANNELS.NOTES.CREATE)
  ipcMain.removeHandler(IPC_CHANNELS.NOTES.GET)
  ipcMain.removeHandler(IPC_CHANNELS.NOTES.GET_ALL)
  ipcMain.removeHandler(IPC_CHANNELS.NOTES.UPDATE)
  ipcMain.removeHandler(IPC_CHANNELS.NOTES.DELETE)
  console.log('[IPC] Notes handlers removed')
}
