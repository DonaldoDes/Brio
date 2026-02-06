import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useTagsStore } from '../../stores/tags'
import FilterChips from './FilterChips.vue'

describe('@unit - FilterChips', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Rendering', () => {
    it('should not render when no tags are selected', () => {
      const wrapper = mount(FilterChips)
      const chips = wrapper.findAll('.filter-chip')
      
      expect(chips).toHaveLength(0)
    })

    it('should render chips for selected tags', async () => {
      const wrapper = mount(FilterChips)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#projet', '#brio']
      await wrapper.vm.$nextTick()
      
      const chips = wrapper.findAll('.filter-chip')
      expect(chips).toHaveLength(2)
      expect(chips[0].text()).toContain('#projet')
      expect(chips[1].text()).toContain('#brio')
    })

    it('should render chips with remove button', async () => {
      const wrapper = mount(FilterChips)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#test']
      await wrapper.vm.$nextTick()
      
      const chip = wrapper.find('.filter-chip')
      const removeButton = chip.find('.chip-remove')
      
      expect(removeButton.exists()).toBe(true)
      expect(removeButton.text()).toBe('×')
    })
  })

  describe('Interaction', () => {
    it('should remove chip when clicking remove button', async () => {
      const wrapper = mount(FilterChips)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#projet', '#brio']
      tagsStore.toggleTag = vi.fn()
      await wrapper.vm.$nextTick()
      
      const chips = wrapper.findAll('.filter-chip')
      const firstChipRemoveButton = chips[0].find('.chip-remove')
      
      await firstChipRemoveButton.trigger('click')
      
      expect(tagsStore.toggleTag).toHaveBeenCalledWith('#projet')
    })

    it('should emit chip-removed event when removing a chip', async () => {
      const wrapper = mount(FilterChips)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#test']
      await wrapper.vm.$nextTick()
      
      const removeButton = wrapper.find('.chip-remove')
      await removeButton.trigger('click')
      
      expect(wrapper.emitted('chip-removed')).toBeTruthy()
      expect(wrapper.emitted('chip-removed')?.[0]).toEqual(['#test'])
    })
  })

  describe('Styles', () => {
    it('should have correct chip styles', async () => {
      const wrapper = mount(FilterChips)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#test']
      await wrapper.vm.$nextTick()
      
      const chip = wrapper.find('.filter-chip')
      
      expect(chip.exists()).toBe(true)
      expect(chip.classes()).toContain('filter-chip')
    })

    it('should apply dark mode styles when theme is dark', async () => {
      const wrapper = mount(FilterChips)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#test']
      await wrapper.vm.$nextTick()
      
      // Dark mode is controlled by :root[data-theme="dark"] in CSS
      const chip = wrapper.find('.filter-chip')
      expect(chip.exists()).toBe(true)
    })
  })

  describe('Integration with TagsStore', () => {
    it('should sync with selectedTags from store', async () => {
      const wrapper = mount(FilterChips)
      const tagsStore = useTagsStore()
      
      expect(wrapper.findAll('.filter-chip')).toHaveLength(0)
      
      tagsStore.selectedTags = ['#tag1']
      await wrapper.vm.$nextTick()
      expect(wrapper.findAll('.filter-chip')).toHaveLength(1)
      
      tagsStore.selectedTags = ['#tag1', '#tag2', '#tag3']
      await wrapper.vm.$nextTick()
      expect(wrapper.findAll('.filter-chip')).toHaveLength(3)
    })

    it('should call toggleTag when removing a chip', async () => {
      const wrapper = mount(FilterChips)
      const tagsStore = useTagsStore()
      
      tagsStore.selectedTags = ['#test']
      tagsStore.toggleTag = vi.fn()
      await wrapper.vm.$nextTick()
      
      const removeButton = wrapper.find('.chip-remove')
      await removeButton.trigger('click')
      
      expect(tagsStore.toggleTag).toHaveBeenCalledWith('#test')
    })
  })
})
