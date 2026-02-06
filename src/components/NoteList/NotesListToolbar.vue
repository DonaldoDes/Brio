<script setup lang="ts">
const emit = defineEmits<{
  'new-note': []
  'toggle-sort': []
  'toggle-filter': []
}>()
</script>

<template>
  <div 
    data-testid="notes-list-toolbar"
    class="toolbar-container"
  >
    <button
      data-testid="toolbar-new-note"
      aria-label="New note"
      class="toolbar-button"
      @click="emit('new-note')"
    >
      <svg class="toolbar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>

    <button
      data-testid="toolbar-sort"
      aria-label="Sort notes"
      class="toolbar-button"
      @click="emit('toggle-sort')"
    >
      <svg class="toolbar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 12h18M3 6h18M3 18h18" />
      </svg>
    </button>

    <button
      data-testid="toolbar-filter"
      aria-label="Filter notes"
      class="toolbar-button"
      @click="emit('toggle-filter')"
    >
      <svg class="toolbar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
/* Bear Redesign - Toolbar */
.toolbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 8px 16px;
  background-color: transparent;
  gap: 12px;
}

/* Bear Redesign - Header Icons */
.toolbar-button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #888888;
  cursor: pointer;
  padding: 4px;
  transition: color 0.1s;
}

:root[data-theme="dark"] .toolbar-button {
  color: #8E8E93;
}

.toolbar-button:hover {
  color: #333333;
}

:root[data-theme="dark"] .toolbar-button:hover {
  color: #E5E5E7;
}

.toolbar-icon {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1;
}
</style>
