/**
 * Tag Domain Model
 */

export interface Tag {
  id: string
  note_id: string
  tag: string
  created_at: Date
}

export interface TagWithCount {
  tag: string
  count: number
  children?: TagWithCount[]
}
