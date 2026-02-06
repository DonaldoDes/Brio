/**
 * IPC API Types
 *
 * Type definitions for the secure IPC API exposed to the renderer process.
 */

import type { Note } from './note'
import type { NoteLink } from './link'
import type { Tag, TagWithCount } from './tag'
import type { Task, TaskWithNote, TaskStatus } from './task'

/**
 * Notes API - CRUD operations for notes via IPC
 */
export interface NotesAPI {
  create(title: string, slug: string, content: string | null): Promise<string>
  get(id: string): Promise<Note | null>
  getAll(): Promise<Note[]>
  update(id: string, title: string, slug: string, content: string | null): Promise<void>
  updateType(id: string, type: string): Promise<void>
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
 * Tags API - Operations for tags via IPC
 */
export interface TagsAPI {
  getAll(): Promise<TagWithCount[]>
  getByNote(noteId: string): Promise<Tag[]>
  getNotesByTag(tag: string): Promise<string[]>
}

/**
 * Tasks API - Operations for tasks via IPC
 */
export interface TasksAPI {
  getAll(): Promise<TaskWithNote[]>
  getByNote(noteId: string): Promise<Task[]>
  getByStatus(status: TaskStatus): Promise<TaskWithNote[]>
}

/**
 * Quick Capture API - Operations for quick capture via IPC
 */
export interface QuickCaptureAPI {
  save(content: string): Promise<void>
  getHistory(): Promise<string[]>
}

/**
 * Theme API - Operations for theme management via IPC
 */
export interface ThemeAPI {
  getSystemTheme(): Promise<'light' | 'dark'>
}

/**
 * Testing API - Testing utilities (Web mode only)
 */
export interface TestingAPI {
  clearAllData(): Promise<void>
}

/**
 * Main API exposed to renderer process
 */
export interface BrioAPI {
  notes: NotesAPI
  links: LinksAPI
  window: WindowAPI
  tags: TagsAPI
  tasks: TasksAPI
  quickCapture: QuickCaptureAPI
  theme: ThemeAPI
  testing?: TestingAPI // Optional, only available in Web mode
}

/**
 * Global window interface extension
 */
declare global {
  interface Window {
    api: BrioAPI
  }
}
