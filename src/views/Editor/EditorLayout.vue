<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useWindowSize } from '@vueuse/core'
  import { useNotesStore } from '../../stores/notes'
  import { useSearchStore } from '../../stores/search'
  import { useResizable } from '../../composables/useResizable'
  import { useLayoutPersistence } from '../../composables/useLayoutPersistence'
  import NoteList from '../../components/NoteList/NoteList.vue'
  import NoteEditor from '../../components/Editor/NoteEditor.vue'
  import DeleteConfirmDialog from '../../components/Editor/DeleteConfirmDialog.vue'

  const notesStore = useNotesStore()
  const { selectedNote } = storeToRefs(notesStore)

  const searchStore = useSearchStore()

  // Ref to NoteList component for search focus
  const noteListRef = ref<InstanceType<typeof NoteList> | null>(null)

  // Delete dialog state
  const showDeleteDialog = ref(false)

  // Layout persistence
  const {
    sidebarWidth: persistedSidebarWidth,
    listWidth: persistedListWidth,
    isSidebarCollapsed,
  } = useLayoutPersistence()

  // Resizable sidebar
  const sidebar = useResizable({
    min: 180,
    max: 400,
    defaultWidth: 240,
    onResize: (width) => {
      persistedSidebarWidth.value = width
    },
  })

  // Resizable list
  const list = useResizable({
    min: 280,
    max: 600,
    defaultWidth: 320,
    onResize: (width) => {
      persistedListWidth.value = width
    },
  })

  // Initialize widths from localStorage
  sidebar.width.value = persistedSidebarWidth.value
  list.width.value = persistedListWidth.value

  // Computed styles
  const sidebarStyle = computed(() => ({
    width: isSidebarCollapsed.value ? '0px' : `${sidebar.width.value}px`,
    transition: 'width 200ms ease-out',
  }))

  const listStyle = computed(() => ({
    width: `${list.width.value}px`,
  }))

  // Toggle sidebar collapse
  function toggleSidebar() {
    console.log('[Layout] toggleSidebar called, current:', isSidebarCollapsed.value)
    isSidebarCollapsed.value = !isSidebarCollapsed.value
    console.log('[Layout] toggleSidebar after, new:', isSidebarCollapsed.value)
  }

  // Reset widths to defaults
  function resetSidebarWidth() {
    sidebar.reset()
    persistedSidebarWidth.value = 240
  }

  function resetListWidth() {
    list.reset()
    persistedListWidth.value = 320
  }

  // Responsive: auto-collapse sidebar on narrow windows
  const { width: windowWidth } = useWindowSize()
  watch(windowWidth, (newWidth) => {
    if (newWidth < 1024) {
      isSidebarCollapsed.value = true
      list.width.value = 280 // Reduce list to minimum
    }
  })

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

    // Cmd+F (Mac) or Ctrl+F (Windows/Linux) - Focus search
    if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
      event.preventDefault()
      console.log('[Layout] Cmd+F pressed, noteListRef:', noteListRef.value)
      if (noteListRef.value) {
        noteListRef.value.focusSearch()
      } else {
        console.error('[Layout] noteListRef is null!')
      }
    }

    // Escape - Close dialog, clear search, or blur input
    if (event.key === 'Escape') {
      if (showDeleteDialog.value) {
        showDeleteDialog.value = false
      } else if (searchStore.query) {
        searchStore.clear()
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      } else {
        // Blur any focused input
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      }
    }

    // ArrowDown/ArrowUp - Navigate search results (when search input is focused)
    if (document.activeElement?.getAttribute('data-testid') === 'search-input') {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        searchStore.selectNext()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        searchStore.selectPrevious()
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const selectedId = searchStore.openSelected()
        if (selectedId) {
          notesStore.selectNote(selectedId)
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
    <!-- Sidebar (Navigation) -->
    <aside class="navigation" :style="sidebarStyle">
      <div v-if="!isSidebarCollapsed" class="nav-header" tabindex="0">
        <h1 class="app-title">Brio</h1>
      </div>
      <div v-if="!isSidebarCollapsed" class="nav-content">
        <p class="nav-placeholder">Tags coming soon...</p>
      </div>

      <!-- Sidebar resize handle -->
      <div
        v-if="!isSidebarCollapsed"
        class="sidebar-separator"
        @mousedown="sidebar.startResize"
        @dblclick="resetSidebarWidth"
      />
    </aside>

    <!-- Collapse/Expand button (fixed position, outside sidebar) -->
    <button
      class="collapse-sidebar-button"
      :class="{ collapsed: isSidebarCollapsed }"
      data-testid="collapse-sidebar-button"
      :title="isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'"
      @click.stop="toggleSidebar"
    >
      <svg
        v-if="!isSidebarCollapsed"
        class="chevron-left"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 12L6 8L10 4"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <svg
        v-else
        class="chevron-right"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 12L10 8L6 4"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <!-- Note List -->
    <aside class="note-list-panel" :style="listStyle">
      <div class="note-list-header" tabindex="0">
        <button
          class="new-note-button"
          data-testid="new-note-button"
          title="New Note (Cmd+N)"
          @click="createNewNote"
        >
          + New Note
        </button>
      </div>
      <NoteList ref="noteListRef" />

      <!-- List resize handle -->
      <div class="list-separator" @mousedown="list.startResize" @dblclick="resetListWidth" />
    </aside>

    <!-- Editor -->
    <main class="editor-panel" tabindex="0">
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
    position: relative;
    background-color: var(--color-bg-secondary);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
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
    overflow-y: auto;
  }

  .nav-placeholder {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    text-align: center;
  }

  .collapse-sidebar-button {
    position: fixed;
    top: 16px;
    left: 228px; /* 240px - 12px */
    z-index: 1000;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: white;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    cursor: pointer;
    transition:
      left 200ms ease-out,
      background-color 150ms ease-out;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    pointer-events: auto;
  }

  .collapse-sidebar-button:hover {
    background-color: var(--color-bg-secondary);
  }

  .collapse-sidebar-button.collapsed {
    left: 8px;
  }

  .sidebar-separator {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 4px;
    cursor: col-resize;
    background-color: transparent;
    transition: background-color 150ms ease-out;
  }

  .sidebar-separator:hover {
    background-color: var(--color-accent);
  }

  .note-list-panel {
    position: relative;
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

  .list-separator {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 4px;
    cursor: col-resize;
    background-color: transparent;
    transition: background-color 150ms ease-out;
  }

  .list-separator:hover {
    background-color: var(--color-accent);
  }

  .editor-panel {
    flex: 1;
    overflow: hidden;
  }
</style>
