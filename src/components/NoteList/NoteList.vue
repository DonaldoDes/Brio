<script setup lang="ts">
  import { ref, computed, watch, nextTick } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useNotesStore } from '../../stores/notes'
  import { useSearchStore } from '../../stores/search'
  import NoteListItem from './NoteListItem.vue'

  const notesStore = useNotesStore()
  const { notes, selectedNoteId } = storeToRefs(notesStore)

  const searchStore = useSearchStore()
  const { query, results, selectedIndex: searchSelectedIndex } = storeToRefs(searchStore)

  // Search input ref
  const searchInputRef = ref<HTMLInputElement | null>(null)

  // Display notes: search results if query exists, otherwise all notes
  const displayNotes = computed(() => {
    console.log(
      '[NoteList] displayNotes computed - query:',
      query.value,
      'results:',
      results.value.length,
      'notes:',
      notes.value.length
    )
    if (query.value && query.value.trim() !== '') {
      console.log('[NoteList] Returning search results:', results.value)
      return results.value
    }
    console.log('[NoteList] Returning all notes')
    return notes.value
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
  <div class="notes-list-container">
    <!-- Search Input -->
    <div class="search-container">
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
          ref="searchInputRef"
          type="text"
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
      tabindex="0"
      @keydown="handleKeyDown"
      @focus="focusedIndex = 0"
    >
      <NoteListItem
        v-for="(note, index) in displayNotes"
        :key="note.id"
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
  .notes-list-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .search-container {
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg);
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
    padding: var(--space-sm) var(--space-md) var(--space-sm) 36px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: var(--font-size-sm);
    background-color: var(--color-bg);
    color: var(--color-text);
    outline: none;
    transition: border-color 0.2s;
  }

  .search-input:focus {
    border-color: var(--color-accent);
  }

  .clear-button {
    position: absolute;
    right: 8px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-bg-tertiary);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    color: var(--color-text-muted);
    transition: background-color 0.2s;
  }

  .clear-button:hover {
    background-color: var(--color-bg-secondary);
    color: var(--color-text);
  }

  .notes-list {
    flex: 1;
    overflow-y: auto;
    background-color: var(--color-bg);
    outline: none;
  }

  .empty-state {
    padding: var(--space-xl);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }
</style>
