<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useTagsStore } from '../../stores/tags'

const tagsStore = useTagsStore()
const { selectedTags } = storeToRefs(tagsStore)

const emit = defineEmits<{
  'chip-removed': [tag: string]
}>()

async function handleRemoveChip(tag: string, event?: Event) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  emit('chip-removed', tag)
  await tagsStore.toggleTag(tag)
}

async function handleKeyDown(event: KeyboardEvent, tag: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    await handleRemoveChip(tag, event)
  }
}
</script>

<template>
  <div v-if="selectedTags.length > 0" class="active-chips">
    <span
      v-for="tag in selectedTags"
      :key="tag"
      class="filter-chip"
    >
      {{ tag }}
      <button
        class="chip-remove"
        :aria-label="`Remove ${tag} filter`"
        @click="handleRemoveChip(tag)"
        @keydown="handleKeyDown($event, tag)"
      >
        ×
      </button>
    </span>
  </div>
</template>

<style scoped>
.active-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 4px 10px;
  background: #DADADA;
  border-radius: 12px;
  font-size: 12px;
  color: #555555;
  margin-right: 4px;
}

:root[data-theme="dark"] .filter-chip {
  background: #3A3A3C;
  color: #E5E5E7;
}

.chip-remove {
  margin-left: 6px;
  background: none;
  border: none;
  color: inherit;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.chip-remove:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

:root[data-theme="dark"] .chip-remove:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.chip-remove:focus {
  outline: 2px solid #007AFF;
  outline-offset: 2px;
}
</style>
