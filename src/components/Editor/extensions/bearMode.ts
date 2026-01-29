import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { EditorState, Range } from '@codemirror/state'

/**
 * Bear Mode Extension for CodeMirror 6
 * Hides markdown syntax when cursor is not on the line (like Bear app)
 */

// CSS classes for styling
const bearTheme = EditorView.baseTheme({
  '.cm-bear-hidden': {
    opacity: '0',
    transition: 'opacity 100ms ease-in-out',
  },
  '.cm-bear-bold': {
    fontWeight: 'bold',
  },
  '.cm-bear-italic': {
    fontStyle: 'italic',
  },
  '.cm-bear-code': {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    padding: '2px 4px',
    borderRadius: '3px',
  },
  '.cm-bear-heading-1': {
    fontSize: '2em',
    fontWeight: 'bold',
    lineHeight: '1.2',
  },
  '.cm-bear-heading-2': {
    fontSize: '1.5em',
    fontWeight: 'bold',
    lineHeight: '1.3',
  },
  '.cm-bear-heading-3': {
    fontSize: '1.25em',
    fontWeight: 'bold',
    lineHeight: '1.4',
  },
  '.cm-bear-link': {
    color: '#0066cc',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  '.cm-bear-code-block': {
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
    padding: '8px 12px',
    borderRadius: '4px',
    display: 'block',
    margin: '4px 0',
  },
})

// Decoration types
// Use Decoration.replace to completely hide markers (removes them from DOM)
const hiddenMark = Decoration.replace({})
const boldMark = Decoration.mark({ class: 'cm-bear-bold' })
const italicMark = Decoration.mark({ class: 'cm-bear-italic' })
const codeMark = Decoration.mark({ class: 'cm-bear-code' })
const heading1Mark = Decoration.mark({ class: 'cm-bear-heading-1' })
const heading2Mark = Decoration.mark({ class: 'cm-bear-heading-2' })
const heading3Mark = Decoration.mark({ class: 'cm-bear-heading-3' })
const linkMark = Decoration.mark({ class: 'cm-bear-link' })
const codeBlockMark = Decoration.mark({ class: 'cm-bear-code-block' })

interface MarkdownElement {
  type: 'bold' | 'italic' | 'code' | 'heading' | 'link' | 'codeBlock'
  from: number
  to: number
  markerStart?: number
  markerEnd?: number
  contentStart?: number
  contentEnd?: number
  level?: number
  openingFenceEnd?: number
  closingFenceStart?: number
}

function findMarkdownElements(state: EditorState): MarkdownElement[] {
  const elements: MarkdownElement[] = []
  
  // First, find code blocks (multi-line) by scanning lines
  let inCodeBlock = false
  let codeBlockStart = -1
  let codeBlockOpeningEnd = -1
  
  for (let lineNum = 1; lineNum <= state.doc.lines; lineNum++) {
    const line = state.doc.line(lineNum)
    const text = line.text.trim()
    
    if (text.startsWith('```')) {
      if (!inCodeBlock) {
        // Opening fence
        inCodeBlock = true
        codeBlockStart = line.from
        codeBlockOpeningEnd = line.to // Do NOT include the newline
      } else {
        // Closing fence
        const codeBlockEnd = line.to
        
        elements.push({
          type: 'codeBlock',
          from: codeBlockStart,
          to: codeBlockEnd,
          openingFenceEnd: codeBlockOpeningEnd,
          closingFenceStart: line.from,
          contentStart: codeBlockOpeningEnd + 1, // +1 to skip the newline after opening fence
          contentEnd: line.from - 1, // -1 to exclude the \n before closing fence
        })
        
        inCodeBlock = false
        codeBlockStart = -1
        codeBlockOpeningEnd = -1
      }
    }
  }
  
  // Use regex-based parsing for reliability
  // Iterate through each line
  for (let lineNum = 1; lineNum <= state.doc.lines; lineNum++) {
    const line = state.doc.line(lineNum)
    const text = line.text
    const lineStart = line.from
    
    // Bold: **text**
    const boldRegex = /\*\*([^*]+)\*\*/g
    let match: RegExpExecArray | null
    while ((match = boldRegex.exec(text)) !== null) {
      const from = lineStart + match.index
      const to = from + match[0].length
      elements.push({
        type: 'bold',
        from,
        to,
        markerStart: from,
        markerEnd: from + 2,
        contentStart: from + 2,
        contentEnd: to - 2,
      })
    }
    
    // Italic: *text* (but not **)
    const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g
    while ((match = italicRegex.exec(text)) !== null) {
      const from = lineStart + match.index
      const to = from + match[0].length
      elements.push({
        type: 'italic',
        from,
        to,
        markerStart: from,
        markerEnd: from + 1,
        contentStart: from + 1,
        contentEnd: to - 1,
      })
    }
    
    // Inline code: `code`
    const codeRegex = /`([^`]+)`/g
    while ((match = codeRegex.exec(text)) !== null) {
      const from = lineStart + match.index
      const to = from + match[0].length
      elements.push({
        type: 'code',
        from,
        to,
        markerStart: from,
        markerEnd: from + 1,
        contentStart: from + 1,
        contentEnd: to - 1,
      })
    }
    
    // Headings: # Title
    const headingRegex = /^(#{1,3})\s+(.+)$/
    match = headingRegex.exec(text)
    if (match) {
      const level = match[1].length
      const from = lineStart
      const to = lineStart + text.length
      const markerEnd = from + match[1].length + 1 // Include space
      elements.push({
        type: 'heading',
        from,
        to,
        markerStart: from,
        markerEnd,
        contentStart: markerEnd,
        contentEnd: to,
        level,
      })
    }
    
    // Links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    while ((match = linkRegex.exec(text)) !== null) {
      const from = lineStart + match.index
      const to = from + match[0].length
      const textStart = from + 1
      const textEnd = from + 1 + match[1].length
      elements.push({
        type: 'link',
        from,
        to,
        markerStart: from, // [
        markerEnd: textEnd + 1, // ]
        contentStart: textStart,
        contentEnd: textEnd,
      })
    }
  }

  return elements
}

function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view
  const cursorLine = state.doc.lineAt(state.selection.main.head).number

  const elements = findMarkdownElements(state)

  const decorations: Range<Decoration>[] = []

  for (const element of elements) {
    const elementLine = state.doc.lineAt(element.from).number
    const cursorPos = state.selection.main.head
    
    // For code blocks, check if cursor is anywhere within the block
    const isCursorInElement = element.type === 'codeBlock' 
      ? (cursorPos >= element.from && cursorPos <= element.to)
      : elementLine === cursorLine

    if (isCursorInElement) {
      // Cursor is on this line/in this block - show everything normally
      continue
    }

    // Cursor is NOT on this line - hide markers and style content
    // IMPORTANT: Add decorations in the correct order to avoid CodeMirror sorting errors
    // For overlapping decorations at the same position, we need to be careful about the order
    
    switch (element.type) {
      case 'bold':
        // For bold text like **text**, we have overlapping decorations at position 8:
        // 1. boldMark from 8-21 (style the whole thing)
        // 2. hiddenMark from 8-10 (hide the opening **)
        // 3. hiddenMark from 19-21 (hide the closing **)
        // 
        // The issue is that mark decorations and replace decorations can't start at the same position
        // Solution: Only style the content, not the markers
        if (element.contentStart !== undefined && element.contentEnd !== undefined) {
          decorations.push(boldMark.range(element.contentStart, element.contentEnd))
        }
        // Hide the markers
        if (element.markerStart !== undefined && element.markerEnd !== undefined) {
          decorations.push(hiddenMark.range(element.markerStart, element.markerEnd))
          decorations.push(hiddenMark.range(element.to - 2, element.to))
        }
        break

      case 'italic':
        // Same approach: style only the content, not the markers
        if (element.contentStart !== undefined && element.contentEnd !== undefined) {
          decorations.push(italicMark.range(element.contentStart, element.contentEnd))
        }
        // Hide the markers
        if (element.markerStart !== undefined && element.markerEnd !== undefined) {
          decorations.push(hiddenMark.range(element.markerStart, element.markerEnd))
          decorations.push(hiddenMark.range(element.to - 1, element.to))
        }
        break

      case 'code':
        // Same approach: style only the content
        if (element.contentStart !== undefined && element.contentEnd !== undefined) {
          decorations.push(codeMark.range(element.contentStart, element.contentEnd))
        }
        // Hide the backticks
        if (element.markerStart !== undefined && element.markerEnd !== undefined) {
          decorations.push(hiddenMark.range(element.markerStart, element.markerEnd))
          decorations.push(hiddenMark.range(element.to - 1, element.to))
        }
        break

      case 'heading':
        // Style the content only (not the marker)
        if (element.contentStart !== undefined && element.contentEnd !== undefined) {
          const headingMark =
            element.level === 1 ? heading1Mark : element.level === 2 ? heading2Mark : heading3Mark
          decorations.push(headingMark.range(element.contentStart, element.contentEnd))
        }
        // Hide the # marker
        if (element.markerStart !== undefined && element.markerEnd !== undefined) {
          decorations.push(hiddenMark.range(element.markerStart, element.markerEnd))
        }
        break

      case 'link':
        // Style the link text
        if (element.contentStart !== undefined && element.contentEnd !== undefined) {
          decorations.push(linkMark.range(element.contentStart, element.contentEnd))
        }
        // Hide everything except the link text
        if (element.markerStart !== undefined && element.contentStart !== undefined) {
          decorations.push(hiddenMark.range(element.markerStart, element.contentStart)) // [
        }
        if (element.contentEnd !== undefined) {
          decorations.push(hiddenMark.range(element.contentEnd, element.to)) // ](url)
        }
        break

      case 'codeBlock':
        // Style only the content (between the fences)
        if (element.contentStart !== undefined && element.contentEnd !== undefined) {
          decorations.push(codeBlockMark.range(element.contentStart, element.contentEnd))
        }
        // Hide the fences (opening and closing ```)
        if (element.openingFenceEnd !== undefined) {
          decorations.push(hiddenMark.range(element.from, element.openingFenceEnd))
        }
        if (element.closingFenceStart !== undefined) {
          decorations.push(hiddenMark.range(element.closingFenceStart, element.to))
        }
        break
    }
  }

  // Sort by position
  decorations.sort((a, b) => a.from - b.from || a.to - b.to)
  
  return Decoration.set(decorations, true)
}

const bearModePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
)

/**
 * Bear Mode extension
 * Hides markdown syntax when cursor is not on the line
 */
export function bearMode() {
  return [bearTheme, bearModePlugin]
}
