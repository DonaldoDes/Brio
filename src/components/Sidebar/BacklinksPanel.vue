<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '../../stores/notes'

const notesStore = useNotesStore()
const { backlinks } = storeToRefs(notesStore)

const count = computed(() => backlinks.value.length)

function navigateToNote(noteId: string) {
  notesStore.selectNote(noteId)
}
</script>

<template>
  <div data-testid="backlinks-panel" class="backlinks-panel">
    <div class="backlinks-header">
      <span class="backlinks-title">Backlinks (<span data-testid="backlinks-count">{{ count }}</span>)</span>
    </div>
    <ul v-if="count > 0" class="backlinks-list">
      <li
        v-for="link in backlinks"
        :key="link.id"
        data-testid="backlink-item"
        class="backlink-item"
        @click="navigateToNote(link.from_note_id)"
      >
        {{ link.from_note_title }}
      </li>
    </ul>
    <div v-else class="backlinks-empty">
      <p>No backlinks</p>
    </div>
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
  text-transform: uppercase;
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

.backlinks-empty {
  padding: var(--space-md);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  text-align: center;
}
</style>
