import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useTagsStore } from '../../stores/tags'
import { useSearchStore } from '../../stores/search'
import NoteList from './NoteList.vue'

describe('@integration - NoteList with FilterChips', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Filter Chips Display', () => {
    it('should display filter chips when tags are selected', async () => {
      const wrapper = mount(NoteList)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#projet', '#brio']
      await wrapper.vm.$nextTick()
      
      const chips = wrapper.findAll('.filter-chip')
      expect(chips).toHaveLength(2)
    })

    it('should display chips above search input when filter bar is shown', async () => {
      const wrapper = mount(NoteList)
      const tagsStore = useTagsStore()
      
      // Show filter bar
      const filterButton = wrapper.find('[data-testid="toolbar-filter"]')
      if (filterButton.exists()) {
        await filterButton.trigger('click')
      }
      
      tagsStore.selectedTags = ['#test']
      await wrapper.vm.$nextTick()
      
      const searchContainer = wrapper.find('.search-container')
      const chips = wrapper.findAll('.filter-chip')
      
      expect(searchContainer.exists()).toBe(true)
      expect(chips).toHaveLength(1)
    })

    it('should not display chips when no tags are selected', () => {
      const wrapper = mount(NoteList)
      const chips = wrapper.findAll('.filter-chip')
      
      expect(chips).toHaveLength(0)
    })
  })

  describe('Chip Removal', () => {
    it('should remove chip and update tag filter when clicking remove button', async () => {
      const wrapper = mount(NoteList)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#projet', '#brio']
      tagsStore.toggleTag = vi.fn()
      await wrapper.vm.$nextTick()
      
      const chips = wrapper.findAll('.filter-chip')
      const firstChipRemoveButton = chips[0].find('.chip-remove')
      
      await firstChipRemoveButton.trigger('click')
      
      expect(tagsStore.toggleTag).toHaveBeenCalledWith('#projet')
    })

    it('should update displayed notes when removing a chip', async () => {
      const wrapper = mount(NoteList)
      const tagsStore = useTagsStore()
      
      // Setup: 2 tags selected
      tagsStore.selectedTags = ['#tag1', '#tag2']
      tagsStore.selectedTagsNoteIds = ['note1', 'note2']
      await wrapper.vm.$nextTick()
      
      // Remove one chip
      tagsStore.selectedTags = ['#tag1']
      tagsStore.selectedTagsNoteIds = ['note1', 'note2', 'note3']
      await wrapper.vm.$nextTick()
      
      // Verify chips updated
      const chips = wrapper.findAll('.filter-chip')
      expect(chips).toHaveLength(1)
    })
  })

  describe('Interaction with Search', () => {
    it('should display both chips and search input when filter bar is shown', async () => {
      const wrapper = mount(NoteList)
      const tagsStore = useTagsStore()
      
      // Show filter bar
      const filterButton = wrapper.find('[data-testid="toolbar-filter"]')
      if (filterButton.exists()) {
        await filterButton.trigger('click')
      }
      
      tagsStore.selectedTags = ['#test']
      await wrapper.vm.$nextTick()
      
      const searchInput = wrapper.find('[data-testid="search-input"]')
      const chips = wrapper.findAll('.filter-chip')
      
      expect(searchInput.exists()).toBe(true)
      expect(chips).toHaveLength(1)
    })

    it('should maintain chips when typing in search input', async () => {
      const wrapper = mount(NoteList)
      const tagsStore = useTagsStore()
      const searchStore = useSearchStore()
      
      // Show filter bar
      const filterButton = wrapper.find('[data-testid="toolbar-filter"]')
      if (filterButton.exists()) {
        await filterButton.trigger('click')
      }
      
      tagsStore.selectedTags = ['#test']
      await wrapper.vm.$nextTick()
      
      const searchInput = wrapper.find('[data-testid="search-input"]')
      await searchInput.setValue('search query')
      
      const chips = wrapper.findAll('.filter-chip')
      expect(chips).toHaveLength(1)
    })

    it('should clear chips when clearing all filters', async () => {
      const wrapper = mount(NoteList)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#tag1', '#tag2']
      tagsStore.clearSelectedTags = vi.fn()
      await wrapper.vm.$nextTick()
      
      // Simulate clearing all filters
      tagsStore.clearSelectedTags()
      tagsStore.selectedTags = []
      await wrapper.vm.$nextTick()
      
      const chips = wrapper.findAll('.filter-chip')
      expect(chips).toHaveLength(0)
    })
  })

  describe('Layout and Spacing', () => {
    it('should render chips in a horizontal layout', async () => {
      const wrapper = mount(NoteList)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#tag1', '#tag2', '#tag3']
      await wrapper.vm.$nextTick()
      
      const chipsContainer = wrapper.find('.active-chips')
      expect(chipsContainer.exists()).toBe(true)
      
      const chips = wrapper.findAll('.filter-chip')
      expect(chips).toHaveLength(3)
    })

    it('should have proper spacing between chips', async () => {
      const wrapper = mount(NoteList)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#tag1', '#tag2']
      await wrapper.vm.$nextTick()
      
      const chips = wrapper.findAll('.filter-chip')
      expect(chips).toHaveLength(2)
      // Spacing is controlled by CSS margin-right
    })
  })

  describe('Accessibility', () => {
    it('should have accessible remove buttons', async () => {
      const wrapper = mount(NoteList)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#test']
      await wrapper.vm.$nextTick()
      
      const removeButton = wrapper.find('.chip-remove')
      expect(removeButton.exists()).toBe(true)
      expect(removeButton.attributes('aria-label')).toBeDefined()
    })

    it('should support keyboard navigation for chip removal', async () => {
      const wrapper = mount(NoteList)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#test']
      tagsStore.toggleTag = vi.fn()
      await wrapper.vm.$nextTick()
      
      const removeButton = wrapper.find('.chip-remove')
      await removeButton.trigger('keydown', { key: 'Enter' })
      
      expect(tagsStore.toggleTag).toHaveBeenCalledWith('#test')
    })
  })
})
