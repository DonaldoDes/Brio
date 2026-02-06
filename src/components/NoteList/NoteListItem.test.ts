import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NoteListItem from './NoteListItem.vue'
import type { Note } from '../../../shared/types/note'

describe('NoteListItem', () => {
  beforeEach(() => {
    // Mock current time to 2024-01-15 12:00:00
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  it('should display relative date for recent notes', () => {
    const note: Note = {
      id: '1',
      title: 'Test Note',
      slug: 'test-note',
      content: 'Test content',
      type: 'note',
      created_at: new Date('2024-01-15T11:30:00Z'),
      updated_at: new Date('2024-01-15T11:30:00Z'), // 30 minutes ago
      deleted_at: null
    }

    const wrapper = mount(NoteListItem, {
      props: {
        note,
        selected: false
      }
    })

    const dateElement = wrapper.find('[data-testid="note-date"]')
    expect(dateElement.exists()).toBe(true)
    expect(dateElement.text()).toBe('30m ago')
  })

  it('should display day of week for notes from this week', () => {
    const note: Note = {
      id: '2',
      title: 'Test Note',
      slug: 'test-note',
      content: 'Test content',
      type: 'note',
      created_at: new Date('2024-01-14T12:00:00Z'),
      updated_at: new Date('2024-01-14T12:00:00Z'), // Yesterday (Sunday)
      deleted_at: null
    }

    const wrapper = mount(NoteListItem, {
      props: {
        note,
        selected: false
      }
    })

    const dateElement = wrapper.find('[data-testid="note-date"]')
    expect(dateElement.exists()).toBe(true)
    expect(dateElement.text()).toBe('Sunday')
  })

  it('should display short date for older notes', () => {
    const note: Note = {
      id: '3',
      title: 'Test Note',
      slug: 'test-note',
      content: 'Test content',
      type: 'note',
      created_at: new Date('2024-01-01T12:00:00Z'),
      updated_at: new Date('2024-01-01T12:00:00Z'), // Jan 1
      deleted_at: null
    }

    const wrapper = mount(NoteListItem, {
      props: {
        note,
        selected: false
      }
    })

    const dateElement = wrapper.find('[data-testid="note-date"]')
    expect(dateElement.exists()).toBe(true)
    expect(dateElement.text()).toBe('Jan 1')
  })

  it('should display date even when preview is empty', () => {
    const note: Note = {
      id: '4',
      title: 'Test Note',
      slug: 'test-note',
      content: null,
      type: 'note',
      created_at: new Date('2024-01-15T11:00:00Z'),
      updated_at: new Date('2024-01-15T11:00:00Z'), // 1 hour ago
      deleted_at: null
    }

    const wrapper = mount(NoteListItem, {
      props: {
        note,
        selected: false
      }
    })

    const dateElement = wrapper.find('[data-testid="note-date"]')
    expect(dateElement.exists()).toBe(true)
    expect(dateElement.text()).toBe('1h ago')
  })

  describe('@unit - Bear Redesign - Display', () => {
    it('displays title with correct Bear styling', () => {
      const note: Note = {
        id: '5',
        title: 'Meeting Notes',
        slug: 'meeting-notes',
        content: 'Discussed project timeline',
        type: 'note',
        created_at: new Date('2024-01-15T11:00:00Z'),
        updated_at: new Date('2024-01-15T11:00:00Z'),
        deleted_at: null
      }

      const wrapper = mount(NoteListItem, {
        props: { note, selected: false }
      })

      const title = wrapper.find('.note-title')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('Meeting Notes')
    })

    it('displays preview with 2 lines max', () => {
      const note: Note = {
        id: '6',
        title: 'Long Note',
        slug: 'long-note',
        content: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
        type: 'note',
        created_at: new Date('2024-01-15T11:00:00Z'),
        updated_at: new Date('2024-01-15T11:00:00Z'),
        deleted_at: null
      }

      const wrapper = mount(NoteListItem, {
        props: { note, selected: false }
      })

      const preview = wrapper.find('.note-preview')
      expect(preview.exists()).toBe(true)
    })

    it('displays "(No content)" when note has no content', () => {
      const note: Note = {
        id: '7',
        title: 'Empty Note',
        slug: 'empty-note',
        content: '',
        type: 'note',
        created_at: new Date('2024-01-15T11:00:00Z'),
        updated_at: new Date('2024-01-15T11:00:00Z'),
        deleted_at: null
      }

      const wrapper = mount(NoteListItem, {
        props: { note, selected: false }
      })

      const preview = wrapper.find('.note-preview')
      expect(preview.exists()).toBe(true)
    })
  })

  describe('@integration - Bear Redesign - Selection', () => {
    it('applies accent background when selected', () => {
      const note: Note = {
        id: '8',
        title: 'Selected Note',
        slug: 'selected-note',
        content: 'Content',
        type: 'note',
        created_at: new Date('2024-01-15T11:00:00Z'),
        updated_at: new Date('2024-01-15T11:00:00Z'),
        deleted_at: null
      }

      const wrapper = mount(NoteListItem, {
        props: { note, selected: true }
      })

      const item = wrapper.find('.note-item')
      expect(item.classes()).toContain('selected')
    })

    it('emits click event when clicked', async () => {
      const note: Note = {
        id: '9',
        title: 'Clickable Note',
        slug: 'clickable-note',
        content: 'Content',
        type: 'note',
        created_at: new Date('2024-01-15T11:00:00Z'),
        updated_at: new Date('2024-01-15T11:00:00Z'),
        deleted_at: null
      }

      const wrapper = mount(NoteListItem, {
        props: { note, selected: false }
      })

      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeTruthy()
    })
  })

  describe('@unit - Bear Redesign - Edge Cases', () => {
    it('truncates very long title', () => {
      const note: Note = {
        id: '10',
        title: 'This is an extremely long title that should be truncated because it exceeds the maximum width',
        slug: 'long-title',
        content: 'Content',
        type: 'note',
        created_at: new Date('2024-01-15T11:00:00Z'),
        updated_at: new Date('2024-01-15T11:00:00Z'),
        deleted_at: null
      }

      const wrapper = mount(NoteListItem, {
        props: { note, selected: false }
      })

      const title = wrapper.find('.note-title')
      expect(title.exists()).toBe(true)
    })
  })
})
