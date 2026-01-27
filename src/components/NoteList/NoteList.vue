<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useNotesStore } from '../../stores/notes'
  import NoteListItem from './NoteListItem.vue'

  const notesStore = useNotesStore()
  const { notes, selectedNoteId } = storeToRefs(notesStore)

  // Keyboard navigation
  const focusedIndex = ref(0)

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusedIndex.value = Math.min(focusedIndex.value + 1, notes.value.length - 1)
      // Propagate selection to store
      if (notes.value[focusedIndex.value]) {
        notesStore.selectNote(notes.value[focusedIndex.value].id)
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
      // Propagate selection to store
      if (notes.value[focusedIndex.value]) {
        notesStore.selectNote(notes.value[focusedIndex.value].id)
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (notes.value[focusedIndex.value]) {
        notesStore.selectNote(notes.value[focusedIndex.value].id)
      }
    }
  }

  function handleNoteClick(noteId: string, index: number) {
    notesStore.selectNote(noteId)
    focusedIndex.value = index
  }

  // Update focused index when selection changes externally
  const selectedIndex = computed(() => notes.value.findIndex((n) => n.id === selectedNoteId.value))

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
</script>

<template>
  <div
    data-testid="notes-list"
    class="notes-list"
    tabindex="0"
    @keydown="handleKeyDown"
    @focus="focusedIndex = 0"
  >
    <NoteListItem
      v-for="(note, index) in notes"
      :key="note.id"
      :note="note"
      :selected="note.id === selectedNoteId"
      @click="handleNoteClick(note.id, index)"
    />

    <div v-if="notes.length === 0" class="empty-state">
      No notes yet. Press Cmd+N to create one.
    </div>
  </div>
</template>

<style scoped>
  .notes-list {
    height: 100%;
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
