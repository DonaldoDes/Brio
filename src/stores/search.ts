/**
 * Search Store
 *
 * Manages search state and operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { Note } from '../../shared/types/note'

export interface SearchResult extends Note {
  preview?: string
  rank?: number
}

export const useSearchStore = defineStore('search', () => {
  // State
  const query = ref('')
  const results = ref<SearchResult[]>([])
  const selectedIndex = ref(-1)
  const isSearching = ref(false)

  // Computed
  const hasResults = computed(() => results.value.length > 0)
  const selectedResult = computed(() => results.value[selectedIndex.value])

  // Debounced search function
  const performSearch = async (searchQuery: string): Promise<void> => {
    console.log('[SearchStore] performSearch called with query:', searchQuery)
    if (!searchQuery.trim()) {
      console.log('[SearchStore] Empty query, clearing results')
      results.value = []
      return
    }
    isSearching.value = true
    try {
      console.log('[SearchStore] Calling window.api.notes.search...')
      const searchResults = await window.api.notes.search(searchQuery)
      console.log('[SearchStore] Received results:', searchResults.length, searchResults)
      results.value = searchResults
      selectedIndex.value = -1
      console.log('[SearchStore] Results set, results.value:', results.value)
    } finally {
      isSearching.value = false
    }
  }

  const debouncedSearch = useDebounceFn(performSearch, 150)

  // Actions
  const search = (newQuery: string): void => {
    query.value = newQuery
    void debouncedSearch(newQuery)
  }

  const selectNext = (): void => {
    if (selectedIndex.value < results.value.length - 1) {
      selectedIndex.value++
    } else if (selectedIndex.value === -1 && results.value.length > 0) {
      selectedIndex.value = 0
    }
  }

  const selectPrevious = (): void => {
    if (selectedIndex.value > 0) {
      selectedIndex.value--
    }
  }

  const clear = (): void => {
    query.value = ''
    results.value = []
    selectedIndex.value = -1
  }

  const openSelected = (): string | null => {
    if (selectedIndex.value >= 0 && selectedIndex.value < results.value.length) {
      return results.value[selectedIndex.value].id
    }
    return null
  }

  return {
    query,
    results,
    selectedIndex,
    isSearching,
    hasResults,
    selectedResult,
    search,
    selectNext,
    selectPrevious,
    clear,
    openSelected,
  }
})
