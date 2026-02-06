/**
 * Web BrioAPI implementation
 *
 * Direct database access without IPC for web mode
 */

import type { BrioAPI } from '../../shared/types/api'
import type { WebPGliteDB } from './database'

/**
 * Detect if running in test mode
 */
function isTestMode(): boolean {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('test') === 'true') return true
  
  // Check if Playwright is present
  if ((window as any).__playwright) return true
  
  return false
}

export function createWebBrioAPI(db: WebPGliteDB): BrioAPI {
  return {
    notes: {
      create: async (title: string, slug: string, content: string | null) => {
        return await db.createNote(title, slug, content)
      },

      get: async (id: string) => {
        return await db.getNote(id)
      },

      getAll: async () => {
        return await db.getAllNotes()
      },

      update: async (id: string, title: string, slug: string, content: string | null) => {
        await db.updateNote(id, title, slug, content)
      },

      updateType: async (id: string, type: string) => {
        await db.updateNoteType(id, type)
      },

      delete: async (id: string) => {
        await db.deleteNote(id)
      },

      search: async (query: string) => {
        return await db.searchNotes(query)
      },
    },

    links: {
      create: async (
        fromNoteId: string,
        toNoteId: string | null,
        toNoteTitle: string,
        alias: string | null,
        positionStart: number,
        positionEnd: number
      ) => {
        return await db.createLink(fromNoteId, toNoteId, toNoteTitle, alias, positionStart, positionEnd)
      },

      getOutgoing: async (noteId: string) => {
        return await db.getOutgoingLinks(noteId)
      },

      getBacklinks: async (noteId: string) => {
        return await db.getBacklinks(noteId)
      },

      updateOnRename: async (oldTitle: string, newTitle: string) => {
        await db.updateLinksOnRename(oldTitle, newTitle)
      },

      markBroken: async (toNoteTitle: string) => {
        await db.markLinksBroken(toNoteTitle)
      },

      deleteByNote: async (noteId: string) => {
        await db.deleteLinksByNote(noteId)
      },
    },

    window: {
      openNote: async (noteId: string) => {
        // In web mode, use window.open or navigate to the note
        // For now, we'll use a simple window.open approach
        // This can be customized based on routing strategy
        // window.open(`#/note/${noteId}`, '_blank')
        // Or use router navigation if available
      },
    },

    tags: {
      getAll: async () => {
        return await db.getAllTags()
      },

      getByNote: async (noteId: string) => {
        return await db.getTagsByNote(noteId)
      },

      getNotesByTag: async (tag: string) => {
        return await db.getNotesByTag(tag)
      },
    },

    tasks: {
      getAll: async () => {
        return await db.getAllTasks()
      },

      getByNote: async (noteId: string) => {
        return await db.getTasksByNote(noteId)
      },

      getByStatus: async (status: string) => {
        return await db.getTasksByStatus(status as any)
      },
    },

    quickCapture: {
      save: async (content: string) => {
        await db.saveQuickCapture(content)
      },

      getHistory: async () => {
        return await db.getQuickCaptureHistory()
      },
    },

    theme: {
      getSystemTheme: async () => {
        // Use Web API to detect system theme
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        return isDark ? 'dark' : 'light'
      },
    },

    // Testing utilities (only in test mode)
    ...(isTestMode()
      ? {
          testing: {
            clearAllData: async () => {
              await db.clearAllData()
            },
          },
        }
      : {}),
  }
}
