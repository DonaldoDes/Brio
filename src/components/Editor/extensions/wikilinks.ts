import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view'
import { EditorState, Range } from '@codemirror/state'

/**
 * Wikilinks Extension for CodeMirror 6
 * Renders [[wikilinks]] as clickable links with support for aliases [[link|alias]]
 */

// CSS theme for wikilinks
const wikilinkTheme = EditorView.baseTheme({
  '.cm-wikilink-title': {
    color: '#3B82F6',
    textDecoration: 'none',
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  '.cm-wikilink-title-broken': {
    color: '#EF4444',
    borderBottom: '1px dashed #EF4444',
    cursor: 'pointer',
    textDecoration: 'none',
  },
})

interface WikilinkMatch {
  from: number
  to: number
  title: string
  alias: string | null
  bracketsStart: number
  bracketsEnd: number
  contentStart: number
  contentEnd: number
}

/**
 * Parse wikilinks from document
 * Regex: [[title]] or [[title|alias]]
 * Ignores escaped wikilinks: \[[
 */
function findWikilinks(state: EditorState): WikilinkMatch[] {
  const wikilinks: WikilinkMatch[] = []
  const text = state.doc.toString()
  // Negative lookbehind to ignore escaped wikilinks \[[
  const regex = /(?<!\\)\[\[([^\]|]+)(\|([^\]]+))?\]\]/g

  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const from = match.index
    const to = from + match[0].length
    const title = match[1].trim()
    const alias = match[3] ? match[3].trim() : null

    wikilinks.push({
      from,
      to,
      title,
      alias,
      bracketsStart: from,
      bracketsEnd: to,
      contentStart: from + 2, // After [[
      contentEnd: to - 2, // Before ]]
    })
  }

  return wikilinks
}

// Cache for note titles (updated when notes change)
let noteTitlesCache: Set<string> = new Set()

/**
 * Update the note titles cache and refresh editor decorations
 */
export async function updateNoteTitlesCache(): Promise<void> {
  try {
    const notes = await window.api.notes.getAll()
    noteTitlesCache = new Set(notes.map((note) => note.title))
    
    // Force editor to refresh decorations
    const editorView = (window as any).__brio_editorView
    if (editorView) {
      editorView.dispatch({
        effects: [],
      })
    }
  } catch {
    noteTitlesCache = new Set()
  }
}

/**
 * Check if a note exists by title (using cache)
 */
function noteExists(title: string): boolean {
  return noteTitlesCache.has(title)
}

/**
 * Build decorations for wikilinks
 * Strategy: Replace brackets with empty decorations, mark title with styling
 */
function buildWikilinkDecorations(view: EditorView): DecorationSet {
  const { state } = view
  const wikilinks = findWikilinks(state)
  const decorations: Range<Decoration>[] = []

  for (const wikilink of wikilinks) {
    const exists = noteExists(wikilink.title)
    const displayText = wikilink.alias || wikilink.title
    const titleClass = exists ? 'cm-wikilink-title' : 'cm-wikilink-title-broken'

    // Build attributes for the title mark
    const titleAttributes: Record<string, string> = {
      'data-wikilink': wikilink.title,
      'data-testid': 'wikilink',
    }
    
    // Add broken link attribute if note doesn't exist
    if (!exists) {
      titleAttributes['data-wikilink-broken'] = wikilink.title
    }

    // Replace opening brackets [[ with nothing
    decorations.push(Decoration.replace({}).range(wikilink.from, wikilink.from + 2))

    // Handle alias case: [[title|alias]]
    if (wikilink.alias) {
      // Find the pipe position
      const text = state.doc.sliceString(wikilink.from, wikilink.to)
      const pipeIndex = text.indexOf('|')
      const pipePos = wikilink.from + pipeIndex

      // Replace title part and pipe with nothing
      decorations.push(Decoration.replace({}).range(wikilink.from + 2, pipePos + 1))

      // Mark alias (between | and ]]) as visible and clickable
      const aliasMark = Decoration.mark({
        class: titleClass,
        attributes: {
          ...titleAttributes,
          'data-wikilink-alias': wikilink.alias,
        },
      })
      decorations.push(aliasMark.range(pipePos + 1, wikilink.to - 2))
    } else {
      // No alias: mark title (between [[ and ]]) as visible and clickable
      const titleMark = Decoration.mark({
        class: titleClass,
        attributes: titleAttributes,
      })
      decorations.push(titleMark.range(wikilink.from + 2, wikilink.to - 2))
    }

    // Replace closing brackets ]] with nothing
    decorations.push(Decoration.replace({}).range(wikilink.to - 2, wikilink.to))
  }

  return Decoration.set(decorations, true)
}

/**
 * Handle click on wikilink
 */
function handleWikilinkClick(view: EditorView, pos: number, originalEvent: MouseEvent): boolean {
  const wikilinks = findWikilinks(view.state)

  for (const wikilink of wikilinks) {
    if (pos >= wikilink.from && pos <= wikilink.to) {
      // Dispatch custom event for navigation
      console.log('[Wikilinks] Click detected on:', wikilink.title, 'at pos:', pos)
      const event = new CustomEvent('wikilink-click', {
        detail: { 
          title: wikilink.title,
          metaKey: originalEvent.metaKey,
          ctrlKey: originalEvent.ctrlKey,
        },
        bubbles: true,
        composed: true,
      })
      view.dom.dispatchEvent(event)
      console.log('[Wikilinks] Event dispatched')
      return true
    }
  }

  console.log('[Wikilinks] No wikilink found at pos:', pos)
  return false
}

/**
 * Wikilink ViewPlugin
 */
const wikilinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildWikilinkDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildWikilinkDecorations(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations,
    eventHandlers: {
      click: (e, view) => {
        // For click events, button is 0 for left click (or undefined)
        // Only process left clicks (button 0) or when button is not set
        if (e.button && e.button !== 0) return false
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
        if (pos === null) return false
        console.log('[Wikilinks] Click event at pos:', pos)
        return handleWikilinkClick(view, pos, e)
      },
    },
  }
)

/**
 * Wikilinks extension
 */
export function wikilinks() {
  return [wikilinkTheme, wikilinkPlugin]
}
