<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useNotesStore } from '../../stores/notes'
  import NoteList from '../../components/NoteList/NoteList.vue'
  import NoteEditor from '../../components/Editor/NoteEditor.vue'
  import DeleteConfirmDialog from '../../components/Editor/DeleteConfirmDialog.vue'

  const notesStore = useNotesStore()
  const { selectedNote } = storeToRefs(notesStore)

  // Delete dialog state
  const showDeleteDialog = ref(false)

  // Keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    // Cmd+N (Mac) or Ctrl+N (Windows/Linux) - Create new note
    if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
      event.preventDefault()
      createNewNote()
    }

    // Cmd+Backspace (Mac) or Ctrl+Backspace (Windows/Linux) - Delete note
    if ((event.metaKey || event.ctrlKey) && event.key === 'Backspace') {
      event.preventDefault()
      openDeleteDialog()
    }

    // Escape - Close dialog or blur input
    if (event.key === 'Escape') {
      if (showDeleteDialog.value) {
        showDeleteDialog.value = false
      } else {
        // Blur any focused input
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      }
    }
  }

  async function createNewNote() {
    try {
      await notesStore.createNote()
    } catch (error) {
      console.error('[Layout] Failed to create note:', error)
    }
  }

  function openDeleteDialog() {
    if (selectedNote.value) {
      showDeleteDialog.value = true
    }
  }

  async function confirmDelete() {
    if (selectedNote.value) {
      try {
        await notesStore.deleteNote(selectedNote.value.id)
        showDeleteDialog.value = false
      } catch (error) {
        console.error('[Layout] Failed to delete note:', error)
      }
    }
  }

  function cancelDelete() {
    showDeleteDialog.value = false
  }

  // Load notes on mount
  onMounted(async () => {
    console.log('[Layout] EditorLayout mounted, loading notes...')
    try {
      await notesStore.loadNotes()
      console.log('[Layout] Notes loaded successfully')
    } catch (error) {
      console.error('[Layout] Failed to load notes:', error)
    }

    // Register keyboard shortcuts
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
</script>

<template>
  <div class="editor-layout">
    <!-- Navigation (placeholder for tags) -->
    <aside class="navigation">
      <div class="nav-header">
        <h1 class="app-title">Brio</h1>
      </div>
      <div class="nav-content">
        <p class="nav-placeholder">Tags coming soon...</p>
      </div>
    </aside>

    <!-- Note List -->
    <aside class="note-list-panel">
      <div class="note-list-header">
        <button
          class="new-note-button"
          data-testid="new-note-button"
          title="New Note (Cmd+N)"
          @click="createNewNote"
        >
          + New Note
        </button>
      </div>
      <NoteList />
    </aside>

    <!-- Editor -->
    <main class="editor-panel">
      <NoteEditor @delete-note="openDeleteDialog" />
    </main>

    <!-- Delete Confirmation Dialog -->
    <DeleteConfirmDialog
      :open="showDeleteDialog"
      :note-title="selectedNote?.title ?? ''"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
  .editor-layout {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background-color: var(--color-bg);
  }

  .navigation {
    width: 240px;
    background-color: var(--color-bg-secondary);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
  }

  .nav-header {
    padding: var(--space-lg);
    border-bottom: 1px solid var(--color-border);
  }

  .app-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    margin: 0;
  }

  .nav-content {
    flex: 1;
    padding: var(--space-lg);
  }

  .nav-placeholder {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    text-align: center;
  }

  .note-list-panel {
    width: 300px;
    background-color: var(--color-bg);
    border-right: 1px solid var(--color-border);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .note-list-header {
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-border);
  }

  .new-note-button {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    background-color: var(--color-accent);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .new-note-button:hover {
    background-color: var(--color-accent-hover);
  }

  .new-note-button:active {
    transform: scale(0.98);
  }

  .editor-panel {
    flex: 1;
    overflow: hidden;
  }
</style>
