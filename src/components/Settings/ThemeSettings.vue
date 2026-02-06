<script setup lang="ts">
  import { useTheme, type Theme, type EditorFont } from '../../composables/useTheme'
  import { ref } from 'vue'

  const { theme, editorFont, editorFontSize, setTheme, setEditorFont, setEditorFontSize, toggleTheme } = useTheme()

  const isOpen = ref(false)

  const themeOptions: Theme[] = ['light', 'dark', 'system']
  const fontOptions: EditorFont[] = ['System', 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo']

  function handleThemeChange(newTheme: Theme) {
    void setTheme(newTheme)
  }

  function handleFontChange(event: Event) {
    const target = event.target as HTMLSelectElement
    setEditorFont(target.value as EditorFont)
  }

  function handleFontSizeChange(event: Event) {
    const target = event.target as HTMLInputElement
    setEditorFontSize(parseInt(target.value, 10))
  }

  function toggleSettings() {
    isOpen.value = !isOpen.value
  }
</script>

<template>
  <div class="theme-settings">
    <!-- Theme Toggle Button (quick access) -->
    <button
      class="theme-toggle-button"
      data-testid="note-list-theme-toggle"
      title="Toggle Theme"
      aria-label="Toggle theme between light and dark mode"
      @click="toggleTheme"
    >
      <svg
        v-if="theme === 'light'"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="8" cy="8" r="4" fill="currentColor" />
        <path
          d="M8 1V3M8 13V15M15 8H13M3 8H1M12.5 3.5L11 5M5 11L3.5 12.5M12.5 12.5L11 11M5 5L3.5 3.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      <svg
        v-else
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 8.5C13.5 11.5 10.5 14 7 14C3.5 14 1 11.5 1 8C1 4.5 3.5 2 7 2C7.5 2 8 2.1 8.5 2.2C7 3 6 4.8 6 7C6 9.8 8.2 12 11 12C12.2 12 13.2 11.5 14 10.7V8.5Z"
          fill="currentColor"
        />
      </svg>
    </button>

    <!-- Settings Button -->
    <button
      class="settings-button"
      data-testid="theme-settings"
      title="Theme Settings"
      aria-label="Open theme settings"
      @click="toggleSettings"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M13.5 8C13.5 8.5 13.4 9 13.2 9.4L14.5 10.5L13.5 12L11.9 11.5C11.5 11.9 11 12.2 10.5 12.4L10 14H6L5.5 12.4C5 12.2 4.5 11.9 4.1 11.5L2.5 12L1.5 10.5L2.8 9.4C2.6 9 2.5 8.5 2.5 8C2.5 7.5 2.6 7 2.8 6.6L1.5 5.5L2.5 4L4.1 4.5C4.5 4.1 5 3.8 5.5 3.6L6 2H10L10.5 3.6C11 3.8 11.5 4.1 11.9 4.5L13.5 4L14.5 5.5L13.2 6.6C13.4 7 13.5 7.5 13.5 8Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
      </svg>
    </button>

    <!-- Settings Panel -->
    <div v-if="isOpen" class="settings-panel">
      <div class="settings-header">
        <h3>Theme Settings</h3>
        <button class="close-button" aria-label="Close settings" @click="toggleSettings">×</button>
      </div>

      <div class="settings-content">
        <!-- Theme Selection -->
        <div class="setting-group">
          <label>Theme</label>
          <div class="theme-options">
            <button
              v-for="option in themeOptions"
              :key="option"
              :class="{ active: theme === option }"
              :data-testid="`theme-option-${option}`"
              @click="handleThemeChange(option)"
            >
              {{ option.charAt(0).toUpperCase() + option.slice(1) }}
            </button>
          </div>
        </div>

        <!-- Editor Font -->
        <div class="setting-group">
          <label for="font-selector">Editor Font</label>
          <select
            id="font-selector"
            :value="editorFont"
            data-testid="font-selector"
            @change="handleFontChange"
          >
            <option v-for="font in fontOptions" :key="font" :value="font">
              {{ font }}
            </option>
          </select>
        </div>

        <!-- Editor Font Size -->
        <div class="setting-group">
          <label for="font-size-slider">
            Font Size: {{ editorFontSize }}px
          </label>
          <input
            id="font-size-slider"
            type="range"
            min="12"
            max="24"
            :value="editorFontSize"
            data-testid="font-size-slider"
            @input="handleFontSizeChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .theme-settings {
    position: relative;
    display: flex;
    gap: var(--space-sm);
  }

  .theme-toggle-button,
  .settings-button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color var(--transition-fast);
    color: var(--text-primary);
  }

  .theme-toggle-button:hover,
  .settings-button:hover {
    background-color: var(--bg-tertiary);
  }

  .settings-panel {
    position: absolute;
    top: 40px;
    right: 0;
    width: 300px;
    background-color: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: var(--z-dropdown);
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    border-bottom: 1px solid var(--border);
  }

  .settings-header h3 {
    margin: 0;
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }

  .close-button {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: color var(--transition-fast);
  }

  .close-button:hover {
    color: var(--text-primary);
  }

  .settings-content {
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .setting-group label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
  }

  .theme-options {
    display: flex;
    gap: var(--space-sm);
  }

  .theme-options button {
    flex: 1;
    padding: var(--space-sm);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    color: var(--text-primary);
  }

  .theme-options button:hover {
    background-color: var(--bg-tertiary);
  }

  .theme-options button.active {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
  }

  select {
    padding: var(--space-sm);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    cursor: pointer;
  }

  input[type='range'] {
    width: 100%;
    height: 4px;
    background: var(--border);
    border-radius: var(--radius-full);
    outline: none;
    -webkit-appearance: none;
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--color-accent);
    border-radius: 50%;
    cursor: pointer;
  }

  input[type='range']::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--color-accent);
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
</style>
