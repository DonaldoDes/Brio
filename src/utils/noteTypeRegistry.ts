/**
 * Note Type Registry
 * 
 * Central registry for note types with their icons and colors
 */

import type { NoteType } from '../../shared/types/note'

export interface NoteTypeConfig {
  icon: string
  color: string
  label: string
}

export const NOTE_TYPE_REGISTRY: Record<NoteType, NoteTypeConfig> = {
  note: {
    icon: '📝',
    color: 'gray',
    label: 'Note',
  },
  project: {
    icon: '📁',
    color: 'blue',
    label: 'Project',
  },
  person: {
    icon: '👤',
    color: 'green',
    label: 'Person',
  },
  meeting: {
    icon: '📅',
    color: 'purple',
    label: 'Meeting',
  },
  daily: {
    icon: '🗓️',
    color: 'orange',
    label: 'Daily',
  },
}

export function getNoteTypeConfig(type: NoteType): NoteTypeConfig {
  return NOTE_TYPE_REGISTRY[type] || NOTE_TYPE_REGISTRY.note
}

export function getAllNoteTypes(): NoteType[] {
  return Object.keys(NOTE_TYPE_REGISTRY) as NoteType[]
}
