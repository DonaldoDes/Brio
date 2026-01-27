<script setup lang="ts">
  import type { Note } from '../../../shared/types/note'

  const props = defineProps<{
    note: Note
    selected: boolean
  }>()

  const emit = defineEmits<{
    click: []
  }>()

  // Generate preview from content (first 50 chars)
  const preview = props.note.content ? props.note.content.slice(0, 50).replace(/\n/g, ' ') : ''
</script>

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
    <div class="note-title">{{ note.title }}</div>
    <div class="note-preview">{{ preview }}</div>
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
</style>
