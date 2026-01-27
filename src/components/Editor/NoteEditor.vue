<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useNotesStore } from '../../stores/notes'
  import { useAutoSave } from '../../composables/useAutoSave'

  const emit = defineEmits<{
    deleteNote: []
  }>()

  const notesStore = useNotesStore()
  const { selectedNoteId, selectedNote } = storeToRefs(notesStore)

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

  // Auto-save content
  useAutoSave(selectedNoteId, localContent)

  // Handle title blur (save title)
  async function handleTitleBlur() {
    if (!selectedNoteId.value || !localTitle.value.trim()) return

    try {
      await notesStore.updateNote(selectedNoteId.value, { title: localTitle.value })
    } catch (error) {
      console.error('[Editor] Failed to update title:', error)
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
</script>

<template>
  <div v-if="selectedNote" class="note-editor">
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

    <textarea
      v-model="localContent"
      data-testid="note-editor"
      class="note-content-editor"
      placeholder="Start writing..."
    />
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

  .note-content-editor {
    flex: 1;
    padding: var(--space-lg);
    font-size: var(--font-size-md);
    line-height: var(--line-height-relaxed);
    color: var(--color-text);
    background-color: transparent;
    border: none;
    outline: none;
    resize: none;
    font-family: inherit;
  }

  .note-content-editor::placeholder {
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
