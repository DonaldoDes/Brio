/**
 * IPC API Types
 *
 * Type definitions for the secure IPC API exposed to the renderer process.
 */

import type { Note } from './note'
import type { NoteLink } from './link'

/**
 * Notes API - CRUD operations for notes via IPC
 */
export interface NotesAPI {
  create(title: string, slug: string, content: string | null): Promise<string>
  get(id: string): Promise<Note | null>
  getAll(): Promise<Note[]>
  update(id: string, title: string, slug: string, content: string | null): Promise<void>
  delete(id: string): Promise<void>
  search(query: string): Promise<Array<Note & { preview?: string }>>
}

/**
 * Links API - Operations for wikilinks via IPC
 */
export interface LinksAPI {
  create(
    fromNoteId: string,
    toNoteId: string | null,
    toNoteTitle: string,
    alias: string | null,
    positionStart: number,
    positionEnd: number
  ): Promise<string>
  getOutgoing(noteId: string): Promise<NoteLink[]>
  getBacklinks(noteId: string): Promise<NoteLink[]>
  updateOnRename(oldTitle: string, newTitle: string): Promise<void>
  markBroken(toNoteTitle: string): Promise<void>
  deleteByNote(noteId: string): Promise<void>
}

/**
 * Window API - Window management operations via IPC
 */
export interface WindowAPI {
  openNote(noteId: string): Promise<void>
}

/**
 * Main API exposed to renderer process
 */
export interface BrioAPI {
  notes: NotesAPI
  links: LinksAPI
  window: WindowAPI
}

/**
 * Global window interface extension
 */
declare global {
  interface Window {
    api: BrioAPI
  }
}
