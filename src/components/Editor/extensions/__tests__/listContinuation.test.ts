/**
 * Tests for List Continuation Extension
 * BUG-017: Ensure tasks create proper line breaks
 */

import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { listContinuation } from '../listContinuation'

describe('List Continuation - Task Handling (BUG-017)', () => {
  it('should create a new task line when pressing Enter after a task', () => {
    const doc = '- [x] Tâche terminée'
    const state = EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [listContinuation()],
    })

    const view = new EditorView({ state })
    
    // Simulate Enter key press
    const enterKey = view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )

    // Check that a new task line was created
    const newDoc = view.state.doc.toString()
    expect(newDoc).toContain('- [x] Tâche terminée\n- [ ] ')
    
    view.destroy()
  })

  it('should exit task list when pressing Enter on empty task', () => {
    const doc = '- [ ] '
    const state = EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [listContinuation()],
    })

    const view = new EditorView({ state })
    
    // Simulate Enter key press
    view.contentDOM.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )

    // Check that the empty task was removed
    const newDoc = view.state.doc.toString()
    expect(newDoc).toBe('')
    
    view.destroy()
  })

  it('should handle tasks with different statuses', () => {
    const testCases = [
      '- [ ] Pending task',
      '- [x] Done task',
      '- [>] Deferred task',
      '- [-] Cancelled task',
    ]

    testCases.forEach((doc) => {
      const state = EditorState.create({
        doc,
        selection: { anchor: doc.length },
        extensions: [listContinuation()],
      })

      const view = new EditorView({ state })
      
      // Simulate Enter key press
      view.contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      )

      // Check that a new pending task was created
      const newDoc = view.state.doc.toString()
      expect(newDoc).toContain('\n- [ ] ')
      
      view.destroy()
    })
  })
})
