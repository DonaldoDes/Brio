import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NotesFilterBar from './NotesFilterBar.vue'

describe('NotesFilterBar - Visual Improvements', () => {
  describe('Filter Chips Styling', () => {
    it('should render chips with filter-chip class', () => {
      const wrapper = mount(NotesFilterBar, {
        props: {
          open: true,
          chips: ['tag:projet']
        }
      })

      const chip = wrapper.find('[data-testid="chip-0"]')
      expect(chip.exists()).toBe(true)
      expect(chip.classes()).toContain('filter-chip')
    })

    it('should render chips with correct structure classes', () => {
      const wrapper = mount(NotesFilterBar, {
        props: {
          open: true,
          chips: ['tag:brio']
        }
      })

      const chip = wrapper.find('[data-testid="chip-0"]')
      expect(chip.classes()).toContain('inline-flex')
      expect(chip.classes()).toContain('items-center')
      expect(chip.classes()).toContain('gap-1')
    })

    it('should have gap of 6px between chips', () => {
      const wrapper = mount(NotesFilterBar, {
        props: {
          open: true,
          chips: ['tag:projet', 'tag:brio']
        }
      })

      const filterBar = wrapper.find('[data-testid="filter-bar"]')
      const style = filterBar.attributes('style')
      expect(style).toContain('gap: 6px')
    })

    it('should render multiple chips correctly', () => {
      const wrapper = mount(NotesFilterBar, {
        props: {
          open: true,
          chips: ['tag:projet', 'tag:brio', 'tag:test']
        }
      })

      const chips = wrapper.findAll('.filter-chip')
      expect(chips).toHaveLength(3)
      chips.forEach(chip => {
        expect(chip.classes()).toContain('filter-chip')
      })
    })

    it('should show remove button with × symbol', () => {
      const wrapper = mount(NotesFilterBar, {
        props: {
          open: true,
          chips: ['tag:test']
        }
      })

      const removeButton = wrapper.find('[data-testid="chip-remove-0"]')
      expect(removeButton.exists()).toBe(true)
      expect(removeButton.text()).toBe('×')
    })

    it('should apply chip-remove-btn class to remove button', () => {
      const wrapper = mount(NotesFilterBar, {
        props: {
          open: true,
          chips: ['tag:test']
        }
      })

      const removeButton = wrapper.find('[data-testid="chip-remove-0"]')
      expect(removeButton.classes()).toContain('chip-remove-btn')
      expect(removeButton.classes()).toContain('transition-colors')
    })
  })

  describe('Dark Mode Chip Styling', () => {
    it('should use filter-chip class in dark mode', () => {
      document.documentElement.setAttribute('data-theme', 'dark')
      
      const wrapper = mount(NotesFilterBar, {
        props: {
          open: true,
          chips: ['tag:projet']
        }
      })

      const chip = wrapper.find('[data-testid="chip-0"]')
      expect(chip.classes()).toContain('filter-chip')
      
      document.documentElement.removeAttribute('data-theme')
    })

    it('should maintain structure in dark mode', () => {
      document.documentElement.setAttribute('data-theme', 'dark')
      
      const wrapper = mount(NotesFilterBar, {
        props: {
          open: true,
          chips: ['tag:brio']
        }
      })

      const chip = wrapper.find('[data-testid="chip-0"]')
      expect(chip.classes()).toContain('filter-chip')
      expect(chip.classes()).toContain('inline-flex')
      
      document.documentElement.removeAttribute('data-theme')
    })
  })

  describe('Clear All Functionality', () => {
    it('should show "Clear all" button when multiple chips are active', () => {
      const wrapper = mount(NotesFilterBar, {
        props: {
          open: true,
          chips: ['tag:projet', 'tag:brio']
        }
      })

      const clearAllButton = wrapper.find('[data-testid="clear-all-button"]')
      expect(clearAllButton.exists()).toBe(true)
      expect(clearAllButton.text()).toBe('Clear all')
    })

    it('should not show "Clear all" button when only one chip is active', () => {
      const wrapper = mount(NotesFilterBar, {
        props: {
          open: true,
          chips: ['tag:projet']
        }
      })

      const clearAllButton = wrapper.find('[data-testid="clear-all-button"]')
      expect(clearAllButton.exists()).toBe(false)
    })

    it('should emit clear-all event when "Clear all" is clicked', async () => {
      const wrapper = mount(NotesFilterBar, {
        props: {
          open: true,
          chips: ['tag:projet', 'tag:brio']
        }
      })

      const clearAllButton = wrapper.find('[data-testid="clear-all-button"]')
      await clearAllButton.trigger('click')

      expect(wrapper.emitted('clear-all')).toBeTruthy()
    })
  })
})
