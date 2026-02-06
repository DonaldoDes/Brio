<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'

const props = defineProps<{
  open: boolean
  chips?: string[]
}>()

const emit = defineEmits<{
  close: []
  'add-chip': [value: string]
  'remove-chip': [index: number]
  'clear-all': []
}>()

const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

// Auto-focus when opened
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    inputRef.value?.focus()
  }
})

// Auto-close when empty
watch([() => props.chips, inputValue], ([chips, value]) => {
  if (props.open && (!chips || chips.length === 0) && !value) {
    emit('close')
  }
})

function handleKeyDown(event: KeyboardEvent) {
  const value = inputValue.value.trim()
  
  if (event.key === ' ' || event.key === 'Enter') {
    if (value && value.startsWith('tag:') && value.length > 4) {
      event.preventDefault()
      emit('add-chip', value)
      inputValue.value = ''
    }
  } else if (event.key === 'Backspace' && !inputValue.value) {
    // Remove last chip if input is empty
    if (props.chips && props.chips.length > 0) {
      emit('remove-chip', props.chips.length - 1)
    }
  } else if (event.key === 'Escape' && !inputValue.value) {
    emit('close')
  }
}

function removeChip(index: number) {
  emit('remove-chip', index)
}

function getChipLabel(chip: string): string {
  return chip.replace('tag:', '')
}

function clearAll() {
  emit('clear-all')
}
</script>

<template>
  <div
    v-if="open"
    data-testid="filter-bar"
    class="flex flex-wrap items-center px-3 py-2 bg-gray-50 dark:bg-gray-900 border-0"
    style="min-height: 36px; gap: 6px"
  >
    <!-- Chips -->
    <span
      v-for="(chip, index) in chips"
      :key="index"
      :data-testid="`chip-${index}`"
      class="filter-chip inline-flex items-center gap-1 focus:outline focus:outline-2 focus:outline-blue-500"
      tabindex="0"
    >
      <span>{{ getChipLabel(chip) }}</span>
      <button
        :data-testid="`chip-remove-${index}`"
        class="chip-remove-btn transition-colors"
        @click="removeChip(index)"
      >
        ×
      </button>
    </span>

    <!-- Clear all button -->
    <button
      v-if="chips && chips.length > 1"
      data-testid="clear-all-button"
      class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
      @click="clearAll"
    >
      Clear all
    </button>

    <!-- Input -->
    <input
      id="notes-filter-input"
      ref="inputRef"
      v-model="inputValue"
      data-testid="filter-input"
      type="text"
      name="notes-filter"
      placeholder="Filter..."
      class="flex-1 min-w-[100px] bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
      @keydown="handleKeyDown"
    />
  </div>
</template>

<style scoped>
.filter-chip {
  background: var(--chip-bg, #F0F0F0);
  color: var(--chip-text, #555555);
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
}

.chip-remove-btn {
  font-size: 14px;
  line-height: 1;
  opacity: 0.6;
  padding: 0 2px;
}

.chip-remove-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

:root[data-theme="dark"] .chip-remove-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
