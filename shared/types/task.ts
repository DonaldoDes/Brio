/**
 * Task Domain Model
 */

export type TaskStatus = 'pending' | 'done' | 'deferred' | 'cancelled'

export interface Task {
  id: string
  note_id: string
  content: string
  status: TaskStatus
  line_number: number
  created_at: Date
}

export interface TaskWithNote extends Task {
  note_title: string
}
