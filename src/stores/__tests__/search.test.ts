/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method, @typescript-eslint/no-explicit-any */
/**
 * Search Store Tests
 * US-006: Recherche de notes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSearchStore } from '../search'

// Mock window.api
global.window = {
  api: {
    notes: {
      search: vi.fn(),
    },
  },
} as any

describe('useSearchStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const store = useSearchStore()

      expect(store.query).toBe('')
      expect(store.results).toEqual([])
      expect(store.selectedIndex).toBe(-1)
      expect(store.isSearching).toBe(false)
    })

    it('should have hasResults computed as false initially', () => {
      const store = useSearchStore()

      expect(store.hasResults).toBe(false)
    })

    it('should have selectedResult computed as undefined initially', () => {
      const store = useSearchStore()

      expect(store.selectedResult).toBeUndefined()
    })
  })

  describe('search()', () => {
    it('should update query and trigger debounced search', async () => {
      const store = useSearchStore()
      const mockResults = [
        {
          id: '1',
          title: 'Test Note',
          slug: 'test-note',
          content: 'Test content',
          preview: 'Preview text',
          rank: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]
      vi.mocked(window.api.notes.search).mockResolvedValue(mockResults)

      store.search('test query')

      expect(store.query).toBe('test query')

      // Wait for debounce (150ms)
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(window.api.notes.search).toHaveBeenCalledWith('test query')
      expect(store.results).toEqual(mockResults)
      expect(store.selectedIndex).toBe(-1)
    })

    it('should clear results when query is empty', async () => {
      const store = useSearchStore()

      store.search('')

      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(store.results).toEqual([])
      expect(window.api.notes.search).not.toHaveBeenCalled()
    })

    it('should set isSearching during search', async () => {
      const store = useSearchStore()
      vi.mocked(window.api.notes.search).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              resolve([])
            }, 50)
          )
      )

      store.search('test')

      // Wait for debounce (150ms) + mock delay (50ms) + buffer
      await new Promise((resolve) => setTimeout(resolve, 250))

      expect(store.isSearching).toBe(false)
    })
  })

  describe('selectNext()', () => {
    it('should increment selectedIndex', () => {
      const store = useSearchStore()
      store.results = [
        {
          id: '1',
          title: 'Note 1',
          slug: 'note-1',
          content: '',
          preview: '',
          rank: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          title: 'Note 2',
          slug: 'note-2',
          content: '',
          preview: '',
          rank: 2,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]
      store.selectedIndex = 0

      store.selectNext()

      expect(store.selectedIndex).toBe(1)
    })

    it('should not exceed results length', () => {
      const store = useSearchStore()
      store.results = [
        {
          id: '1',
          title: 'Note 1',
          slug: 'note-1',
          content: '',
          preview: '',
          rank: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]
      store.selectedIndex = 0

      store.selectNext()

      expect(store.selectedIndex).toBe(0)
    })
  })

  describe('selectPrevious()', () => {
    it('should decrement selectedIndex', () => {
      const store = useSearchStore()
      store.results = [
        {
          id: '1',
          title: 'Note 1',
          slug: 'note-1',
          content: '',
          preview: '',
          rank: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          title: 'Note 2',
          slug: 'note-2',
          content: '',
          preview: '',
          rank: 2,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]
      store.selectedIndex = 1

      store.selectPrevious()

      expect(store.selectedIndex).toBe(0)
    })

    it('should not go below 0', () => {
      const store = useSearchStore()
      store.results = [
        {
          id: '1',
          title: 'Note 1',
          slug: 'note-1',
          content: '',
          preview: '',
          rank: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]
      store.selectedIndex = 0

      store.selectPrevious()

      expect(store.selectedIndex).toBe(0)
    })
  })

  describe('clear()', () => {
    it('should reset all state', () => {
      const store = useSearchStore()
      store.query = 'test'
      store.results = [
        {
          id: '1',
          title: 'Note',
          slug: 'note',
          content: '',
          preview: '',
          rank: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]
      store.selectedIndex = 1

      store.clear()

      expect(store.query).toBe('')
      expect(store.results).toEqual([])
      expect(store.selectedIndex).toBe(-1)
    })
  })

  describe('Computed Properties', () => {
    it('hasResults should be true when results exist', () => {
      const store = useSearchStore()
      store.results = [
        {
          id: '1',
          title: 'Note',
          slug: 'note',
          content: '',
          preview: '',
          rank: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      expect(store.hasResults).toBe(true)
    })

    it('selectedResult should return the selected result', () => {
      const store = useSearchStore()
      const mockResult = {
        id: '1',
        title: 'Note',
        slug: 'note',
        content: '',
        preview: '',
        rank: 1,
        created_at: new Date(),
        updated_at: new Date(),
      }
      store.results = [mockResult]
      store.selectedIndex = 0

      expect(store.selectedResult).toEqual(mockResult)
    })
  })
})
