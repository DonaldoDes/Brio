import { keymap } from '@codemirror/view'
import { EditorView } from '@codemirror/view'
import type { KeyBinding } from '@codemirror/view'
import { Prec } from '@codemirror/state'

/**
 * List Continuation Extension for CodeMirror 6
 * Auto-continues bullet and numbered lists on Enter
 */

/**
 * Detects if a line is a task item
 * Matches: "- [ ]", "- [x]", "- [>]", "- [-]" (with optional indentation)
 */
function detectTask(line: string): { isTask: boolean; status: string; indent: string; isEmpty: boolean } {
  const match = line.match(/^(\s*)[-*+]\s+\[([ x>-])\]\s(.*)$/)
  if (match) {
    return {
      isTask: true,
      status: match[2],
      indent: match[1],
      isEmpty: match[3].trim() === '',
    }
  }
  
  // Check for empty task line (just marker + checkbox)
  const emptyMatch = line.match(/^(\s*)[-*+]\s+\[([ x>-])\]\s*$/)
  if (emptyMatch) {
    return {
      isTask: true,
      status: emptyMatch[2],
      indent: emptyMatch[1],
      isEmpty: true,
    }
  }
  
  return { isTask: false, status: '', indent: '', isEmpty: false }
}

/**
 * Detects if a line is a bullet list item
 * Matches: "- ", "* ", "+ " (with optional indentation)
 * Also handles nested lists like "-   - Child" by extracting the full indentation
 */
function detectBulletList(line: string): { isList: boolean; marker: string; indent: string; isEmpty: boolean } {
  // Match nested list: "- " or "-   - " (parent marker + spaces + child marker)
  const nestedMatch = line.match(/^(\s*)([-*+])(\s+)([-*+])\s(.*)$/)
  if (nestedMatch) {
    // This is a nested list item like "-   - Child"
    // We want to preserve the full indentation: parent marker + spaces
    const fullIndent = nestedMatch[1] + nestedMatch[2] + nestedMatch[3]
    return {
      isList: true,
      marker: nestedMatch[4], // The child marker
      indent: fullIndent,     // Full indentation including parent
      isEmpty: nestedMatch[5].trim() === '',
    }
  }
  
  // Match regular list item
  const match = line.match(/^(\s*)([-*+])\s(.*)$/)
  if (match) {
    return {
      isList: true,
      marker: match[2],
      indent: match[1],
      isEmpty: match[3].trim() === '',
    }
  }
  
  // Check for empty bullet line (just marker + space)
  const emptyMatch = line.match(/^(\s*)([-*+])\s*$/)
  if (emptyMatch) {
    return {
      isList: true,
      marker: emptyMatch[2],
      indent: emptyMatch[1],
      isEmpty: true,
    }
  }
  
  return { isList: false, marker: '', indent: '', isEmpty: false }
}

/**
 * Detects if a line is a numbered list item
 * Matches: "1. ", "2. ", etc. (with optional indentation)
 */
function detectNumberedList(line: string): { isList: boolean; number: number; indent: string; isEmpty: boolean } {
  const match = line.match(/^(\s*)(\d+)\.\s(.*)$/)
  if (match) {
    return {
      isList: true,
      number: parseInt(match[2], 10),
      indent: match[1],
      isEmpty: match[3].trim() === '',
    }
  }
  
  // Check for empty numbered line (just number + dot + space)
  const emptyMatch = line.match(/^(\s*)(\d+)\.\s*$/)
  if (emptyMatch) {
    return {
      isList: true,
      number: parseInt(emptyMatch[2], 10),
      indent: emptyMatch[1],
      isEmpty: true,
    }
  }
  
  return { isList: false, number: 0, indent: '', isEmpty: false }
}

/**
 * Handles Enter key for list continuation
 */
function handleEnter(view: EditorView): boolean {
  const { state } = view
  const { from } = state.selection.main
  
  // Get current line
  const line = state.doc.lineAt(from)
  const lineText = line.text
  
  // Check for task first (tasks are a special case of bullet lists)
  const taskInfo = detectTask(lineText)
  if (taskInfo.isTask) {
    if (taskInfo.isEmpty) {
      // Empty task line: exit task list
      // Remove the current line and the newline before it
      const deleteFrom = line.from > 0 ? line.from - 1 : line.from
      const deleteTo = from  // Delete up to cursor position
      view.dispatch({
        changes: { from: deleteFrom, to: deleteTo, insert: '' },
        selection: { anchor: deleteFrom },
      })
    } else {
      // Continue task list with new pending task
      const newLine = `\n${taskInfo.indent}- [ ] `
      view.dispatch({
        changes: { from, insert: newLine },
        selection: { anchor: from + newLine.length },
      })
    }
    return true
  }
  
  // Check for bullet list
  const bulletInfo = detectBulletList(lineText)
  if (bulletInfo.isList) {
    if (bulletInfo.isEmpty) {
      // Empty bullet line: exit list
      // Remove the current line and the newline before it
      const deleteFrom = line.from > 0 ? line.from - 1 : line.from
      const deleteTo = from  // Delete up to cursor position
      view.dispatch({
        changes: { from: deleteFrom, to: deleteTo, insert: '' },
        selection: { anchor: deleteFrom },
      })
    } else {
      // Continue bullet list with same indentation
      const newLine = `\n${bulletInfo.indent}${bulletInfo.marker} `
      view.dispatch({
        changes: { from, insert: newLine },
        selection: { anchor: from + newLine.length },
      })
    }
    return true
  }
  
  // Check for numbered list
  const numberedInfo = detectNumberedList(lineText)
  if (numberedInfo.isList) {
    if (numberedInfo.isEmpty) {
      // Empty numbered line: exit list
      // Remove the current line and the newline before it
      const deleteFrom = line.from > 0 ? line.from - 1 : line.from
      const deleteTo = from  // Delete up to cursor position
      view.dispatch({
        changes: { from: deleteFrom, to: deleteTo, insert: '' },
        selection: { anchor: deleteFrom },
      })
    } else {
      // Continue numbered list with incremented number and same indentation
      const nextNumber = numberedInfo.number + 1
      const newLine = `\n${numberedInfo.indent}${nextNumber}. `
      view.dispatch({
        changes: { from, insert: newLine },
        selection: { anchor: from + newLine.length },
      })
    }
    return true
  }
  
  // Not a list: default Enter behavior
  return false
}

/**
 * Keyboard shortcuts for list continuation
 */
const listContinuationKeybindings: KeyBinding[] = [
  {
    key: 'Enter',
    run: handleEnter,
  },
]

/**
 * List continuation keymap extension
 * Uses Prec.highest to ensure it runs before ALL other keymaps including defaultKeymap
 */
export function listContinuation() {
  return Prec.highest(keymap.of(listContinuationKeybindings))
}
