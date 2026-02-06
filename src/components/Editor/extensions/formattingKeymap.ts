import { keymap } from '@codemirror/view'
import type { KeyBinding } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'

/**
 * Apply formatting to selected text
 */
function applyFormatting(view: EditorView, prefix: string, suffix?: string): boolean {
  const { state } = view
  const { from, to } = state.selection.main
  
  // If no selection, do nothing
  if (from === to) return false
  
  const selectedText = state.doc.sliceString(from, to)
  const actualSuffix = suffix ?? prefix
  const formattedText = `${prefix}${selectedText}${actualSuffix}`
  
  view.dispatch({
    changes: { from, to, insert: formattedText },
    selection: { anchor: from + prefix.length + selectedText.length + actualSuffix.length },
  })
  
  return true
}

/**
 * Keyboard shortcuts for text formatting
 */
const formattingKeybindings: KeyBinding[] = [
  {
    key: 'Mod-b',
    run: (view) => applyFormatting(view, '**'),
  },
  {
    key: 'Mod-i',
    run: (view) => applyFormatting(view, '*'),
  },
  {
    key: 'Mod-u',
    run: (view) => applyFormatting(view, '<u>', '</u>'),
  },
  {
    key: 'Mod-k',
    run: (view) => applyFormatting(view, '[', '](url)'),
  },
  {
    key: 'Mod-e',
    run: (view) => applyFormatting(view, '`'),
  },
]

export function formattingKeymap() {
  return keymap.of(formattingKeybindings)
}
