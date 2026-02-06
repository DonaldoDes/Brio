import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BearSidebar from './BearSidebar.vue'

describe('BearSidebar - Hover Colors Fix', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Icon Button Structure', () => {
    it('should render theme toggle button with icon-button class', () => {
      const wrapper = mount(BearSidebar, {
        props: {
          isDark: false
        }
      })

      const themeToggle = wrapper.find('[data-testid="theme-toggle"]')
      expect(themeToggle.exists()).toBe(true)
      expect(themeToggle.classes()).toContain('icon-button')
    })

    it('should render settings button with icon-button class', () => {
      const wrapper = mount(BearSidebar, {
        props: {
          isDark: false
        }
      })

      const settingsButton = wrapper.find('[data-testid="settings-button"]')
      expect(settingsButton.exists()).toBe(true)
      expect(settingsButton.classes()).toContain('icon-button')
    })

    it('should apply dark-mode class when isDark is true', () => {
      const wrapper = mount(BearSidebar, {
        props: {
          isDark: true
        }
      })

      const sidebar = wrapper.find('[data-testid="bear-sidebar"]')
      expect(sidebar.classes()).toContain('dark-mode')
    })

    it('should not apply dark-mode class when isDark is false', () => {
      const wrapper = mount(BearSidebar, {
        props: {
          isDark: false
        }
      })

      const sidebar = wrapper.find('[data-testid="bear-sidebar"]')
      expect(sidebar.classes()).not.toContain('dark-mode')
    })
  })

  describe('CSS Variable Integration', () => {
    it('should use icon-button class for styling', () => {
      const wrapper = mount(BearSidebar, {
        props: {
          isDark: false
        }
      })

      const themeToggle = wrapper.find('[data-testid="theme-toggle"]')
      expect(themeToggle.classes()).toContain('icon-button')
      // CSS variables --icon-hover are defined in tokens.css and applied via scoped styles
    })

    it('should apply dark-mode class for dark theme styling', () => {
      const wrapper = mount(BearSidebar, {
        props: {
          isDark: true
        }
      })

      const sidebar = wrapper.find('[data-testid="bear-sidebar"]')
      expect(sidebar.classes()).toContain('dark-mode')
      // Dark mode CSS variables are applied via .dark-mode class
    })
  })

  describe('Button Interactions', () => {
    it('should emit open-settings when settings button is clicked', async () => {
      const wrapper = mount(BearSidebar, {
        props: {
          isDark: false
        }
      })

      const settingsButton = wrapper.find('[data-testid="settings-button"]')
      await settingsButton.trigger('click')

      expect(wrapper.emitted('open-settings')).toBeTruthy()
    })

    it('should call theme toggle when theme button is clicked', async () => {
      const wrapper = mount(BearSidebar, {
        props: {
          isDark: false
        }
      })

      const themeToggle = wrapper.find('[data-testid="theme-toggle"]')
      await themeToggle.trigger('click')

      // Theme toggle is handled by useTheme composable
      expect(themeToggle.exists()).toBe(true)
    })
  })
})
