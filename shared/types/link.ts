/**
 * Note Link Domain Model
 */

export interface NoteLink {
  id: string
  from_note_id: string
  from_note_title: string
  to_note_id: string | null
  to_note_title: string
  alias: string | null
  position_start: number
  position_end: number
  is_broken: boolean
  created_at: Date
}

export interface CreateLinkInput {
  from_note_id: string
  to_note_id: string | null
  to_note_title: string
  alias: string | null
  position_start: number
  position_end: number
}

export interface UpdateLinkInput {
  id: string
  to_note_id: string | null
  to_note_title: string
  is_broken: boolean
}
