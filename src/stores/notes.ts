/**
 * Notes Store
 *
 * Manages notes state and CRUD operations via IPC
 */

import { defineStore } from 'pinia'
import { ref, computed, nextTick, watch } from 'vue'
import type { Note } from '../../shared/types/note'
import type { NoteLink } from '../../shared/types/link'
import { generateSlug } from '../../shared/utils/slug'
import { updateNoteTitlesCache } from '../components/Editor/extensions/wikilinks'

export const useNotesStore = defineStore('notes', () => {
  // State
  const notes = ref<Note[]>([])
  const selectedNoteId = ref<string | null>(null)
  const backlinks = ref<NoteLink[]>([])
  const isLoading = ref<boolean>(false)
  const notesLoaded = ref<boolean>(false)

  // Initialize window properties immediately for E2E tests
  ;(window as any).__brio_isLoading = false
  ;(window as any).__brio_notesLoaded = false
  console.log('[Store] Initialized window properties')

  // Expose loading state on window for E2E tests
  watch(isLoading, (value) => {
    console.log('[Store] isLoading changed to:', value)
    ;(window as any).__brio_isLoading = value
  })

  watch(notesLoaded, (value) => {
    console.log('[Store] notesLoaded changed to:', value)
    ;(window as any).__brio_notesLoaded = value
  })

  // Expose as a property for reactivity
  const selectedNote = computed(() => {
    return notes.value.find((n) => n.id === selectedNoteId.value) ?? null
  })

  // Actions

  /**
   * Load all notes from database
   */
  async function loadNotes(): Promise<void> {
    console.log('[Store] loadNotes called')
    console.log('[Store] window.api available?', typeof window.api !== 'undefined')
    console.log('[Store] window.api.notes available?', typeof window.api?.notes !== 'undefined')
    
    // Guard: wait for window.api to be available
    if (typeof window.api === 'undefined') {
      console.error('[Store] window.api is not available! Waiting...')
      // Wait up to 5 seconds for API to be available
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100))
        if (typeof window.api !== 'undefined') {
          console.log('[Store] window.api is now available after', i * 100, 'ms')
          break
        }
      }
      if (typeof window.api === 'undefined') {
        const error = new Error('window.api is not available after 5 seconds')
        console.error('[Store]', error)
        // Set notesLoaded anyway to unblock tests (with empty notes)
        notesLoaded.value = true
        throw error
      }
    }
    
    isLoading.value = true
    try {
      console.log('[Store] Calling window.api.notes.getAll()')
      notes.value = await window.api.notes.getAll()
      console.log('[Store] Received notes:', notes.value.length)

      // Auto-select first note if none selected
      if (notes.value.length > 0 && selectedNoteId.value === null) {
        selectedNoteId.value = notes.value[0].id
        console.log('[Store] Auto-selected first note:', selectedNoteId.value)
      }
      
      console.log('[Store] Setting notesLoaded to true')
      notesLoaded.value = true
    } catch (error) {
      console.error('[Store] Failed to load notes:', error)
      // Set notesLoaded anyway to unblock tests
      notesLoaded.value = true
      throw error
    } finally {
      isLoading.value = false
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
   * Parse wikilinks from content
   */
  function parseWikilinks(content: string): Array<{ title: string; alias: string | null; start: number; end: number }> {
    const wikilinks: Array<{ title: string; alias: string | null; start: number; end: number }> = []
    // Regex to match [[title]] or [[title|alias]], ignoring escaped \[[
    const regex = /(?<!\\)\[\[([^\]|]+)(\|([^\]]+))?\]\]/g
    
    let match: RegExpExecArray | null
    while ((match = regex.exec(content)) !== null) {
      const title = match[1].trim()
      const alias = match[3] ? match[3].trim() : null
      wikilinks.push({
        title,
        alias,
        start: match.index,
        end: match.index + match[0].length,
      })
    }
    
    return wikilinks
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

      // If title changed, update wikilinks
      if (data.title !== undefined && data.title !== note.title) {
        await window.api.links.updateOnRename(note.title, data.title)
        // Reload all notes to reflect updated wikilinks in content
        await loadNotes()
        // Return early since loadNotes already updated the store
        return
      }

      await window.api.notes.update(id, title, slug, content)

      // If content changed, update links
      if (data.content !== undefined) {
        console.log(`[Store] updateNote: content changed for note ${id}, updating links`)
        // Delete existing links from this note
        await window.api.links.deleteByNote(id)
        
        // Parse and create new links
        const wikilinks = parseWikilinks(content)
        console.log(`[Store] updateNote: parsed ${wikilinks.length} wikilinks:`, wikilinks)
        const affectedNoteIds = new Set<string>()
        
        for (const link of wikilinks) {
          // Find target note by title
          const targetNote = notes.value.find((n) => n.title === link.title)
          const toNoteId = targetNote ? targetNote.id : null
          
          console.log(`[Store] Creating link: ${id} -> ${toNoteId} (${link.title})`)
          
          // Track affected notes for backlinks refresh
          if (toNoteId) {
            affectedNoteIds.add(toNoteId)
          }
          
          // Create link
          await window.api.links.create(
            id,
            toNoteId,
            link.title,
            link.alias,
            link.start,
            link.end
          )
        }
        
        console.log(`[Store] updateNote: affected notes:`, Array.from(affectedNoteIds))
        // Refresh backlinks if the currently selected note is affected
        if (selectedNoteId.value && (affectedNoteIds.has(selectedNoteId.value) || selectedNoteId.value === id)) {
          console.log(`[Store] updateNote: refreshing backlinks for selected note ${selectedNoteId.value}`)
          await fetchBacklinks(selectedNoteId.value)
        }
      }

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
      
      // Update wikilinks cache to reflect changes
      await updateNoteTitlesCache()
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
      const note = notes.value.find((n) => n.id === id)
      if (note) {
        // Mark links to this note as broken
        await window.api.links.markBroken(note.title)
        // Delete all links from this note
        await window.api.links.deleteByNote(id)
      }

      await window.api.notes.delete(id)

      // Remove from local state
      notes.value = notes.value.filter((n) => n.id !== id)

      // Update wikilinks cache to mark broken links BEFORE changing selection
      await updateNoteTitlesCache()

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
  async function selectNote(id: string | null): Promise<void> {
    selectedNoteId.value = id
    if (id) {
      await fetchBacklinks(id)
    } else {
      backlinks.value = []
    }
  }

  /**
   * Fetch backlinks for a note
   */
  async function fetchBacklinks(noteId: string): Promise<void> {
    console.log(`[Store] fetchBacklinks called for note ${noteId}`)
    try {
      backlinks.value = await window.api.links.getBacklinks(noteId)
      console.log(`[Store] Fetched ${backlinks.value.length} backlinks for note ${noteId}:`, backlinks.value)
    } catch (error) {
      console.error('[Store] Failed to fetch backlinks:', error)
      backlinks.value = []
    }
  }

  return {
    // State
    notes,
    selectedNoteId,
    backlinks,

    // Getters
    selectedNote,

    // Actions
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
    fetchBacklinks,
  }
})
