/**
 * Tags IPC handlers
 *
 * Secure communication layer for tags operations
 */

import { ipcMain } from 'electron'
import type { PGliteDB } from '../../database/client'
import type { Tag, TagWithCount } from '../../../../shared/types/tag'
import { IPC_CHANNELS } from '../../../../shared/constants/channels'

/**
 * Setup IPC handlers for tags operations
 *
 * @param db - Initialized PGliteDB instance
 */
export function registerTagsHandlers(db: PGliteDB): void {
  // Get all tags with count
  ipcMain.handle(IPC_CHANNELS.TAGS.GET_ALL, async (): Promise<TagWithCount[]> => {
    try {
      return await db.getAllTags()
    } catch (error) {
      console.error('[IPC] tags:getAll error:', error)
      throw error
    }
  })

  // Get tags for a specific note
  ipcMain.handle(IPC_CHANNELS.TAGS.GET_BY_NOTE, async (_, noteId: string): Promise<Tag[]> => {
    try {
      return await db.getTagsByNote(noteId)
    } catch (error) {
      console.error('[IPC] tags:getByNote error:', error)
      throw error
    }
  })

  // Get note IDs that have a specific tag
  ipcMain.handle(IPC_CHANNELS.TAGS.GET_NOTES_BY_TAG, async (_, tag: string): Promise<string[]> => {
    try {
      return await db.getNotesByTag(tag)
    } catch (error) {
      console.error('[IPC] tags:getNotesByTag error:', error)
      throw error
    }
  })

  console.log('[IPC] Tags handlers registered successfully')
}

/**
 * Remove all tags IPC handlers (cleanup on app quit)
 */
export function cleanupTagsIPC(): void {
  ipcMain.removeHandler(IPC_CHANNELS.TAGS.GET_ALL)
  ipcMain.removeHandler(IPC_CHANNELS.TAGS.GET_BY_NOTE)
  ipcMain.removeHandler(IPC_CHANNELS.TAGS.GET_NOTES_BY_TAG)
  console.log('[IPC] Tags handlers removed')
}
