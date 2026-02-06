import { ref, watch, onMounted } from 'vue'

export type Theme = 'light' | 'dark' | 'system'
export type EditorFont = 'System' | 'JetBrains Mono' | 'Fira Code' | 'SF Mono' | 'Menlo'

const STORAGE_KEYS = {
  THEME: 'brio-theme',
  EDITOR_FONT: 'brio-editor-font',
  EDITOR_FONT_SIZE: 'brio-editor-font-size',
}

const DEFAULT_THEME: Theme = 'light'
const DEFAULT_EDITOR_FONT: EditorFont = 'System'
const DEFAULT_EDITOR_FONT_SIZE = 16

// Map EditorFont to actual CSS font-family values
const FONT_FAMILY_MAP: Record<EditorFont, string> = {
  'System': '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  'JetBrains Mono': '"JetBrains Mono", monospace',
  'Fira Code': '"Fira Code", monospace',
  'SF Mono': '"SF Mono", monospace',
  'Menlo': 'Menlo, monospace',
}

// Shared state (singleton pattern)
const theme = ref<Theme>(DEFAULT_THEME)
const editorFont = ref<EditorFont>(DEFAULT_EDITOR_FONT)
const editorFontSize = ref<number>(DEFAULT_EDITOR_FONT_SIZE)
const resolvedTheme = ref<'light' | 'dark'>('light')

let initialized = false

/**
 * Theme Management Composable
 * 
 * Manages theme (light/dark/system), editor font, and font size.
 * Persists preferences to localStorage.
 */
export function useTheme() {
  /**
   * Get system theme from Electron
   */
  async function getSystemTheme(): Promise<'light' | 'dark'> {
    try {
      const systemTheme = await window.api.theme.getSystemTheme()
      console.log('[useTheme] System theme:', systemTheme)
      return systemTheme
    } catch (error) {
      console.error('[useTheme] Failed to get system theme:', error)
      return 'light'
    }
  }

  /**
   * Resolve the actual theme to apply (light or dark)
   */
  async function resolveTheme(): Promise<'light' | 'dark'> {
    if (theme.value === 'system') {
      return await getSystemTheme()
    }
    return theme.value
  }

  /**
   * Apply theme to DOM
   */
  async function applyTheme() {
    const resolved = await resolveTheme()
    resolvedTheme.value = resolved
    
    console.log('[useTheme] Applying theme:', resolved)
    document.documentElement.setAttribute('data-theme', resolved)
  }

  /**
   * Apply editor font to DOM
   */
  function applyEditorFont() {
    const fontFamily = FONT_FAMILY_MAP[editorFont.value]
    console.log('[useTheme] Applying editor font:', editorFont.value, '→', fontFamily)
    document.documentElement.style.setProperty('--editor-font-family', fontFamily)
  }

  /**
   * Apply editor font size to DOM
   */
  function applyEditorFontSize() {
    console.log('[useTheme] Applying editor font size:', editorFontSize.value)
    document.documentElement.style.setProperty('--editor-font-size', `${editorFontSize.value}px`)
  }

  /**
   * Load preferences from localStorage
   */
  function loadPreferences() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null
    const savedFont = localStorage.getItem(STORAGE_KEYS.EDITOR_FONT) as EditorFont | null
    const savedFontSize = localStorage.getItem(STORAGE_KEYS.EDITOR_FONT_SIZE)

    if (savedTheme) {
      theme.value = savedTheme
    }
    if (savedFont) {
      editorFont.value = savedFont
    }
    if (savedFontSize) {
      const parsedSize = parseInt(savedFontSize, 10)
      // Migration: Update old default (14px) to new default (16px) from POLISH-001
      if (parsedSize === 14) {
        editorFontSize.value = DEFAULT_EDITOR_FONT_SIZE
        console.log('[useTheme] Migrated font size from 14px to 16px (POLISH-001)')
      } else {
        editorFontSize.value = parsedSize
      }
    }

    console.log('[useTheme] Loaded preferences:', {
      theme: theme.value,
      editorFont: editorFont.value,
      editorFontSize: editorFontSize.value,
    })
  }

  /**
   * Save preferences to localStorage
   */
  function savePreferences() {
    localStorage.setItem(STORAGE_KEYS.THEME, theme.value)
    localStorage.setItem(STORAGE_KEYS.EDITOR_FONT, editorFont.value)
    localStorage.setItem(STORAGE_KEYS.EDITOR_FONT_SIZE, editorFontSize.value.toString())
    console.log('[useTheme] Saved preferences')
  }

  /**
   * Set theme
   */
  async function setTheme(newTheme: Theme) {
    console.log('[useTheme] Setting theme:', newTheme)
    theme.value = newTheme
    await applyTheme()
    savePreferences()
  }

  /**
   * Set editor font
   */
  function setEditorFont(font: EditorFont) {
    console.log('[useTheme] Setting editor font:', font)
    editorFont.value = font
    applyEditorFont()
    savePreferences()
  }

  /**
   * Set editor font size
   */
  function setEditorFontSize(size: number) {
    console.log('[useTheme] Setting editor font size:', size)
    editorFontSize.value = size
    applyEditorFontSize()
    savePreferences()
  }

  /**
   * Toggle between light and dark (ignores system)
   */
  async function toggleTheme() {
    const resolved = await resolveTheme()
    const newTheme = resolved === 'light' ? 'dark' : 'light'
    await setTheme(newTheme)
  }

  /**
   * Initialize theme system
   */
  async function initialize() {
    if (initialized) return

    console.log('[useTheme] Initializing...')
    loadPreferences()
    await applyTheme()
    applyEditorFont()
    applyEditorFontSize()

    // Watch for system theme changes (if theme is 'system')
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', async () => {
        if (theme.value === 'system') {
          console.log('[useTheme] System theme changed, reapplying...')
          await applyTheme()
        }
      })
    }

    initialized = true
    console.log('[useTheme] Initialized')
  }

  // Auto-initialize on mount
  onMounted(() => {
    void initialize()
  })

  // Watch for theme changes
  watch(theme, async () => {
    await applyTheme()
  })

  return {
    theme,
    editorFont,
    editorFontSize,
    resolvedTheme,
    setTheme,
    setEditorFont,
    setEditorFontSize,
    toggleTheme,
    initialize,
  }
}
