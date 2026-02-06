import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
  Decoration,
  DecorationSet,
  WidgetType,
  PluginValue,
} from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'

/**
 * Tag Autocomplete Extension for CodeMirror 6
 * Shows autocomplete popup when typing # in editor
 */

// State effect to show/hide autocomplete
const showAutocomplete = StateEffect.define<{ pos: number; tags: string[] } | null>()

// State field to track autocomplete state
const autocompleteState = StateField.define<{ pos: number; tags: string[] } | null>({
  create() {
    return null
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(showAutocomplete)) {
        return effect.value
      }
    }
    return value
  },
})

/**
 * Fetch available tags from API
 */
async function fetchTags(): Promise<string[]> {
  try {
    const tags = await window.api.tags.getAll()
    return tags.map((t) => t.tag)
  } catch {
    return []
  }
}

/**
 * Check if cursor is after # character
 */
function shouldShowAutocomplete(view: EditorView): boolean {
  const pos = view.state.selection.main.head
  const before = view.state.doc.sliceString(Math.max(0, pos - 1), pos)
  return before === '#'
}

/**
 * ViewPlugin to handle autocomplete logic
 */
const tagAutocompletePlugin = ViewPlugin.fromClass(
  class {
    private timeout: number | null = null

    constructor(public view: EditorView) {}

    update(update: ViewUpdate) {
      if (!update.docChanged && !update.selectionSet) return

      // Clear any pending timeout
      if (this.timeout !== null) {
        clearTimeout(this.timeout)
        this.timeout = null
      }

      const pos = update.state.selection.main.head

      if (shouldShowAutocomplete(update.view)) {
        // Fetch tags and show autocomplete (deferred to avoid update conflicts)
        this.timeout = window.setTimeout(() => {
          void fetchTags().then((tags) => {
            if (tags.length > 0) {
              this.view.dispatch({
                effects: showAutocomplete.of({ pos, tags }),
              })
            }
          })
        }, 100)
      } else {
        // Hide autocomplete (deferred to avoid update conflicts)
        this.timeout = window.setTimeout(() => {
          this.view.dispatch({
            effects: showAutocomplete.of(null),
          })
        }, 0)
      }
    }

    destroy() {
      if (this.timeout !== null) {
        clearTimeout(this.timeout)
      }
    }
  }
)

/**
 * Autocomplete widget class
 */
class AutocompleteWidget extends WidgetType {
  constructor(
    private tags: string[],
    private view: EditorView,
    private pos: number
  ) {
    super()
  }

  eq(other: AutocompleteWidget): boolean {
    return this.tags.length === other.tags.length && this.tags.every((t, i) => t === other.tags[i])
  }

  toDOM() {
    const div = document.createElement('div')
    div.className = 'tag-autocomplete'
    div.setAttribute('data-testid', 'tag-autocomplete')

    this.tags.forEach((tag) => {
      const option = document.createElement('div')
      option.className = 'tag-option'
      option.setAttribute('data-testid', 'tag-option')
      option.textContent = tag
      option.addEventListener('click', () => {
        // Insert tag at cursor position
        this.view.dispatch({
          changes: { from: this.pos, insert: tag },
          selection: { anchor: this.pos + tag.length },
        })
        // Hide autocomplete
        this.view.dispatch({
          effects: showAutocomplete.of(null),
        })
      })
      div.appendChild(option)
    })

    // Position after DOM is created (deferred)
    requestAnimationFrame(() => {
      const coords = this.view.coordsAtPos(this.pos)
      if (coords) {
        div.style.position = 'fixed'
        div.style.left = `${coords.left}px`
        div.style.top = `${coords.bottom + 4}px`
        div.style.zIndex = '10000'
      }
    })

    return div
  }
}

/**
 * Decoration field to render autocomplete widget
 */
class AutocompleteDecorationsPlugin implements PluginValue {
  decorations: DecorationSet = Decoration.none

  constructor(public view: EditorView) {
    this.updateDecorations(view)
  }

  update(update: ViewUpdate) {
    this.updateDecorations(update.view)
  }

  updateDecorations(view: EditorView) {
    const state = view.state.field(autocompleteState, false)
    if (!state || state.tags.length === 0) {
      this.decorations = Decoration.none
      return
    }

    const { pos, tags } = state

    // Create widget decoration
    const widget = Decoration.widget({
      widget: new AutocompleteWidget(tags, view, pos),
      side: 1,
    })

    this.decorations = Decoration.set([widget.range(pos)])
  }

  destroy() {
    // Cleanup if needed
  }
}

const autocompleteDecorations = ViewPlugin.fromClass(AutocompleteDecorationsPlugin, {
  decorations: (v: AutocompleteDecorationsPlugin) => v.decorations,
})

/**
 * Theme for autocomplete popup
 */
const autocompleteTheme = EditorView.baseTheme({
  '.tag-autocomplete': {
    position: 'fixed',
    zIndex: '10000',
    backgroundColor: 'var(--color-bg, white)',
    border: '1px solid var(--color-border, #ccc)',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    maxHeight: '200px',
    overflowY: 'auto',
    minWidth: '150px',
    marginTop: '4px',
  },
  '.tag-option': {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--color-text, black)',
    '&:hover': {
      backgroundColor: 'var(--color-bg-secondary, #f0f0f0)',
    },
  },
})

/**
 * Tag autocomplete extension
 */
export function tagAutocomplete() {
  return [autocompleteState, tagAutocompletePlugin, autocompleteDecorations, autocompleteTheme]
}
