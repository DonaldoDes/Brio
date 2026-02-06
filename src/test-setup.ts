/**
 * Test Setup
 * 
 * Polyfills and global setup for Vitest tests
 */

import { vi } from 'vitest'

// Polyfill for Event constructors (jsdom 27.x compatibility)
if (typeof window !== 'undefined') {
  // Store original constructors
  const OriginalMouseEvent = window.MouseEvent
  const OriginalKeyboardEvent = window.KeyboardEvent
  const OriginalFocusEvent = window.FocusEvent
  const OriginalInputEvent = window.InputEvent

  // Only polyfill if needed
  try {
    new OriginalMouseEvent('test')
  } catch {
    // @ts-ignore
    window.MouseEvent = class MouseEvent extends Event {
      constructor(type: string, eventInitDict?: MouseEventInit) {
        super(type, eventInitDict)
      }
    }
  }

  try {
    new OriginalKeyboardEvent('test')
  } catch {
    // @ts-ignore
    window.KeyboardEvent = class KeyboardEvent extends Event {
      constructor(type: string, eventInitDict?: KeyboardEventInit) {
        super(type, eventInitDict)
      }
    }
  }

  try {
    new OriginalFocusEvent('test')
  } catch {
    // @ts-ignore
    window.FocusEvent = class FocusEvent extends Event {
      constructor(type: string, eventInitDict?: FocusEventInit) {
        super(type, eventInitDict)
      }
    }
  }

  try {
    new OriginalInputEvent('test')
  } catch {
    // @ts-ignore
    window.InputEvent = class InputEvent extends Event {
      constructor(type: string, eventInitDict?: InputEventInit) {
        super(type, eventInitDict)
      }
    }
  }
}

// Mock localStorage with actual storage
const storage: Record<string, string> = {}

const localStorageMock = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
  clear: () => { Object.keys(storage).forEach(key => delete storage[key]) },
  get length() { return Object.keys(storage).length },
  key: (index: number) => Object.keys(storage)[index] || null,
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock window.api
Object.defineProperty(window, 'api', {
  value: {
    tags: {
      getAll: vi.fn().mockResolvedValue([]),
      getNotesByTag: vi.fn().mockResolvedValue([]),
    },
  },
  writable: true,
})
