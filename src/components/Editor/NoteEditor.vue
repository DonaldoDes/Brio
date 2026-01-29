<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useNotesStore } from '../../stores/notes'
  import { useAutoSave } from '../../composables/useAutoSave'
  import MarkdownEditor from './MarkdownEditor.vue'
  import BacklinksPanel from '../Sidebar/BacklinksPanel.vue'
  import { updateNoteTitlesCache } from './extensions/wikilinks'

  const emit = defineEmits<{
    deleteNote: []
    'open-in-new-window': [noteId: string]
  }>()

  const notesStore = useNotesStore()
  const { selectedNoteId, selectedNote, notes } = storeToRefs(notesStore)

  // Update wikilinks cache when notes change
  watch(
    notes,
    () => {
      void updateNoteTitlesCache()
    },
    { deep: true }
  )

  // Local state for editing
  const localTitle = ref('')
  const localContent = ref('')

  // Sync local state with selected note
  watch(
    selectedNote,
    async (note, oldNote) => {
      // Save content of previous note before switching
      if (oldNote && oldNote.id && localContent.value !== (oldNote.content ?? '')) {
        try {
          await notesStore.updateNote(oldNote.id, { content: localContent.value })
        } catch (error) {
          console.error('[Editor] Failed to save content before switch:', error)
        }
      }

      if (note) {
        localTitle.value = note.title
        localContent.value = note.content ?? ''
      } else {
        localTitle.value = ''
        localContent.value = ''
      }
    },
    { immediate: true }
  )

  // Saving state indicator
  const isSaving = ref(false)
  
  // Expose saving state on window for E2E tests
  watch(isSaving, (saving) => {
    (window as any).__brio_isSaving = saving
  })
  
  // Auto-save content
  const { saveNow: saveContentNow } = useAutoSave(selectedNoteId, localContent)
  
  // Force save both title and content
  const saveNow = async (): Promise<void> => {
    if (!selectedNoteId.value) return
    
    isSaving.value = true
    try {
      console.log('[NoteEditor] Force saving title and content')
      await notesStore.updateNote(selectedNoteId.value, {
        title: localTitle.value,
        content: localContent.value
      })
      console.log('[NoteEditor] Force saved successfully')
    } catch (error) {
      console.error('[NoteEditor] Failed to force save:', error)
      throw error
    } finally {
      isSaving.value = false
    }
  }
  
  // Expose saveNow, updateNoteTitlesCache, and store for tests
  // Always expose in development builds (E2E tests run against dev build)
  interface WindowWithTestAPI extends Window {
    __brio_saveNow?: () => Promise<void>
    __brio_updateCache?: () => Promise<void>
    __brio_store?: {
      createNote: (title: string) => Promise<string>
      selectNote: (id: string) => void
    }
  }
  ;(window as WindowWithTestAPI).__brio_saveNow = saveNow
  ;(window as WindowWithTestAPI).__brio_updateCache = updateNoteTitlesCache
  ;(window as WindowWithTestAPI).__brio_store = {
    createNote: notesStore.createNote,
    selectNote: notesStore.selectNote
  }
  
  // Debug: watch localContent changes
  watch(localContent, (newContent) => {
    console.log('[NoteEditor] localContent changed:', newContent.substring(0, 50))
  })

  // Handle title blur (save title)
  async function handleTitleBlur() {
    if (!selectedNoteId.value || !localTitle.value.trim()) return

    (window as any).__brio_titleSaving = true
    isSaving.value = true
    try {
      await notesStore.updateNote(selectedNoteId.value, { title: localTitle.value })
    } catch (error) {
      console.error('[Editor] Failed to update title:', error)
    } finally {
      (window as any).__brio_titleSaving = false
      isSaving.value = false
    }
  }

  // Focus title input when note is created
  const titleInputRef = ref<HTMLInputElement | null>(null)

  watch(selectedNoteId, (newId, oldId) => {
    // If a new note was just created, focus the title
    if (newId && !oldId) {
      setTimeout(() => {
        titleInputRef.value?.focus()
        titleInputRef.value?.select()
      }, 50)
    }
  })

  // Handle wikilink navigation
  const editorRef = ref<InstanceType<typeof MarkdownEditor> | null>(null)

  async function handleWikilinkClick(detail: { title: string; metaKey?: boolean; ctrlKey?: boolean }) {
    const { title, metaKey, ctrlKey } = detail
    console.log('[NoteEditor] Handling wikilink click for:', title, { metaKey, ctrlKey })

    // Find note by title
    const targetNote = notesStore.notes.find((n) => n.title === title)

    // Check if Cmd/Ctrl was pressed (open in new window)
    if (metaKey || ctrlKey) {
      console.log('[NoteEditor] Cmd/Ctrl+Click detected, opening in new window')
      
      if (targetNote) {
        // Open existing note in new window
        console.log('[NoteEditor] Opening existing note in new window:', targetNote.id)
        await window.api.window.openNote(targetNote.id)
      } else {
        // Create new note and open in new window
        console.log('[NoteEditor] Creating new note and opening in new window:', title)
        const newNoteId = await notesStore.createNote(title)
        await window.api.window.openNote(newNoteId)
        console.log('[NoteEditor] New note created and opened:', newNoteId)
      }
      return
    }

    if (targetNote) {
      // Navigate to existing note
      console.log('[NoteEditor] Navigating to existing note:', targetNote.id)
      notesStore.selectNote(targetNote.id)
    } else {
      // Create new note with the title
      console.log('[NoteEditor] Creating new note:', title)
      const newNoteId = await notesStore.createNote(title)
      notesStore.selectNote(newNoteId)
      console.log('[NoteEditor] New note created:', newNoteId)
    }
  }
</script>

<template>
  <div 
    v-if="selectedNote" 
    class="note-editor"
    :data-saving="isSaving"
    :data-note-id="selectedNote.id"
  >
    <div class="editor-header">
      <input
        ref="titleInputRef"
        v-model="localTitle"
        data-testid="note-title-input"
        type="text"
        class="note-title-input"
        placeholder="Untitled"
        @blur="handleTitleBlur"
      />
      <button
        data-testid="delete-note-button"
        class="delete-note-button"
        title="Delete Note (Cmd+Backspace)"
        @click="emit('deleteNote')"
      >
        🗑️
      </button>
    </div>

    <div class="editor-content">
      <MarkdownEditor ref="editorRef" v-model="localContent" @wikilink-click="handleWikilinkClick" />
    </div>

    <BacklinksPanel />
  </div>

  <div v-else class="empty-editor">
    <p>Select a note or create a new one</p>
  </div>
</template>

<style scoped>
  .note-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--color-bg);
  }

  .editor-header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    border-bottom: 1px solid var(--color-border);
    padding-right: var(--space-md);
    flex-shrink: 0;
  }

  .editor-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .note-title-input {
    flex: 1;
    padding: var(--space-lg);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text);
    background-color: transparent;
    border: none;
    outline: none;
  }

  .delete-note-button {
    padding: var(--space-sm);
    background-color: transparent;
    border: none;
    cursor: pointer;
    font-size: var(--font-size-lg);
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .delete-note-button:hover {
    opacity: 1;
  }

  .note-title-input::placeholder {
    color: var(--color-text-muted);
  }

  .empty-editor {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-muted);
    font-size: var(--font-size-md);
  }
</style>
