import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SortDropdown from './SortDropdown.vue'

describe('SortDropdown', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('@unit - Dropdown Display', () => {
    it('displays when open prop is true', () => {
      const wrapper = mount(SortDropdown, {
        props: { open: true }
      })
      
      expect(wrapper.find('[data-testid="sort-dropdown"]').exists()).toBe(true)
    })

    it('hides when open prop is false', () => {
      const wrapper = mount(SortDropdown, {
        props: { open: false }
      })
      
      expect(wrapper.find('[data-testid="sort-dropdown"]').exists()).toBe(false)
    })

    it('displays "SORT BY" section header', () => {
      const wrapper = mount(SortDropdown, {
        props: { open: true }
      })
      
      const header = wrapper.find('[data-testid="sort-by-header"]')
      expect(header.text()).toBe('SORT BY')
      expect(header.classes()).toContain('sort-section-label')
    })

    it('displays all sort options', () => {
      const wrapper = mount(SortDropdown, {
        props: { open: true }
      })
      
      expect(wrapper.find('[data-testid="sort-option-created"]').text()).toContain('Created date')
      expect(wrapper.find('[data-testid="sort-option-modified"]').text()).toContain('Modified date')
      expect(wrapper.find('[data-testid="sort-option-title"]').text()).toContain('Title')
    })

    it('displays "DIRECTION" section header', () => {
      const wrapper = mount(SortDropdown, {
        props: { open: true }
      })
      
      const header = wrapper.find('[data-testid="direction-header"]')
      expect(header.text()).toBe('DIRECTION')
      expect(header.classes()).toContain('sort-section-label')
    })

    it('displays direction options', () => {
      const wrapper = mount(SortDropdown, {
        props: { open: true }
      })
      
      expect(wrapper.find('[data-testid="direction-option-asc"]').text()).toContain('Ascending')
      expect(wrapper.find('[data-testid="direction-option-desc"]').text()).toContain('Descending')
    })

    it('displays divider between sections', () => {
      const wrapper = mount(SortDropdown, {
        props: { open: true }
      })
      
      const divider = wrapper.find('[data-testid="sort-divider"]')
      expect(divider.exists()).toBe(true)
      expect(divider.classes()).toContain('sort-divider')
    })
  })

  describe('@unit - Checkmark Display', () => {
    it('shows checkmark on selected sort option', () => {
      const wrapper = mount(SortDropdown, {
        props: { 
          open: true,
          sortBy: 'created'
        }
      })
      
      const createdOption = wrapper.find('[data-testid="sort-option-created"]')
      expect(createdOption.find('[data-testid="checkmark"]').exists()).toBe(true)
    })

    it('shows checkmark on selected direction', () => {
      const wrapper = mount(SortDropdown, {
        props: { 
          open: true,
          sortDirection: 'desc'
        }
      })
      
      const descOption = wrapper.find('[data-testid="direction-option-desc"]')
      expect(descOption.find('[data-testid="checkmark"]').exists()).toBe(true)
    })

    it('does not show checkmark on unselected options', () => {
      const wrapper = mount(SortDropdown, {
        props: { 
          open: true,
          sortBy: 'created'
        }
      })
      
      const modifiedOption = wrapper.find('[data-testid="sort-option-modified"]')
      expect(modifiedOption.find('[data-testid="checkmark"]').exists()).toBe(false)
    })
  })

  describe('@integration - Sort Selection', () => {
    it('emits update:sortBy when sort option clicked', async () => {
      const wrapper = mount(SortDropdown, {
        props: { 
          open: true,
          sortBy: 'created'
        }
      })
      
      await wrapper.find('[data-testid="sort-option-title"]').trigger('click')
      
      expect(wrapper.emitted('update:sortBy')).toBeTruthy()
      expect(wrapper.emitted('update:sortBy')?.[0]).toEqual(['title'])
    })

    it('emits update:sortDirection when direction clicked', async () => {
      const wrapper = mount(SortDropdown, {
        props: { 
          open: true,
          sortDirection: 'desc'
        }
      })
      
      await wrapper.find('[data-testid="direction-option-asc"]').trigger('click')
      
      expect(wrapper.emitted('update:sortDirection')).toBeTruthy()
      expect(wrapper.emitted('update:sortDirection')?.[0]).toEqual(['asc'])
    })

    it('emits close event after selection', async () => {
      const wrapper = mount(SortDropdown, {
        props: { open: true }
      })
      
      await wrapper.find('[data-testid="sort-option-title"]').trigger('click')
      
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('@integration - Outside Click', () => {
    // Skip: JSDOM doesn't properly simulate capture phase event listeners
    // This behavior is tested in E2E tests (us-101.spec.ts)
    it.skip('emits close event on outside click', async () => {
      const wrapper = mount(SortDropdown, {
        props: { open: true },
        attachTo: document.body
      })
      
      // Wait for the watch to attach the listener
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 20))
      
      // Create a div outside the dropdown
      const outsideElement = document.createElement('div')
      outsideElement.id = 'outside-element'
      document.body.appendChild(outsideElement)
      
      // Simulate click on the outside element with capture phase
      const clickEvent = new MouseEvent('click', { 
        bubbles: true,
        cancelable: true,
        composed: true
      })
      
      Object.defineProperty(clickEvent, 'target', {
        value: outsideElement,
        enumerable: true
      })
      
      outsideElement.dispatchEvent(clickEvent)
      await wrapper.vm.$nextTick()
      
      expect(wrapper.emitted('close')).toBeTruthy()
      
      // Cleanup
      document.body.removeChild(outsideElement)
      wrapper.unmount()
    })
  })

  describe('@unit - Sort State Persistence', () => {
    it('persists sort state to localStorage', async () => {
      // Clear localStorage before test
      localStorage.clear()
      
      const wrapper = mount(SortDropdown, {
        props: { open: true, sortBy: 'created' }
      })
      
      const button = wrapper.find('[data-testid="sort-option-title"]')
      expect(button.exists()).toBe(true)
      
      await button.trigger('click')
      await wrapper.vm.$nextTick()
      
      // Check that the event was emitted
      expect(wrapper.emitted('update:sortBy')).toBeTruthy()
      expect(wrapper.emitted('update:sortBy')![0]).toEqual(['title'])
      
      const stored = localStorage.getItem('brio-sort-preferences')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.sortBy).toBe('title')
    })
  })
})
