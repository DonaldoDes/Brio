<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { NoteType } from '../../../shared/types/note'
  import { NOTE_TYPE_REGISTRY, getAllNoteTypes } from '../../utils/noteTypeRegistry'

  const props = defineProps<{
    modelValue: NoteType
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: NoteType]
  }>()

  const noteTypes = getAllNoteTypes()
  const isOpen = ref(false)

  const selectedTypeConfig = computed(() => NOTE_TYPE_REGISTRY[props.modelValue])

  function handleSelect(type: NoteType) {
    emit('update:modelValue', type)
    isOpen.value = false
  }

  function toggleDropdown() {
    isOpen.value = !isOpen.value
  }
</script>

<template>
  <div class="note-type-selector-wrapper">
    <button
      class="note-type-selector"
      data-testid="note-type-selector"
      aria-label="Select note type"
      @click="toggleDropdown"
    >
      <span class="selected-type">
        <span class="type-icon">{{ selectedTypeConfig.icon }}</span>
        <span class="type-label">{{ selectedTypeConfig.label }}</span>
      </span>
      <span class="dropdown-arrow">▼</span>
    </button>

    <div v-if="isOpen" class="note-type-dropdown">
      <button
        v-for="type in noteTypes"
        :key="type"
        class="note-type-option"
        :class="{ selected: type === modelValue }"
        :data-testid="`note-type-option-${type}`"
        @click="handleSelect(type)"
      >
        <span class="type-icon">{{ NOTE_TYPE_REGISTRY[type].icon }}</span>
        <span class="type-label">{{ NOTE_TYPE_REGISTRY[type].label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
  .note-type-selector-wrapper {
    position: relative;
  }

  .note-type-selector {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .note-type-selector:hover {
    background-color: var(--color-bg-tertiary);
  }

  .selected-type {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .type-icon {
    font-size: var(--font-size-md);
  }

  .type-label {
    color: var(--color-text);
  }

  .dropdown-arrow {
    font-size: 10px;
    color: var(--color-text-muted);
    margin-left: var(--space-xs);
  }

  .note-type-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: var(--space-xs);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    min-width: 150px;
  }

  .note-type-option {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm);
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    color: var(--color-text);
  }

  .note-type-option:hover {
    background-color: var(--color-bg-secondary);
  }

  .note-type-option.selected {
    background-color: var(--color-accent);
    color: white;
  }
</style>
