import { ref, watch } from 'vue'

export interface LayoutState {
  sidebarWidth: number
  listWidth: number
  isSidebarCollapsed: boolean
}

const DEFAULT_SIDEBAR_WIDTH = 240
const DEFAULT_LIST_WIDTH = 320
const DEFAULT_SIDEBAR_COLLAPSED = false

// Helper to safely load from localStorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key)
    if (saved !== null && saved !== '') {
      return JSON.parse(saved) as T
    }
    return defaultValue
  } catch (error) {
    console.error(`[LayoutPersistence] Failed to load ${key}:`, error)
    return defaultValue
  }
}

// Helper to safely save to localStorage
function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`[LayoutPersistence] Failed to save ${key}:`, error)
  }
}

export function useLayoutPersistence(): {
  sidebarWidth: ReturnType<typeof ref<number>>
  listWidth: ReturnType<typeof ref<number>>
  isSidebarCollapsed: ReturnType<typeof ref<boolean>>
  resetToDefaults: () => void
} {
  // Initialize refs with values from localStorage
  const sidebarWidth = ref(loadFromStorage('brio-layout-sidebar-width', DEFAULT_SIDEBAR_WIDTH))
  const listWidth = ref(loadFromStorage('brio-layout-list-width', DEFAULT_LIST_WIDTH))
  const isSidebarCollapsed = ref(
    loadFromStorage('brio-layout-sidebar-collapsed', DEFAULT_SIDEBAR_COLLAPSED)
  )

  // Watch and save to localStorage
  watch(sidebarWidth, (val) => {
    saveToStorage('brio-layout-sidebar-width', val)
  })

  watch(listWidth, (val) => {
    saveToStorage('brio-layout-list-width', val)
  })

  watch(isSidebarCollapsed, (val) => {
    console.log('[LayoutPersistence] isSidebarCollapsed changed to:', val)
    saveToStorage('brio-layout-sidebar-collapsed', val)
  })

  function resetToDefaults(): void {
    sidebarWidth.value = DEFAULT_SIDEBAR_WIDTH
    listWidth.value = DEFAULT_LIST_WIDTH
    isSidebarCollapsed.value = DEFAULT_SIDEBAR_COLLAPSED
  }

  return {
    sidebarWidth,
    listWidth,
    isSidebarCollapsed,
    resetToDefaults,
  }
}
