<script setup lang="ts">
  import { onMounted, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useTasksStore } from '../../stores/tasks'
  import { useNotesStore } from '../../stores/notes'

  const tasksStore = useTasksStore()
  const notesStore = useNotesStore()
  const { filteredTasks, pendingCount, totalCount, filter, isLoading } = storeToRefs(tasksStore)
  const { loadTasks, setFilter } = tasksStore
  const { selectNote } = notesStore

  // Load tasks on mount
  onMounted(async () => {
    await loadTasks()
  })

  // Reload tasks when notes change (tasks might have been added/updated)
  const { notes } = storeToRefs(notesStore)
  watch(
    notes,
    async () => {
      await loadTasks()
    },
    { deep: true }
  )

  // Handle task click - navigate to the note
  function handleTaskClick(noteId: string) {
    selectNote(noteId)
  }

  // Filter buttons
  const filters = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'done', label: 'Done' },
  ] as const
</script>

<template>
  <div class="task-panel" data-testid="task-panel">
    <div class="task-panel-header">
      <h3 class="task-panel-title">Tasks</h3>
      <div class="task-counter" data-testid="task-counter">
        {{ pendingCount }}/{{ totalCount }}
      </div>
    </div>

    <div class="task-filters">
      <button
        v-for="f in filters"
        :key="f.value"
        :class="['filter-button', { active: filter === f.value }]"
        :data-testid="`task-filter-${f.value}`"
        @click="setFilter(f.value)"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="isLoading" class="task-loading">Loading tasks...</div>

    <div v-else-if="filteredTasks.length === 0" class="task-empty">
      No tasks found
    </div>

    <div v-else class="task-list">
      <div
        v-for="task in filteredTasks"
        :key="`${task.note_id}-${task.line_number}`"
        class="task-item"
        data-testid="task-item"
        @click="handleTaskClick(task.note_id)"
      >
        <div class="task-content">
          <span class="task-checkbox-indicator" :data-status="task.status">
            {{ task.status === 'pending' ? '☐' : task.status === 'done' ? '☑' : task.status === 'deferred' ? '▷' : '✗' }}
          </span>
          <span class="task-text">{{ task.content }}</span>
        </div>
        <div class="task-note-title">{{ task.note_title }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .task-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--space-md);
    background-color: var(--color-bg-secondary);
    border-left: 1px solid var(--color-border);
  }

  .task-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
  }

  .task-panel-title {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .task-counter {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    background-color: var(--color-bg-tertiary);
    padding: 2px 8px;
    border-radius: 12px;
  }

  .task-filters {
    display: flex;
    gap: var(--space-xs);
    margin-bottom: var(--space-md);
  }

  .filter-button {
    flex: 1;
    padding: var(--space-xs) var(--space-sm);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    background-color: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-button:hover {
    background-color: var(--color-bg-hover);
  }

  .filter-button.active {
    color: var(--color-primary);
    background-color: var(--color-primary-bg);
    border-color: var(--color-primary);
  }

  .task-loading,
  .task-empty {
    padding: var(--space-lg);
    text-align: center;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .task-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .task-item {
    padding: var(--space-md);
    background-color: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
  }

  .task-item:hover {
    background-color: var(--color-bg-secondary);
    border-color: var(--color-primary);
  }

  .task-content {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-bottom: var(--space-xs);
  }

  .task-checkbox-indicator {
    font-size: var(--font-size-md);
    line-height: 1;
  }

  .task-checkbox-indicator[data-status='pending'] {
    color: var(--color-text-secondary);
  }

  .task-checkbox-indicator[data-status='done'] {
    color: var(--color-success);
  }

  .task-checkbox-indicator[data-status='deferred'] {
    color: var(--color-warning);
  }

  .task-checkbox-indicator[data-status='cancelled'] {
    color: var(--color-error);
  }

  .task-text {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-note-title {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    padding-left: calc(var(--font-size-md) + var(--space-xs));
  }
</style>
