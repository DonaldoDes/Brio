<script setup lang="ts">
  import { computed, watch, ref } from 'vue'
  import type { Note } from '../../../shared/types/note'
  import type { SearchResult } from '../../stores/search'
  import { getNoteTypeConfig } from '../../utils/noteTypeRegistry'
  import { stripMarkdown, formatRelativeDate } from '../../utils/textUtils'

  const props = defineProps<{
    note: Note | SearchResult
    selected: boolean
    searchQuery?: string
  }>()

  const emit = defineEmits<{
    click: []
  }>()

  // Generate preview from content or use search preview
  const preview = computed(() => {
    const searchResult = props.note as SearchResult
    if (searchResult.preview) {
      return stripMarkdown(searchResult.preview)
    }
    if (props.note.content) {
      const plainText = stripMarkdown(props.note.content)
      return plainText.slice(0, 100)
    }
    return '(No content)'
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

  // Get note type icon - use ref to force reactivity
  const noteType = ref(props.note.type || 'note')
  
  // Watch for changes in note.type
  watch(
    () => props.note.type,
    (newType) => {
      noteType.value = newType || 'note'
    },
    { immediate: true }
  )
  
  const typeIcon = computed(() => {
    return getNoteTypeConfig(noteType.value).icon
  })

  // Format the updated_at date
  const formattedDate = computed(() => {
    return formatRelativeDate(props.note.updated_at)
  })
</script>

<!-- eslint-disable vue/no-v-html -->
<template>
  <div
    :data-testid="'note-item'"
    :data-note-id="note.id"
    :data-note-slug="note.slug"
    :data-note-title="note.title"
    :data-selected="selected"
    role="listitem"
    tabindex="0"
    :aria-selected="selected ? 'true' : 'false'"
    :aria-label="`Note: ${note.title}`"
    class="note-item"
    :class="{ selected }"
    @click="emit('click')"
  >
    <div class="note-header">
      <div class="note-title" v-html="highlightText(note.title)"></div>
    </div>
    <div class="note-meta">
      <div
        class="note-preview"
        data-testid="search-preview"
        v-html="highlightText(preview)"
      ></div>
      <div class="note-date" data-testid="note-date">{{ formattedDate }}</div>
    </div>
  </div>
</template>

<style scoped>
  /* Bear Redesign - Note Item */
  .note-item {
    padding: 12px 16px;
    border-bottom: 1px solid #F0F0F0;
    cursor: pointer;
    transition: background-color 0.1s;
    min-height: 72px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  :root[data-theme="dark"] .note-item {
    border-bottom-color: #2C2C2E;
  }

  /* Focus ring inside the item to avoid overflow */
  .note-item:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .note-item:hover {
    background-color: #F9F9F9;
  }

  :root[data-theme="dark"] .note-item:hover {
    background-color: #2C2C2E;
  }

  .note-item.selected {
    background-color: #E3E9F0;
  }

  :root[data-theme="dark"] .note-item.selected {
    background-color: #3A3A3C;
  }

  .note-header {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-bottom: 4px;
  }

  .note-type-icon {
    font-size: var(--font-size-md);
    flex-shrink: 0;
  }

  /* Bear Redesign - Title */
  .note-title {
    font-size: 14px;
    font-weight: 600;
    color: #333333;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 4px;
  }

  :root[data-theme="dark"] .note-title {
    color: #E5E5E7;
  }

  .note-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* Bear Redesign - Preview */
  .note-preview {
    font-size: 13px;
    color: #666666;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.4;
    max-height: 2.8em;
    margin-bottom: 4px;
  }

  :root[data-theme="dark"] .note-preview {
    color: #8E8E93;
  }

  /* Bear Redesign - Date */
  .note-date {
    font-size: 11px;
    color: #999999;
    text-align: right;
    white-space: nowrap;
  }

  :root[data-theme="dark"] .note-date {
    color: #636366;
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
