/**
 * Notes Store
 *
 * Manages notes state and CRUD operations via IPC
 */

import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import type { Note } from '../../shared/types/note'
import { generateSlug } from '../../shared/utils/slug'

export const useNotesStore = defineStore('notes', () => {
  // State
  const notes = ref<Note[]>([])
  const selectedNoteId = ref<string | null>(null)

  // Expose as a property for reactivity
  const selectedNote = computed(() => {
    return notes.value.find((n) => n.id === selectedNoteId.value) ?? null
  })

  // Actions

  /**
   * Load all notes from database
   */
  async function loadNotes(): Promise<void> {
    try {
      notes.value = await window.api.notes.getAll()

      // Auto-select first note if none selected
      if (notes.value.length > 0 && selectedNoteId.value === null) {
        selectedNoteId.value = notes.value[0].id
      }
    } catch (error) {
      console.error('[Store] Failed to load notes:', error)
      throw error
    }
  }

  /**
   * Create a new note with auto-incremented title if needed
   *
   * @param title - Base title (default: 'Untitled')
   * @returns The created note ID
   */
  async function createNote(title = 'Untitled'): Promise<string> {
    try {
      // Check for existing titles with same base
      const existingTitles = notes.value
        .map((n) => n.title)
        .filter((t) => t === title || t.startsWith(`${title} `))

      let finalTitle = title
      if (existingTitles.length > 0) {
        // Find the highest number suffix
        // "Untitled" has no number, "Untitled 2" is 2, "Untitled 3" is 3, etc.
        const numbers = existingTitles
          .map((t) => {
            if (t === title) return 0 // "Untitled" has no number
            const match = t.match(new RegExp(`^${title}\\s+(\\d+)$`))
            return match ? parseInt(match[1], 10) : 0
          })
          .filter((n) => n > 0)

        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 1
        // Next number is maxNumber + 1
        const counter = maxNumber + 1
        finalTitle = `${title} ${String(counter)}`
      }

      const slug = generateSlug(finalTitle)

      // Create in database
      const id = await window.api.notes.create(finalTitle, slug, '')

      // OPTIMISTIC UI: Add immediately to store
      const newNote: Note = {
        id,
        title: finalTitle,
        slug,
        content: '',
        created_at: new Date(),
        updated_at: new Date(),
      }

      // Add to notes array at the end (oldest first, newest last)
      notes.value = [...notes.value, newNote]

      // Wait for Vue to process the notes array update
      await nextTick()

      // THEN select the new note (computed will update automatically)
      selectedNoteId.value = id

      return id
    } catch (error) {
      console.error('[Store] Failed to create note:', error)
      throw error
    }
  }

  /**
   * Update a note's title and/or content
   *
   * @param id - Note ID
   * @param data - Partial note data to update
   */
  async function updateNote(
    id: string,
    data: Partial<Pick<Note, 'title' | 'content'>>
  ): Promise<void> {
    try {
      const note = notes.value.find((n) => n.id === id)
      if (!note) {
        throw new Error(`Note ${id} not found`)
      }

      const title = data.title ?? note.title
      const content = data.content ?? note.content ?? ''
      const slug = data.title !== undefined ? generateSlug(data.title) : note.slug

      await window.api.notes.update(id, title, slug, content)

      // Update local state - create new array to trigger reactivity
      const index = notes.value.findIndex((n) => n.id === id)
      if (index !== -1) {
        const updatedNote = {
          ...note,
          title,
          slug,
          content,
          updated_at: new Date(),
        }
        notes.value = [...notes.value.slice(0, index), updatedNote, ...notes.value.slice(index + 1)]
      }
    } catch (error) {
      console.error('[Store] Failed to update note:', error)
      throw error
    }
  }

  /**
   * Delete a note
   *
   * @param id - Note ID
   */
  async function deleteNote(id: string): Promise<void> {
    try {
      await window.api.notes.delete(id)

      // Remove from local state
      notes.value = notes.value.filter((n) => n.id !== id)

      // Clear selection if deleted note was selected
      if (selectedNoteId.value === id) {
        selectedNoteId.value = notes.value.length > 0 ? notes.value[0].id : null
      }
    } catch (error) {
      console.error('[Store] Failed to delete note:', error)
      throw error
    }
  }

  /**
   * Select a note by ID
   */
  function selectNote(id: string | null): void {
    selectedNoteId.value = id
  }

  return {
    // State
    notes,
    selectedNoteId,

    // Getters
    selectedNote,

    // Actions
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
  }
})
