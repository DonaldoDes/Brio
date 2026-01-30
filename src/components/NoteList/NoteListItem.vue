<script setup lang="ts">
  import { computed, watch } from 'vue'
  import type { Note } from '../../../shared/types/note'
  import type { SearchResult } from '../../stores/search'

  const props = defineProps<{
    note: Note | SearchResult
    selected: boolean
    searchQuery?: string
  }>()

  const emit = defineEmits<{
    click: []
  }>()

  // Debug: log when selected changes
  watch(
    () => props.selected,
    (newVal) => {
      console.log('[NoteListItem] selected changed for', props.note.title, ':', newVal)
    }
  )

  // Generate preview from content or use search preview
  const preview = computed(() => {
    const searchResult = props.note as SearchResult
    if (searchResult.preview) {
      return searchResult.preview
    }
    return props.note.content ? props.note.content.slice(0, 50).replace(/\n/g, ' ') : ''
  })

  // Highlight search term in text
  function highlightText(text: string): string {
    if (!props.searchQuery || !text) return text

    const words = props.searchQuery.trim().toLowerCase().split(/\s+/)
    let highlightedText = text

    for (const word of words) {
      const regex = new RegExp(`(${word})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>')
    }

    return highlightedText
  }
</script>

<!-- eslint-disable vue/no-v-html -->
<template>
  <div
    :data-testid="'note-item'"
    :data-note-id="note.id"
    :data-note-slug="note.slug"
    :data-note-title="note.title"
    :data-selected="selected"
    class="note-item"
    :class="{ selected }"
    @click="emit('click')"
  >
    <div class="note-title" v-html="highlightText(note.title)"></div>
    <div
      v-if="preview"
      class="note-preview"
      data-testid="search-preview"
      v-html="highlightText(preview)"
    ></div>
  </div>
</template>

<style scoped>
  .note-item {
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .note-item:hover {
    background-color: var(--color-bg-tertiary);
  }

  .note-item.selected {
    background-color: var(--color-bg-secondary);
  }

  .note-title {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    margin-bottom: var(--space-xs);
  }

  .note-preview {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Highlight styling */
  .note-title :deep(mark),
  .note-preview :deep(mark) {
    background-color: #fff3cd;
    color: inherit;
    padding: 0 2px;
    border-radius: 2px;
  }
</style>
