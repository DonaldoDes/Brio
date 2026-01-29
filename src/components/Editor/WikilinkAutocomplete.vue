<script setup lang="ts">
import type { Note } from '../../../shared/types/note'

const props = defineProps<{
  isOpen: boolean
  query: string
  position: { x: number; y: number }
  selectedIndex: number
  suggestions: Note[]
}>()

const emit = defineEmits<{
  select: [title: string]
}>()

function handleSelect(title: string) {
  emit('select', title)
}
</script>

<template>
  <div
    v-if="isOpen"
    data-testid="wikilink-autocomplete"
    :data-autocomplete-open="isOpen"
    class="autocomplete-popup"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
  >
    <ul class="autocomplete-list">
      <li
        v-for="(note, index) in suggestions"
        :key="note.id"
        data-testid="autocomplete-item"
        :data-highlighted="index === selectedIndex"
        class="autocomplete-item"
        :class="{ highlighted: index === selectedIndex }"
        @click="handleSelect(note.title)"
      >
        {{ note.title }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.autocomplete-popup {
  position: fixed;
  z-index: 1000;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  min-width: 200px;
}

.autocomplete-list {
  list-style: none;
  padding: var(--space-xs);
  margin: 0;
}

.autocomplete-item {
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background-color 0.15s;
}

.autocomplete-item:hover,
.autocomplete-item.highlighted {
  background-color: var(--color-bg-hover);
}
</style>
