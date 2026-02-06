<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useWindowSize } from '@vueuse/core'
  import { useNotesStore } from '../../stores/notes'
  import { useSearchStore } from '../../stores/search'
  import { useTagsStore } from '../../stores/tags'
  import { useResizable } from '../../composables/useResizable'
  import { useLayoutPersistence } from '../../composables/useLayoutPersistence'
  import NoteList from '../../components/NoteList/NoteList.vue'
  import NoteEditor from '../../components/Editor/NoteEditor.vue'
  import DeleteConfirmDialog from '../../components/Editor/DeleteConfirmDialog.vue'
  import BacklinksPanel from '../../components/Sidebar/BacklinksPanel.vue'
  import BearSidebar from '../../components/Sidebar/BearSidebar.vue'
  import ThemeSettings from '../../components/Settings/ThemeSettings.vue'
  import SettingsModal from '../../components/Settings/SettingsModal.vue'

  const notesStore = useNotesStore()
  const { selectedNote } = storeToRefs(notesStore)

  const searchStore = useSearchStore()
  const tagsStore = useTagsStore()

  // Ref to NoteList component for search focus
  const noteListRef = ref<InstanceType<typeof NoteList> | null>(null)

  // Delete dialog state
  const showDeleteDialog = ref(false)
  
  // Settings modal state
  const showSettingsModal = ref(false)
  
  // Mobile sidebar state
  const mobileSidebarOpen = ref(false)
  
  // Backlinks sidebar state (hidden by default)
  const showBacklinks = ref(false)
  
  function toggleMobileSidebar() {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
  }
  
  function toggleBacklinks() {
    showBacklinks.value = !showBacklinks.value
  }
  
  function closeMobileSidebar() {
    mobileSidebarOpen.value = false
  }
  
  function openSettings() {
    showSettingsModal.value = true
  }
  
  function closeSettings() {
    showSettingsModal.value = false
  }

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
      
      // Load tags after notes
      await tagsStore.loadTags()
      console.log('[Layout] Tags loaded successfully')
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
    <!-- Mobile hamburger menu -->
    <button 
      class="hamburger-menu" 
      data-testid="hamburger-menu"
      aria-label="Toggle sidebar"
      @click="toggleMobileSidebar"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
    
    <!-- BearSidebar (Navigation) -->
    <BearSidebar
      :mobile-open="mobileSidebarOpen"
      @open-settings="openSettings"
      @navigate="(section) => console.log('Navigate to:', section)"
      @filter-by-tag="(tag) => tagsStore.toggleTag(tag)"
      @close-mobile="closeMobileSidebar"
    />
    
    <!-- Settings Modal -->
    <SettingsModal
      :is-open="showSettingsModal"
      @close="closeSettings"
    />

    <!-- Note List -->
    <aside class="note-list-panel" :style="listStyle">
      <!-- Header hidden - toolbar has the icons -->
      <!-- <div class="note-list-header" tabindex="0">
        <button
          class="new-note-button"
          data-testid="new-note-button"
          title="New Note (Cmd+N)"
          aria-label="Create new note"
          @click="createNewNote"
        >
          + New Note
        </button>
        <ThemeSettings />
      </div> -->
      <NoteList ref="noteListRef" />

      <!-- List resize handle -->
      <div class="list-separator" @mousedown="list.startResize" @dblclick="resetListWidth" />
    </aside>

    <!-- Editor -->
    <main class="editor-panel" tabindex="0">
      <div class="editor-content">
        <NoteEditor @delete-note="openDeleteDialog" />
      </div>
      <aside v-if="showBacklinks" class="backlinks-sidebar">
        <BacklinksPanel />
      </aside>
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
    position: relative;
  }
  
  .hamburger-menu {
    display: none;
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 1001;
    width: 40px;
    height: 40px;
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    color: var(--color-text);
    transition: all 150ms ease;
  }
  
  .hamburger-menu:hover {
    background-color: var(--color-bg-tertiary);
  }
  
  @media (max-width: 768px) {
    .hamburger-menu {
      display: flex;
    }
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
    display: flex;
    gap: var(--space-sm);
    align-items: center;
  }

  .new-note-button {
    flex: 1;
    padding: var(--space-sm) var(--space-md);
    background-color: transparent;
    color: var(--color-text-secondary);
    border: none;
    border-radius: 6px;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.2s;
  }

  .new-note-button:hover {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
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
    display: flex;
  }

  .editor-content {
    flex: 1;
    overflow: hidden;
  }

  .backlinks-sidebar {
    width: 280px;
    border-left: 1px solid var(--color-border);
    background-color: var(--color-bg);
    overflow-y: auto;
  }
</style>
