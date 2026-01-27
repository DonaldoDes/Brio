/**
 * IPC API Types
 *
 * Type definitions for the secure IPC API exposed to the renderer process.
 */

import type { Note } from './note'

/**
 * Notes API - CRUD operations for notes via IPC
 */
export interface NotesAPI {
  create(title: string, slug: string, content: string | null): Promise<string>
  get(id: string): Promise<Note | null>
  getAll(): Promise<Note[]>
  update(id: string, title: string, slug: string, content: string | null): Promise<void>
  delete(id: string): Promise<void>
}

/**
 * Main API exposed to renderer process
 */
export interface BrioAPI {
  notes: NotesAPI
}

/**
 * Global window interface extension
 */
declare global {
  interface Window {
    api: BrioAPI
  }
}
