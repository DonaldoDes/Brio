<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '../../stores/notes'

const notesStore = useNotesStore()
const { backlinks } = storeToRefs(notesStore)

const count = computed(() => backlinks.value.length)

function navigateToNote(fromNoteId: string) {
  notesStore.selectNote(fromNoteId)
}
</script>

<template>
  <div v-if="count > 0" data-testid="backlinks-panel" class="backlinks-panel">
    <div class="backlinks-header">
      <span class="backlinks-title">Backlinks (<span data-testid="backlinks-count">{{ count }}</span>)</span>
    </div>
    <ul class="backlinks-list">
      <li
        v-for="link in backlinks"
        :key="link.id"
        data-testid="backlink-item"
        class="backlink-item"
        @click="navigateToNote(link.from_note_id)"
      >
        <div class="backlink-title">{{ link.from_note_title }}</div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.backlinks-panel {
  border-top: 1px solid var(--color-border);
  background-color: var(--color-bg);
}

.backlinks-header {
  padding: var(--space-md);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

.backlinks-title {
  display: block;
}

.backlinks-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.backlink-item {
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.15s;
}

.backlink-item:hover {
  background-color: var(--color-bg-hover);
}

.backlink-title {
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}
</style>
