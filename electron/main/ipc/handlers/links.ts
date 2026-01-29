/**
 * Links IPC handlers
 *
 * Secure communication layer for wikilinks operations
 */

import { ipcMain } from 'electron'
import type { PGliteDB } from '../../database/client'
import type { NoteLink } from '../../../../shared/types/link'
import { IPC_CHANNELS } from '../../../../shared/constants/channels'

/**
 * Setup IPC handlers for links operations
 *
 * @param db - Initialized PGliteDB instance
 */
export function registerLinksHandlers(db: PGliteDB): void {
  // Create a new link
  ipcMain.handle(
    IPC_CHANNELS.LINKS.CREATE,
    async (
      _,
      fromNoteId: string,
      toNoteId: string | null,
      toNoteTitle: string,
      alias: string | null,
      positionStart: number,
      positionEnd: number
    ): Promise<string> => {
      try {
        console.log(`[IPC] Creating link: ${fromNoteId} -> ${toNoteId ?? 'null'} (${toNoteTitle})`)
        return await db.createLink(fromNoteId, toNoteId, toNoteTitle, alias, positionStart, positionEnd)
      } catch (error) {
        console.error('[IPC] links:create error:', error)
        throw error
      }
    }
  )

  // Get outgoing links from a note
  ipcMain.handle(
    IPC_CHANNELS.LINKS.GET_OUTGOING,
    async (_, noteId: string): Promise<NoteLink[]> => {
      try {
        return await db.getOutgoingLinks(noteId)
      } catch (error) {
        console.error('[IPC] links:getOutgoing error:', error)
        throw error
      }
    }
  )

  // Get backlinks to a note
  ipcMain.handle(
    IPC_CHANNELS.LINKS.GET_BACKLINKS,
    async (_, noteId: string): Promise<NoteLink[]> => {
      try {
        const backlinks = await db.getBacklinks(noteId)
        console.log(`[IPC] getBacklinks for ${noteId}: found ${String(backlinks.length)} backlinks`)
        return backlinks
      } catch (error) {
        console.error('[IPC] links:getBacklinks error:', error)
        throw error
      }
    }
  )

  // Update links when note is renamed
  ipcMain.handle(
    IPC_CHANNELS.LINKS.UPDATE_ON_RENAME,
    async (_, oldTitle: string, newTitle: string): Promise<void> => {
      try {
        await db.updateLinksOnRename(oldTitle, newTitle)
      } catch (error) {
        console.error('[IPC] links:updateOnRename error:', error)
        throw error
      }
    }
  )

  // Mark links as broken when target note is deleted
  ipcMain.handle(
    IPC_CHANNELS.LINKS.MARK_BROKEN,
    async (_, toNoteTitle: string): Promise<void> => {
      try {
        await db.markLinksBroken(toNoteTitle)
      } catch (error) {
        console.error('[IPC] links:markBroken error:', error)
        throw error
      }
    }
  )

  // Delete all links from a note
  ipcMain.handle(
    IPC_CHANNELS.LINKS.DELETE_BY_NOTE,
    async (_, noteId: string): Promise<void> => {
      try {
        await db.deleteLinksByNote(noteId)
      } catch (error) {
        console.error('[IPC] links:deleteByNote error:', error)
        throw error
      }
    }
  )

  console.log('[IPC] Links handlers registered successfully')
}

/**
 * Remove all links IPC handlers (cleanup on app quit)
 */
export function cleanupLinksIPC(): void {
  ipcMain.removeHandler(IPC_CHANNELS.LINKS.CREATE)
  ipcMain.removeHandler(IPC_CHANNELS.LINKS.GET_OUTGOING)
  ipcMain.removeHandler(IPC_CHANNELS.LINKS.GET_BACKLINKS)
  ipcMain.removeHandler(IPC_CHANNELS.LINKS.UPDATE_ON_RENAME)
  ipcMain.removeHandler(IPC_CHANNELS.LINKS.MARK_BROKEN)
  ipcMain.removeHandler(IPC_CHANNELS.LINKS.DELETE_BY_NOTE)
  console.log('[IPC] Links handlers removed')
}
