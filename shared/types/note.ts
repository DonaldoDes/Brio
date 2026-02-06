/**
 * Note Domain Model
 */

export type NoteType = 'note' | 'project' | 'person' | 'meeting' | 'daily'

export interface Note {
  id: string
  title: string
  slug: string
  content: string | null
  type: NoteType
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface CreateNoteInput {
  title: string
  content: string | null
}

export interface UpdateNoteInput {
  id: string
  title: string
  content: string | null
}
