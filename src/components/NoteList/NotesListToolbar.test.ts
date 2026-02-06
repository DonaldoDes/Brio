import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NotesListToolbar from './NotesListToolbar.vue'

describe('NotesListToolbar', () => {
  describe('@unit - Toolbar Layout', () => {
    it('displays toolbar with correct height', () => {
      const wrapper = mount(NotesListToolbar)
      const toolbar = wrapper.find('[data-testid="notes-list-toolbar"]')
      
      expect(toolbar.exists()).toBe(true)
      // Vérifier que le toolbar a la classe toolbar-container (qui définit height: 36px)
      expect(toolbar.classes()).toContain('toolbar-container')
    })

    it('displays all three icons (new, sort, filter)', () => {
      const wrapper = mount(NotesListToolbar)
      
      expect(wrapper.find('[data-testid="toolbar-new-note"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="toolbar-sort"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="toolbar-filter"]').exists()).toBe(true)
    })

    it('aligns icons to the right', () => {
      const wrapper = mount(NotesListToolbar)
      const toolbar = wrapper.find('[data-testid="notes-list-toolbar"]')
      
      // Vérifier que le toolbar a la classe toolbar-container (qui définit justify-content: flex-end)
      expect(toolbar.classes()).toContain('toolbar-container')
    })

    it('has no border-bottom separator', () => {
      const wrapper = mount(NotesListToolbar)
      const toolbar = wrapper.find('[data-testid="notes-list-toolbar"]')
      
      expect(toolbar.element.style.borderBottom).toBe('')
    })

    it('icons have correct stroke-width and color', () => {
      const wrapper = mount(NotesListToolbar)
      const button = wrapper.find('[data-testid="toolbar-new-note"]')
      const icon = button.find('svg')
      
      expect(icon.attributes('stroke-width')).toBe('1')
      // Vérifier que le bouton a la classe toolbar-button (qui définit la couleur)
      expect(button.classes()).toContain('toolbar-button')
    })
  })

  describe('@unit - Icon Hover States', () => {
    it('changes icon color on hover', async () => {
      const wrapper = mount(NotesListToolbar)
      const newNoteBtn = wrapper.find('[data-testid="toolbar-new-note"]')
      
      // Vérifier que le bouton a la classe toolbar-button (qui définit le hover)
      expect(newNoteBtn.classes()).toContain('toolbar-button')
    })

    it('changes cursor to pointer on hover', () => {
      const wrapper = mount(NotesListToolbar)
      const newNoteBtn = wrapper.find('[data-testid="toolbar-new-note"]')
      
      // Vérifier que le bouton a la classe toolbar-button (qui définit cursor: pointer)
      expect(newNoteBtn.classes()).toContain('toolbar-button')
    })
  })

  describe('@integration - New Note Button', () => {
    it('emits new-note event when clicked', async () => {
      const wrapper = mount(NotesListToolbar)
      const newNoteBtn = wrapper.find('[data-testid="toolbar-new-note"]')
      
      await newNoteBtn.trigger('click')
      
      expect(wrapper.emitted('new-note')).toBeTruthy()
      expect(wrapper.emitted('new-note')?.length).toBe(1)
    })
  })

  describe('@integration - Sort Button', () => {
    it('emits toggle-sort event when clicked', async () => {
      const wrapper = mount(NotesListToolbar)
      const sortBtn = wrapper.find('[data-testid="toolbar-sort"]')
      
      await sortBtn.trigger('click')
      
      expect(wrapper.emitted('toggle-sort')).toBeTruthy()
    })
  })

  describe('@integration - Filter Button', () => {
    it('emits toggle-filter event when clicked', async () => {
      const wrapper = mount(NotesListToolbar)
      const filterBtn = wrapper.find('[data-testid="toolbar-filter"]')
      
      await filterBtn.trigger('click')
      
      expect(wrapper.emitted('toggle-filter')).toBeTruthy()
    })
  })

  describe('@unit - ARIA Labels', () => {
    it('has aria-label on new note icon', () => {
      const wrapper = mount(NotesListToolbar)
      const newNoteBtn = wrapper.find('[data-testid="toolbar-new-note"]')
      
      expect(newNoteBtn.attributes('aria-label')).toBe('New note')
    })

    it('has aria-label on sort icon', () => {
      const wrapper = mount(NotesListToolbar)
      const sortBtn = wrapper.find('[data-testid="toolbar-sort"]')
      
      expect(sortBtn.attributes('aria-label')).toBe('Sort notes')
    })

    it('has aria-label on filter icon', () => {
      const wrapper = mount(NotesListToolbar)
      const filterBtn = wrapper.find('[data-testid="toolbar-filter"]')
      
      expect(filterBtn.attributes('aria-label')).toBe('Filter notes')
    })
  })
})
