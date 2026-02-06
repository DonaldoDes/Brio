<script setup lang="ts">
  import { ref, computed, watch, nextTick } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useNotesStore } from '../../stores/notes'
  import { useSearchStore } from '../../stores/search'
  import { useTagsStore } from '../../stores/tags'
  import NoteListItem from './NoteListItem.vue'
  import NotesListToolbar from './NotesListToolbar.vue'
  import SortDropdown from './SortDropdown.vue'
  import FilterChips from './FilterChips.vue'
  import type { NoteType } from '../../../shared/types/note'
  import { getAllNoteTypes, NOTE_TYPE_REGISTRY } from '../../utils/noteTypeRegistry'

  const notesStore = useNotesStore()
  const { notes, selectedNoteId } = storeToRefs(notesStore)

  const searchStore = useSearchStore()
  const { query, results, selectedIndex: searchSelectedIndex } = storeToRefs(searchStore)

  const tagsStore = useTagsStore()
  const { selectedTag, selectedTags, filteredNoteIds, selectedTagsNoteIds } = storeToRefs(tagsStore)

  // Search input ref
  const searchInputRef = ref<HTMLInputElement | null>(null)

  // Type filter
  const selectedTypeFilter = ref<NoteType | 'all'>('all')
  const noteTypes = getAllNoteTypes()

  // Display notes: search results if query exists, tag filter if tag selected, type filter, otherwise all notes
  const displayNotes = computed(() => {
    console.log(
      '[NoteList] displayNotes computed - query:',
      query.value,
      'results:',
      results.value.length,
      'notes:',
      notes.value.length,
      'selectedTag:',
      selectedTag.value,
      'selectedTags:',
      selectedTags.value,
      'selectedTagsNoteIds:',
      selectedTagsNoteIds.value.length,
      'filteredNoteIds:',
      filteredNoteIds.value.length,
      'selectedTypeFilter:',
      selectedTypeFilter.value
    )

    let baseNotes = notes.value

    // Priority 1: Search query
    if (query.value && query.value.trim() !== '') {
      console.log('[NoteList] Using search results:', results.value)
      baseNotes = results.value
    }
    // Priority 2: Multi-tag filter (selectedTags array)
    else if (selectedTags.value.length > 0 && selectedTagsNoteIds.value.length > 0) {
      baseNotes = notes.value.filter((note) => selectedTagsNoteIds.value.includes(note.id))
      console.log('[NoteList] Using selectedTags-filtered notes:', baseNotes)
    }
    // Priority 3: Legacy single tag filter
    else if (selectedTag.value && filteredNoteIds.value.length > 0) {
      baseNotes = notes.value.filter((note) => filteredNoteIds.value.includes(note.id))
      console.log('[NoteList] Using tag-filtered notes:', baseNotes)
    }

    // Priority 4: Type filter
    if (selectedTypeFilter.value !== 'all') {
      const filtered = baseNotes.filter((note) => (note.type || 'note') === selectedTypeFilter.value)
      console.log('[NoteList] Applying type filter:', selectedTypeFilter.value, 'result:', filtered)
      return filtered
    }

    console.log('[NoteList] Returning notes:', baseNotes)
    return baseNotes
  })

  // Keyboard navigation
  const focusedIndex = ref(0)

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation() // Prevent event from bubbling to parent
      // If in search mode, use search store navigation
      if (query.value && query.value.trim() !== '') {
        console.log('[NoteList] ArrowDown in search mode, calling selectNext()')
        searchStore.selectNext()
        console.log(
          '[NoteList] After selectNext(), searchSelectedIndex:',
          searchSelectedIndex.value
        )
      } else {
        focusedIndex.value = Math.min(focusedIndex.value + 1, displayNotes.value.length - 1)
        if (displayNotes.value[focusedIndex.value]) {
          notesStore.selectNote(displayNotes.value[focusedIndex.value].id)
        }
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      // If in search mode, use search store navigation
      if (query.value && query.value.trim() !== '') {
        searchStore.selectPrevious()
      } else {
        focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
        if (displayNotes.value[focusedIndex.value]) {
          notesStore.selectNote(displayNotes.value[focusedIndex.value].id)
        }
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      // Use search selected index if in search mode, otherwise use focused index
      const indexToUse =
        query.value && query.value.trim() !== '' ? searchSelectedIndex.value : focusedIndex.value
      console.log(
        '[NoteList] Enter pressed, indexToUse:',
        indexToUse,
        'displayNotes:',
        displayNotes.value.length
      )
      if (displayNotes.value[indexToUse]) {
        console.log(
          '[NoteList] Selecting note:',
          displayNotes.value[indexToUse].title,
          displayNotes.value[indexToUse].id
        )
        notesStore.selectNote(displayNotes.value[indexToUse].id)
      } else {
        console.log('[NoteList] No note at index:', indexToUse)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (query.value) {
        handleClearSearch()
      }
    }
  }

  function handleNoteClick(noteId: string, index: number) {
    notesStore.selectNote(noteId)
    focusedIndex.value = index
    // Update search selected index if in search mode
    if (query.value && query.value.trim() !== '') {
      searchStore.selectedIndex = index
    }
  }

  // Update focused index when selection changes externally
  const selectedIndex = computed(() =>
    displayNotes.value.findIndex((n) => n.id === selectedNoteId.value)
  )

  // Sync focusedIndex with selectedIndex
  watch(
    selectedIndex,
    (newIndex) => {
      if (newIndex !== -1) {
        focusedIndex.value = newIndex
      }
    },
    { immediate: true }
  )

  // Sync with search selected index when in search mode
  watch(searchSelectedIndex, (newIndex) => {
    console.log('[NoteList] searchSelectedIndex changed to:', newIndex, 'query:', query.value)
    if (query.value && query.value.trim() !== '' && newIndex >= 0) {
      focusedIndex.value = newIndex
      // Don't call notesStore.selectNote() here - it interferes with search selection
      // The selection is handled by the :selected binding in the template
    }
  })

  // Search handlers
  async function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement
    await searchStore.search(target.value)
  }

  function handleClearSearch() {
    searchStore.clear()
    if (searchInputRef.value) {
      searchInputRef.value.focus()
    }
  }

  // Highlight search term in text (unused for now, kept for future use)
  // function highlightText(text: string, searchQuery: string): string {
  //   if (!searchQuery || !text) return text
  //
  //   const words = searchQuery.trim().toLowerCase().split(/\s+/)
  //   let highlightedText = text
  //
  //   for (const word of words) {
  //     const regex = new RegExp(`(${word})`, 'gi')
  //     highlightedText = highlightedText.replace(regex, '<mark>$1</mark>')
  //   }
  //
  //   return highlightedText
  // }

  // Type filter handlers
  function handleTypeFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement
    selectedTypeFilter.value = target.value as NoteType | 'all'
  }

  // Toolbar handlers
  function handleNewNote() {
    notesStore.createNote()
  }

  const showSortDropdown = ref(false)
  const sortBy = ref<'created' | 'modified' | 'title'>('modified')
  const sortDirection = ref<'asc' | 'desc'>('desc')

  function handleToggleSort() {
    showSortDropdown.value = !showSortDropdown.value
  }

  function handleCloseSortDropdown() {
    showSortDropdown.value = false
  }

  function handleUpdateSortBy(value: 'created' | 'modified' | 'title') {
    sortBy.value = value
  }

  function handleUpdateSortDirection(value: 'asc' | 'desc') {
    sortDirection.value = value
  }

  const showFilterBar = ref(false)
  
  function handleToggleFilter() {
    showFilterBar.value = !showFilterBar.value
    if (showFilterBar.value) {
      nextTick(() => {
        searchInputRef.value?.focus()
      })
    }
  }

  // Expose search input ref for external focus
  defineExpose({
    focusSearch: async () => {
      console.log('[NoteList] focusSearch called, ref:', searchInputRef.value)
      await nextTick()
      if (searchInputRef.value) {
        searchInputRef.value.focus()
        console.log('[NoteList] focus() called on input')
      } else {
        console.error('[NoteList] searchInputRef is null!')
      }
    },
  })
</script>

<template>
  <div class="notes-list-container" data-testid="notes-list-container">
    <!-- Toolbar -->
    <div style="position: relative;">
      <NotesListToolbar
        @new-note="handleNewNote"
        @toggle-sort="handleToggleSort"
        @toggle-filter="handleToggleFilter"
      />
      
      <!-- Sort Dropdown -->
      <SortDropdown
        :open="showSortDropdown"
        :sort-by="sortBy"
        :sort-direction="sortDirection"
        @update:sort-by="handleUpdateSortBy"
        @update:sort-direction="handleUpdateSortDirection"
        @close="handleCloseSortDropdown"
      />
    </div>

    <!-- Filter Chips (always visible when tags selected) -->
    <div v-if="selectedTags.length > 0 && !showFilterBar" class="chips-only-container">
      <FilterChips />
    </div>

    <!-- Search Input (hidden by default, shown when filter button clicked) -->
    <div v-if="showFilterBar" class="search-container">
      <FilterChips v-if="selectedTags.length > 0" />
      <div class="search-input-wrapper">
        <svg
          class="search-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" />
          <path d="M11 11L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <input
          id="note-search-input"
          ref="searchInputRef"
          type="text"
          name="note-search"
          placeholder="Search notes..."
          class="search-input"
          data-testid="search-input"
          :value="query"
          @input="handleSearchInput"
          @keydown="handleKeyDown"
        />
        <button
          v-if="query"
          title="Clear search"
          class="clear-button"
          data-testid="search-clear-button"
          @click="handleClearSearch"
        >
          ×
        </button>
      </div>
    </div>

    <!-- Notes List -->
    <div
      data-testid="notes-list"
      class="notes-list"
      role="list"
      tabindex="0"
      @keydown="handleKeyDown"
      @focus="focusedIndex = 0"
    >
      <NoteListItem
        v-for="(note, index) in displayNotes"
        :key="`${note.id}-${note.updated_at?.getTime() || 0}`"
        :note="note"
        :selected="
          query && query.trim() !== '' ? index === searchSelectedIndex : note.id === selectedNoteId
        "
        :search-query="query"
        @click="handleNoteClick(note.id, index)"
      />

      <div v-if="displayNotes.length === 0" class="empty-state">
        {{ query ? 'No notes found' : 'No notes yet. Press Cmd+N to create one.' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Bear Redesign - Note List Container */
  .notes-list-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 280px;
    background-color: var(--bg-secondary);
  }

  /* Bear Redesign - Filter Chips Container */
  .chips-only-container {
    padding: 8px 16px;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);
  }

  /* Bear Redesign - Search Input */
  .search-container {
    padding: 8px 16px;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 10px;
    color: var(--color-text-muted);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 6px 12px 6px 36px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    background-color: #F0F0F0;
    color: var(--color-text);
    outline: none;
    height: 28px;
    transition: background-color 0.2s;
  }

  :root[data-theme="dark"] .search-input {
    background-color: #2C2C2E;
    color: #E5E5E7;
  }

  .search-input::placeholder {
    color: #999999;
  }

  :root[data-theme="dark"] .search-input::placeholder {
    color: #636366;
  }

  .search-input:focus {
    background-color: #E8E8E8;
  }

  :root[data-theme="dark"] .search-input:focus {
    background-color: #3A3A3C;
  }

  .clear-button {
    position: absolute;
    right: 8px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    color: #999999;
    transition: color 0.2s;
  }

  :root[data-theme="dark"] .clear-button {
    color: #636366;
  }

  .clear-button:hover {
    color: #666666;
  }

  :root[data-theme="dark"] .clear-button:hover {
    color: #8E8E93;
  }

  .notes-list {
    flex: 1;
    overflow-y: auto;
    background-color: transparent;
    outline: none;
    border-top: 1px solid #F0F0F0;
  }

  :root[data-theme="dark"] .notes-list {
    border-top-color: #2C2C2E;
  }

  .empty-state {
    padding: var(--space-xl);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }
</style>
