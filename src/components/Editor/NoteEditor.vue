<script setup lang="ts">
  import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useNotesStore } from '../../stores/notes'
  import { useAutoSave } from '../../composables/useAutoSave'
  import MarkdownEditor from './MarkdownEditor.vue'
  import NoteTypeSelector from './NoteTypeSelector.vue'
  import AaFormatButton from './AaFormatButton.vue'
  import FloatingToolbar from './FloatingToolbar.vue'
  import { updateNoteTitlesCache } from './extensions/wikilinks'
  import type { NoteType } from '../../../shared/types/note'

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
  const localType = ref<NoteType>('note')

  // Track previous note ID to detect actual note switches
  const previousNoteId = ref<string | null>(null)

  // Auto-save content and get isSaving flag + saveNow function
  const { isSaving, saveNow: autoSaveNow } = useAutoSave(selectedNoteId, localContent)

  // Expose saving state on window for E2E tests
  watch(isSaving, (saving) => {
    ;(window as any).__brio_isSaving = saving
  })

  // Sync local state with selected note
  watch(
    selectedNote,
    async (note, oldNote) => {
      // Detect if we're switching to a different note (ID changed)
      const noteIdChanged = note?.id !== previousNoteId.value

      // Save content of previous note before switching
      if (oldNote && oldNote.id && localContent.value !== (oldNote.content ?? '')) {
        try {
          await notesStore.updateNote(oldNote.id, { content: localContent.value })
        } catch (error) {
          console.error('[Editor] Failed to save content before switch:', error)
        }
      }

      if (note) {
        // Only reset content if:
        // 1. Switching to a different note (noteIdChanged)
        // 2. OR content changed externally while NOT auto-saving
        const contentChanged = !noteIdChanged && !isSaving.value && note.content !== localContent.value
        
        if (noteIdChanged || contentChanged) {
          localTitle.value = note.title
          localContent.value = note.content ?? ''
          localType.value = note.type || 'note'
          previousNoteId.value = note.id
        }
      } else {
        localTitle.value = ''
        localContent.value = ''
        localType.value = 'note'
        previousNoteId.value = null
      }
    },
    { immediate: true }
  )

  // Force save both title and content
  const saveNow = async (): Promise<void> => {
    if (!selectedNoteId.value) return

    isSaving.value = true
    try {
      // Save title first
      await notesStore.updateNote(selectedNoteId.value, {
        title: localTitle.value,
      })
      // Then use autoSave's saveNow for content (handles isSaving + nextTick correctly)
      await autoSaveNow()
    } catch (error) {
      console.error('[NoteEditor] Failed to force save:', error)
      throw error
    } finally {
      isSaving.value = false
    }
  }

  // Expose saveNow, updateNoteTitlesCache, and store for tests
  // Always expose in development builds (E2E tests run against dev build)
  interface WindowWithTestAPI {
    __brio_saveNow?: () => Promise<void>
    __brio_updateCache?: () => Promise<void>
    __brio_store?: {
      // eslint-disable-next-line no-unused-vars
      createNote: (title: string) => Promise<string>
      // eslint-disable-next-line no-unused-vars
      selectNote: (id: string) => void
      loadNotes: () => Promise<void>
    }
  }
  ;(window as unknown as WindowWithTestAPI).__brio_saveNow = saveNow
  ;(window as unknown as WindowWithTestAPI).__brio_updateCache = updateNoteTitlesCache
  ;(window as unknown as WindowWithTestAPI).__brio_store = {
    createNote: notesStore.createNote,
    selectNote: notesStore.selectNote,
    loadNotes: notesStore.loadNotes,
  }

  // Handle title blur (save title)
  async function handleTitleBlur() {
    if (!selectedNoteId.value || !localTitle.value.trim()) return

    ;(window as any).__brio_titleSaving = true
    isSaving.value = true
    try {
      await notesStore.updateNote(selectedNoteId.value, { title: localTitle.value })
      await nextTick() // Ensure watchers see isSaving=true
    } catch (error) {
      console.error('[Editor] Failed to update title:', error)
    } finally {
      ;(window as any).__brio_titleSaving = false
      isSaving.value = false
    }
  }

  // Handle type change
  async function handleTypeChange(newType: NoteType) {
    if (!selectedNoteId.value) return

    isSaving.value = true
    try {
      await notesStore.updateNoteType(selectedNoteId.value, newType)
      await nextTick() // Ensure watchers see isSaving=true
      localType.value = newType
    } catch (error) {
      console.error('[Editor] Failed to update type:', error)
    } finally {
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

  async function handleWikilinkClick(detail: {
    title: string
    metaKey?: boolean
    ctrlKey?: boolean
  }) {
    const { title, metaKey, ctrlKey } = detail

    // Find note by title
    const targetNote = notesStore.notes.find((n) => n.title === title)

    // Check if Cmd/Ctrl was pressed (open in new window)
    if (metaKey || ctrlKey) {
      if (targetNote) {
        // Open existing note in new window
        await window.api.window.openNote(targetNote.id)
      } else {
        // Create new note and open in new window
        const newNoteId = await notesStore.createNote(title)
        await window.api.window.openNote(newNoteId)
      }
      return
    }

    if (targetNote) {
      // Navigate to existing note
      notesStore.selectNote(targetNote.id)
    } else {
      // Create new note with the title
      const newNoteId = await notesStore.createNote(title)
      notesStore.selectNote(newNoteId)
    }
  }

  // Floating toolbar state
  const isToolbarOpen = ref(false)

  function toggleToolbar() {
    isToolbarOpen.value = !isToolbarOpen.value
  }

  function handleFormat(type: string) {
    // Apply formatting to editor
    if (!editorRef.value) return
    
    // TODO: Implement formatting logic via CodeMirror
    console.log('[NoteEditor] Format:', type)
  }

  // Keyboard shortcut for toggling toolbar (Cmd+Shift+F)
  function handleKeyDown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'F') {
      event.preventDefault()
      toggleToolbar()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
</script>

<template>
  <div
    v-if="selectedNote"
    class="note-editor"
    :data-saving="isSaving"
    :data-note-id="selectedNote.id"
  >
    <!-- Bear-style editor layout -->
    <div class="editor-content-area">
      <!-- Aa button (positioned absolute top-right) -->
      <AaFormatButton :open="isToolbarOpen" @toggle="toggleToolbar" />

      <!-- Scrollable content -->
      <input
        id="note-title-input"
        ref="titleInputRef"
        v-model="localTitle"
        data-testid="note-title-input"
        type="text"
        name="note-title"
        class="note-title-input"
        placeholder="Untitled"
        @blur="handleTitleBlur"
      />
      
      <!-- Type selector and delete button - HIDDEN -->
      <!-- <div class="editor-toolbar-row">
        <NoteTypeSelector v-model="localType" @update:model-value="handleTypeChange" />
        <button
          data-testid="delete-note-button"
          class="delete-note-button"
          title="Delete Note (Cmd+Backspace)"
          @click="emit('deleteNote')"
        >
          🗑️
        </button>
      </div> -->

      <MarkdownEditor
        ref="editorRef"
        v-model="localContent"
        @wikilink-click="handleWikilinkClick"
      />

      <!-- Floating toolbar -->
      <FloatingToolbar :open="isToolbarOpen" @format="handleFormat" />
    </div>
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

  /* Bear-style editor layout */
  .editor-content-area {
    position: relative;
    height: 100%;
    overflow-y: auto;
    max-width: none; /* Fluid width */
    padding-top: 36px; /* 36px top for alignment with note list */
    padding-left: 48px; /* 48px horizontal padding */
    padding-right: 48px; /* 48px horizontal padding */
    padding-bottom: 120px; /* 120px bottom for toolbar clearance */
  }

  .note-title-input {
    width: 100%;
    padding: 0;
    margin-bottom: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
    font-size: 32px;
    font-weight: 700;
    color: #1A1A1A;
    background: none;
    border: none;
    outline: none;
  }

  :root[data-theme="dark"] .note-title-input {
    color: #E5E5E7;
  }

  .note-title-input::placeholder {
    color: var(--color-text-muted);
  }

  .editor-toolbar-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .delete-note-button {
    padding: 8px;
    background-color: transparent;
    border: none;
    cursor: pointer;
    font-size: 16px;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .delete-note-button:hover {
    opacity: 1;
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
