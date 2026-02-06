import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import { EditorState, Range } from '@codemirror/state'

/**
 * Task Checkbox Extension for CodeMirror 6
 * Renders interactive checkboxes for markdown tasks: - [ ], - [x], - [>], - [-]
 */

// Task status mapping
const TASK_STATUS_MAP = {
  ' ': 'pending',
  'x': 'done',
  '>': 'deferred',
  '-': 'cancelled',
} as const

const TASK_STATUS_CYCLE = {
  ' ': 'x', // pending -> done
  'x': '>', // done -> deferred
  '>': '-', // deferred -> cancelled
  '-': ' ', // cancelled -> pending
} as const

type TaskChar = keyof typeof TASK_STATUS_MAP

interface TaskMatch {
  from: number
  to: number
  char: TaskChar
  status: string
  lineNumber: number
}

/**
 * Parse tasks from document
 * Regex: - [ ], - [x], - [>], - [-]
 */
function findTasks(state: EditorState): TaskMatch[] {
  const tasks: TaskMatch[] = []
  
  console.log('[TaskCheckbox] findTasks called, doc.lines:', state.doc.lines)
  
  // Iterate through each line to find tasks
  for (let lineNum = 1; lineNum <= state.doc.lines; lineNum++) {
    const line = state.doc.line(lineNum)
    const text = line.text
    
    console.log('[TaskCheckbox] Line', lineNum, ':', text)
    
    // Match task list items at the start of the line: - [ ], - [x], - [>], - [-]
    // Also match nested tasks: - - [x], - - - [x], etc.
    const match = /^-(\s+-)*\s+\[([ x>-])\]/.exec(text)
    
    if (match) {
      const from = line.from
      const to = from + match[0].length
      // The status character is in match[2] (second capture group)
      const char = match[2] as TaskChar
      const status = TASK_STATUS_MAP[char]
      const lineNumber = lineNum - 1 // 0-based

      tasks.push({
        from,
        to,
        char,
        status,
        lineNumber,
      })
    }
  }

  return tasks
}

/**
 * Checkbox Widget
 * Renders an interactive HTML checkbox
 */
class CheckboxWidget extends WidgetType {
  constructor(
    private readonly char: TaskChar,
    private readonly status: string,
    private readonly pos: number
  ) {
    super()
  }

  eq(other: CheckboxWidget): boolean {
    return other.char === this.char && other.pos === this.pos
  }

  toDOM(view: EditorView): HTMLElement {
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    // For "done" status, checkbox should be checked
    checkbox.checked = this.status === 'done'
    checkbox.className = 'cm-task-checkbox'
    checkbox.setAttribute('data-testid', 'task-checkbox')
    checkbox.setAttribute('data-status', this.status)
    
    console.log('[TaskCheckbox] Creating widget:', { char: this.char, status: this.status, pos: this.pos })

    // Handle click to toggle status
    checkbox.addEventListener('click', (e) => {
      e.preventDefault()
      this.toggleTask(view)
    })

    return checkbox
  }

  private toggleTask(view: EditorView): void {
    const nextChar = TASK_STATUS_CYCLE[this.char]

    // Find the exact position of the character inside the brackets
    // Pattern: "- [x]" -> we need to replace the 'x' at position this.pos + 3
    const charPos = this.pos + 3

    view.dispatch({
      changes: {
        from: charPos,
        to: charPos + 1,
        insert: nextChar,
      },
    })
  }

  ignoreEvent(): boolean {
    return true
  }
}

/**
 * Build decorations for task checkboxes
 * Strategy: Add widget before "- [x]" and hide the markdown visually with CSS
 */
function buildTaskDecorations(view: EditorView): DecorationSet {
  const { state } = view
  const tasks = findTasks(state)
  const decorations: Range<Decoration>[] = []

  for (const task of tasks) {
    // Create checkbox widget at the start of the task marker
    const widget = Decoration.widget({
      widget: new CheckboxWidget(task.char, task.status, task.from),
      side: -1, // Place widget before the text
    })
    decorations.push(widget.range(task.from))

    // Hide the markdown syntax "- [x]" visually with CSS (but keep in DOM)
    const hiddenMark = Decoration.mark({
      class: 'cm-task-marker-hidden',
    })
    decorations.push(hiddenMark.range(task.from, task.to))
  }

  return Decoration.set(decorations, true)
}

/**
 * Task Checkbox ViewPlugin
 */
const taskCheckboxPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildTaskDecorations(view)
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildTaskDecorations(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
)

// CSS theme for task checkboxes
const taskCheckboxTheme = EditorView.baseTheme({
  '.cm-task-checkbox': {
    // Hide native checkbox
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    
    // Size and spacing
    width: '16px',
    height: '16px',
    marginRight: '8px',
    cursor: 'pointer',
    verticalAlign: 'middle',
    flexShrink: '0',
    
    // Unchecked state: border with transparent background
    border: '2px solid var(--checkbox-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'transparent',
    
    // Smooth transition
    transition: 'all var(--transition-fast)',
    
    // Position for checkmark
    position: 'relative',
    display: 'inline-block',
  },
  
  '.cm-task-checkbox:hover': {
    borderColor: 'var(--checkbox-border-hover)',
  },
  
  // Checked state: accent background with checkmark
  '.cm-task-checkbox:checked': {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
  },
  
  '.cm-task-checkbox:checked:hover': {
    backgroundColor: 'var(--color-accent-hover)',
    borderColor: 'var(--color-accent-hover)',
  },
  
  // Checkmark using ::after pseudo-element
  '.cm-task-checkbox:checked::after': {
    content: '""',
    position: 'absolute',
    left: '4px',
    top: '1px',
    width: '4px',
    height: '8px',
    border: 'solid white',
    borderWidth: '0 2px 2px 0',
    transform: 'rotate(45deg)',
  },
  
  '.cm-task-marker-hidden': {
    opacity: '0',
    position: 'absolute',
    pointerEvents: 'none',
    width: '0',
    height: '0',
    overflow: 'hidden',
  },
})

/**
 * Task Checkbox extension
 */
export function taskCheckbox(): unknown[] {
  return [taskCheckboxTheme, taskCheckboxPlugin]
}
