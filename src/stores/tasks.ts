import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TaskWithNote, TaskStatus } from '../../shared/types/task'

/**
 * Tasks Store
 * Manages task state and filtering
 */
export const useTasksStore = defineStore('tasks', () => {
  // State
  const tasks = ref<TaskWithNote[]>([])
  const filter = ref<TaskStatus | 'all'>('all')
  const isLoading = ref(false)

  // Getters
  const filteredTasks = computed(() => {
    if (filter.value === 'all') {
      return tasks.value
    }
    return tasks.value.filter((task) => task.status === filter.value)
  })

  const pendingCount = computed(() => {
    return tasks.value.filter((task) => task.status === 'pending').length
  })

  const totalCount = computed(() => {
    return tasks.value.length
  })

  // Actions
  async function loadTasks(): Promise<void> {
    isLoading.value = true
    try {
      tasks.value = await window.api.tasks.getAll()
    } catch (error) {
      console.error('[TasksStore] Failed to load tasks:', error)
      tasks.value = []
    } finally {
      isLoading.value = false
    }
  }

  function setFilter(status: TaskStatus | 'all'): void {
    filter.value = status
  }

  return {
    // State
    tasks,
    filter,
    isLoading,
    // Getters
    filteredTasks,
    pendingCount,
    totalCount,
    // Actions
    loadTasks,
    setFilter,
  }
})
