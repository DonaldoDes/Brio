import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BearSidebar from '../BearSidebar.vue'
import { useNotesStore } from '../../../stores/notes'
import { useTagsStore } from '../../../stores/tags'

// Mock useTheme composable
const mockToggle = vi.fn()
vi.mock('../../../composables/useTheme', () => ({
  useTheme: () => ({
    theme: { value: 'light' },
    isDark: { value: false },
    toggle: mockToggle,
    toggleTheme: mockToggle,
  })
}))

describe('BearSidebar - Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockToggle.mockClear()
    // Reset mocks
    vi.clearAllMocks()
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  describe('Theme Toggle', () => {
    it('appelle toggle au click', async () => {
      const wrapper = mount(BearSidebar)
      const themeToggle = wrapper.find('[data-testid="theme-toggle"]')
      
      // Vérifier light mode initial
      expect(wrapper.find('[data-testid="icon-moon"]').exists()).toBe(true)
      
      // Click toggle
      await themeToggle.trigger('click')
      
      // Vérifier que toggle a été appelé
      expect(mockToggle).toHaveBeenCalledTimes(1)
    })

    it('affiche l\'icône correcte selon isDark prop', async () => {
      const wrapper = mount(BearSidebar, {
        props: { isDark: true }
      })
      
      // Vérifier dark mode initial
      expect(wrapper.find('[data-testid="icon-sun"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="icon-moon"]').exists()).toBe(false)
    })
  })

  describe('Settings Modal', () => {
    it('ouvre le modal Settings au click', async () => {
      const wrapper = mount(BearSidebar)
      const settingsButton = wrapper.find('[data-testid="settings-button"]')
      
      await settingsButton.trigger('click')
      
      expect(wrapper.emitted('open-settings')).toBeTruthy()
    })
  })

  describe('Counts Dynamic Update', () => {
    it('counts se mettent à jour dynamiquement', async () => {
      const notesStore = useNotesStore()
      notesStore.notes = Array(42).fill(null).map((_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        slug: `note-${i}`,
        content: '',
        type: 'note' as const,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      }))

      const wrapper = mount(BearSidebar)
      const todayCount = wrapper.find('[data-testid="today-count-nested"]')
      expect(todayCount.text()).toBe('42')

      // Créer une nouvelle note
      notesStore.notes.push({
        id: 'note-43',
        title: 'Note 43',
        slug: 'note-43',
        content: '',
        type: 'note' as const,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      })

      await wrapper.vm.$nextTick()
      expect(todayCount.text()).toBe('43')
    })
  })

  describe('Collapse/Expand Notes Section', () => {
    it('collapse Notes masque les nested items', async () => {
      const wrapper = mount(BearSidebar)
      const chevron = wrapper.find('[data-testid="chevron-notes"]')
      
      // Vérifier expanded initial (notesExpanded = true par défaut)
      expect(wrapper.find('[data-testid="nested-items"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="nav-item-today-nested"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="nav-item-untagged"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="nav-item-archive-nested"]').exists()).toBe(true)
      expect(chevron.classes()).toContain('expanded')
      
      // Click chevron pour collapse
      await chevron.trigger('click')
      
      // Vérifier collapsed (v-if supprime les éléments du DOM)
      expect(wrapper.find('[data-testid="nested-items"]').exists()).toBe(false)
      
      // Vérifier que chevron n'a plus la classe expanded
      expect(chevron.classes()).not.toContain('expanded')
    })

    it('expand Notes affiche les nested items', async () => {
      const wrapper = mount(BearSidebar)
      const chevron = wrapper.find('[data-testid="chevron-notes"]')
      
      // État initial: expanded (notesExpanded = true par défaut)
      expect(wrapper.find('[data-testid="nested-items"]').exists()).toBe(true)
      expect(chevron.classes()).toContain('expanded')
      
      // Collapse d'abord
      await chevron.trigger('click')
      expect(wrapper.find('[data-testid="nested-items"]').exists()).toBe(false)
      expect(chevron.classes()).not.toContain('expanded')
      
      // Expand à nouveau
      await chevron.trigger('click')
      
      // Vérifier expanded
      expect(wrapper.find('[data-testid="nested-items"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="nav-item-today-nested"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="nav-item-untagged"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="nav-item-archive-nested"]').exists()).toBe(true)
      
      // Vérifier que chevron a la classe expanded
      expect(chevron.classes()).toContain('expanded')
    })

    it('persiste l\'état dans localStorage', async () => {
      const wrapper = mount(BearSidebar)
      const chevron = wrapper.find('[data-testid="chevron-notes"]')
      
      // Collapse
      await chevron.trigger('click')
      
      // Vérifier localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith('brio-sidebar-notes-collapsed', 'true')
    })
  })

  describe('Nested Items Navigation', () => {
    it('click sur nested item navigue vers la section', async () => {
      const wrapper = mount(BearSidebar)
      const untaggedItem = wrapper.find('[data-testid="nav-item-untagged"]')
      
      await untaggedItem.trigger('click')
      
      expect(wrapper.emitted('navigate')).toBeTruthy()
      expect(wrapper.emitted('navigate')?.[0]).toEqual(['untagged'])
    })

    it('nested item actif a la classe active', async () => {
      const wrapper = mount(BearSidebar, {
        props: { activeSection: 'untagged' }
      })
      const untaggedItem = wrapper.find('[data-testid="nav-item-untagged"]')
      expect(untaggedItem.classes()).toContain('active')
    })
  })

  describe('Tags Collapse/Expand', () => {
    it('affiche les tags du store', async () => {
      const tagsStore = useTagsStore()
      tagsStore.tags = [
        { tag: 'project', count: 12 },
        { tag: 'brio', count: 8 }
      ]

      const wrapper = mount(BearSidebar)
      
      // Vérifier que les tags sont affichés
      expect(wrapper.find('[data-testid="tag-item-project"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="tag-item-brio"]').exists()).toBe(true)
    })

    it('affiche les counts corrects', async () => {
      const tagsStore = useTagsStore()
      tagsStore.tags = [
        { tag: 'project', count: 12 }
      ]

      const wrapper = mount(BearSidebar)
      const projectCount = wrapper.find('[data-testid="tag-count-project"]')
      expect(projectCount.text()).toBe('12')
    })
  })

  describe('Tag Click Filter', () => {
    it('click sur tag filtre les notes', async () => {
      const tagsStore = useTagsStore()
      tagsStore.tags = [{ tag: 'brio', count: 8 }]

      const wrapper = mount(BearSidebar)
      const brioTag = wrapper.find('[data-testid="tag-item-brio"]')
      
      await brioTag.trigger('click')
      
      expect(wrapper.emitted('filter-by-tag')).toBeTruthy()
      expect(wrapper.emitted('filter-by-tag')?.[0]).toEqual(['brio'])
    })

    it('tag actif a la classe active', async () => {
      const tagsStore = useTagsStore()
      tagsStore.tags = [{ tag: 'brio', count: 8 }]

      const wrapper = mount(BearSidebar, {
        props: { activeTag: 'brio' }
      })
      const brioTag = wrapper.find('[data-testid="tag-item-brio"]')
      expect(brioTag.classes()).toContain('active')
    })
  })

  describe('Hover States', () => {
    it('navigation items sont cliquables', async () => {
      const wrapper = mount(BearSidebar)
      const todayItem = wrapper.find('[data-testid="nav-item-today-nested"]')
      
      await todayItem.trigger('mouseenter')
      
      // Vérifier que l'élément a la classe nav-item (qui a cursor: pointer)
      expect(todayItem.classes()).toContain('nav-item')
    })

    it('nested items sont cliquables', async () => {
      const wrapper = mount(BearSidebar)
      const untaggedItem = wrapper.find('[data-testid="nav-item-untagged"]')
      
      await untaggedItem.trigger('mouseenter')
      
      expect(untaggedItem.classes()).toContain('nav-item')
    })

    it('tags sont cliquables', async () => {
      const tagsStore = useTagsStore()
      tagsStore.tags = [{ tag: 'brio', count: 8 }]

      const wrapper = mount(BearSidebar)
      const brioTag = wrapper.find('[data-testid="tag-item-brio"]')
      
      await brioTag.trigger('mouseenter')
      
      expect(brioTag.classes()).toContain('tag-item')
    })
  })

  describe('Active State Navigation', () => {
    it('active state se déplace lors de navigation', async () => {
      const wrapper = mount(BearSidebar, {
        props: { activeSection: 'today' }
      })
      
      // Vérifier Today actif
      const todayItem = wrapper.find('[data-testid="nav-item-today-nested"]')
      expect(todayItem.classes()).toContain('active')
      
      // Click Archive
      const archiveItem = wrapper.find('[data-testid="nav-item-archive-nested"]')
      await archiveItem.trigger('click')
      
      // Vérifier que l'événement navigate a été émis
      expect(wrapper.emitted('navigate')).toBeTruthy()
      expect(wrapper.emitted('navigate')?.[0]).toEqual(['archive'])
    })
  })

  describe('Dark Mode Hover/Active', () => {
    it('dark mode applique la classe dark-mode', async () => {
      const wrapper = mount(BearSidebar, {
        props: { isDark: true }
      })
      const sidebar = wrapper.find('[data-testid="bear-sidebar"]')
      
      expect(sidebar.classes()).toContain('dark-mode')
    })

    it('dark mode active state a la classe active', async () => {
      const wrapper = mount(BearSidebar, {
        props: { isDark: true, activeSection: 'today' }
      })
      const todayItem = wrapper.find('[data-testid="nav-item-today-nested"]')
      expect(todayItem.classes()).toContain('active')
    })
  })

  describe('Keyboard Navigation', () => {
    it('items ont tabindex pour navigation clavier', async () => {
      const wrapper = mount(BearSidebar)
      const todayItem = wrapper.find('[data-testid="nav-item-today-nested"]')
      
      expect(todayItem.attributes('tabindex')).toBe('0')
    })

    it('Enter toggle collapse quand focus sur Notes', async () => {
      const wrapper = mount(BearSidebar)
      const notesItem = wrapper.find('[data-testid="nav-item-notes"]')
      
      // Vérifier expanded initial (notesExpanded = true par défaut)
      expect(wrapper.find('[data-testid="nested-items"]').exists()).toBe(true)
      
      // Simuler Enter pour collapse
      await notesItem.trigger('keydown.enter')
      
      // Vérifier collapsed
      expect(wrapper.find('[data-testid="nested-items"]').exists()).toBe(false)
      
      // Simuler Enter à nouveau pour expand
      await notesItem.trigger('keydown.enter')
      
      // Vérifier expanded
      expect(wrapper.find('[data-testid="nested-items"]').exists()).toBe(true)
    })
  })
})
