import { keymap } from '@codemirror/view'
import { EditorView } from '@codemirror/view'
import type { KeyBinding } from '@codemirror/view'

/**
 * Markdown Keymap Extension for CodeMirror 6
 * Provides keyboard shortcuts for markdown formatting
 */

/**
 * Wraps selected text with markers or inserts markers with cursor in middle
 */
function wrapSelection(view: EditorView, marker: string): boolean {
  const { state } = view
  const { from, to } = state.selection.main
  const selectedText = state.sliceDoc(from, to)

  if (selectedText) {
    // Check if already wrapped
    const beforeFrom = Math.max(0, from - marker.length)
    const afterTo = Math.min(state.doc.length, to + marker.length)
    const before = state.sliceDoc(beforeFrom, from)
    const after = state.sliceDoc(to, afterTo)

    if (before === marker && after === marker) {
      // Remove markers (toggle off)
      view.dispatch({
        changes: [
          { from: beforeFrom, to: from, insert: '' },
          { from: to, to: afterTo, insert: '' },
        ],
        selection: { anchor: beforeFrom, head: beforeFrom + selectedText.length },
      })
    } else {
      // Add markers
      view.dispatch({
        changes: { from, to, insert: `${marker}${selectedText}${marker}` },
        selection: { anchor: from, head: to + marker.length * 2 },
      })
    }
  } else {
    // No selection: insert markers and place cursor in middle
    view.dispatch({
      changes: { from, to, insert: `${marker}${marker}` },
      selection: { anchor: from + marker.length },
    })
  }

  return true
}

/**
 * Inserts link template
 */
function insertLink(view: EditorView): boolean {
  const { state } = view
  const { from, to } = state.selection.main
  const selectedText = state.sliceDoc(from, to)

  if (selectedText) {
    // Wrap selected text as link text
    const linkTemplate = `[${selectedText}](url)`
    view.dispatch({
      changes: { from, to, insert: linkTemplate },
      selection: {
        anchor: from + selectedText.length + 3, // Position on "url"
        head: from + selectedText.length + 6,
      },
    })
  } else {
    // No selection: insert template with cursor on url
    const linkTemplate = '[text](url)'
    view.dispatch({
      changes: { from, to, insert: linkTemplate },
      selection: {
        anchor: from + 7, // Position on "url"
        head: from + 10,
      },
    })
  }

  return true
}

/**
 * Keyboard shortcuts for markdown formatting
 */
const markdownKeybindings: KeyBinding[] = [
  {
    key: 'Mod-b',
    run: (view) => wrapSelection(view, '**'),
  },
  {
    key: 'Mod-i',
    run: (view) => wrapSelection(view, '*'),
  },
  {
    key: 'Mod-e',
    run: (view) => wrapSelection(view, '`'),
  },
  {
    key: 'Mod-k',
    run: insertLink,
  },
]

/**
 * Markdown keymap extension
 */
export function markdownKeymap() {
  return keymap.of(markdownKeybindings)
}
