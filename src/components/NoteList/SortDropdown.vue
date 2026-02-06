<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps<{
  open: boolean
  sortBy?: 'created' | 'modified' | 'title'
  sortDirection?: 'asc' | 'desc'
}>()

const emit = defineEmits<{
  'update:sortBy': [value: 'created' | 'modified' | 'title']
  'update:sortDirection': [value: 'asc' | 'desc']
  close: []
}>()

const dropdownRef = ref<HTMLElement | null>(null)

function handleSortByClick(value: 'created' | 'modified' | 'title') {
  emit('update:sortBy', value)
  
  // Persist to localStorage
  const prefs = JSON.parse(localStorage.getItem('brio-sort-preferences') || '{}')
  prefs.sortBy = value
  localStorage.setItem('brio-sort-preferences', JSON.stringify(prefs))
  
  emit('close')
}

function handleDirectionClick(value: 'asc' | 'desc') {
  emit('update:sortDirection', value)
  
  // Persist to localStorage
  const prefs = JSON.parse(localStorage.getItem('brio-sort-preferences') || '{}')
  prefs.sortDirection = value
  localStorage.setItem('brio-sort-preferences', JSON.stringify(prefs))
  
  emit('close')
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    // Delay to avoid immediate trigger from the click that opened the dropdown
    await nextTick()
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true)
    }, 0)
  } else {
    document.removeEventListener('click', handleClickOutside, true)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>

<template>
  <div
    v-if="open"
    ref="dropdownRef"
    data-testid="sort-dropdown"
    class="sort-dropdown"
  >
    <!-- Sort By Section -->
    <div>
      <div 
        data-testid="sort-by-header"
        class="sort-section-label"
      >
        SORT BY
      </div>
      
      <button
        data-testid="sort-option-created"
        class="sort-option"
        @click="handleSortByClick('created')"
      >
        <span>Created date</span>
        <span v-if="sortBy === 'created'" data-testid="checkmark" class="sort-checkmark">✓</span>
      </button>
      
      <button
        data-testid="sort-option-modified"
        class="sort-option"
        @click="handleSortByClick('modified')"
      >
        <span>Modified date</span>
        <span v-if="sortBy === 'modified'" data-testid="checkmark" class="sort-checkmark">✓</span>
      </button>
      
      <button
        data-testid="sort-option-title"
        class="sort-option"
        @click="handleSortByClick('title')"
      >
        <span>Title</span>
        <span v-if="sortBy === 'title'" data-testid="checkmark" class="sort-checkmark">✓</span>
      </button>
    </div>

    <!-- Divider -->
    <div data-testid="sort-divider" class="sort-divider"></div>

    <!-- Direction Section -->
    <div>
      <div 
        data-testid="direction-header"
        class="sort-section-label"
      >
        DIRECTION
      </div>
      
      <button
        data-testid="direction-option-asc"
        class="sort-option"
        @click="handleDirectionClick('asc')"
      >
        <span>Ascending ↑</span>
        <span v-if="sortDirection === 'asc'" data-testid="checkmark" class="sort-checkmark">✓</span>
      </button>
      
      <button
        data-testid="direction-option-desc"
        class="sort-option"
        @click="handleDirectionClick('desc')"
      >
        <span>Descending ↓</span>
        <span v-if="sortDirection === 'desc'" data-testid="checkmark" class="sort-checkmark">✓</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Sort dropdown */
.sort-dropdown {
  position: absolute;
  top: 44px;
  right: 16px;
  background: #FFFFFF;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 180px;
  z-index: 100;
}

:root[data-theme="dark"] .sort-dropdown {
  background: #2C2C2E;
  border-color: #3A3A3C;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Sort option */
.sort-option {
  width: 100%;
  height: 32px;
  padding: 6px 12px;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background: transparent;
  border: none;
  color: inherit;
  text-align: left;
}

.sort-option:hover {
  background: rgba(0, 0, 0, 0.04);
}

:root[data-theme="dark"] .sort-option:hover {
  background: rgba(255, 255, 255, 0.06);
}

/* Sort section label */
.sort-section-label {
  font-size: 11px;
  color: #999999;
  padding: 4px 12px;
}

/* Sort checkmark */
.sort-checkmark {
  color: #F59E0B;
}

/* Sort divider */
.sort-divider {
  height: 1px;
  background: #E0E0E0;
  margin: 4px 0;
}

:root[data-theme="dark"] .sort-divider {
  background: #3A3A3C;
}
</style>
