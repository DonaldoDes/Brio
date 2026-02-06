<script setup lang="ts">
  import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
  import { EditorState } from '@codemirror/state'
  import { EditorView, keymap } from '@codemirror/view'
  import { markdown } from '@codemirror/lang-markdown'
  import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
  import { bearMode } from './extensions/bearMode'
  import { markdownKeymap } from './extensions/markdownKeymap'
  import { listContinuation } from './extensions/listContinuation'
  import { wikilinks, updateNoteTitlesCache } from './extensions/wikilinks'
  import { taskCheckbox } from './extensions/taskCheckbox'
  import WikilinkAutocomplete from './WikilinkAutocomplete.vue'
  import TagAutocomplete from './TagAutocomplete.vue'
  import { useNotesStore } from '../../stores/notes'
  import { storeToRefs } from 'pinia'

  const props = defineProps<{
    modelValue: string
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    'wikilink-click': [detail: { title: string; metaKey?: boolean; ctrlKey?: boolean }]
  }>()

  const editorContainer = ref<HTMLDivElement | null>(null)
  let editorView: EditorView | null = null

  // Wikilink autocomplete state
  const autocompleteOpen = ref(false)
  const autocompleteQuery = ref('')
  const autocompletePosition = ref({ x: 0, y: 0 })
  const autocompleteSelectedIndex = ref(-1)
  let autocompleteStartPos = 0

  // Tag autocomplete state
  const tagAutocompleteOpen = ref(false)
  const tagAutocompleteQuery = ref('')
  const tagAutocompletePosition = ref({ x: 0, y: 0 })
  const tagAutocompleteSelectedIndex = ref(-1)
  let tagAutocompleteStartPos = 0
  const availableTags = ref<string[]>([])

  // Get notes from store for autocomplete
  const notesStore = useNotesStore()
  const { notes } = storeToRefs(notesStore)

  // Filtered notes for wikilink autocomplete
  const autocompleteSuggestions = computed(() => {
    if (!autocompleteQuery.value) {
      return notes.value.slice(0, 8)
    }
    const q = autocompleteQuery.value.toLowerCase()
    return notes.value
      .filter((n) => n.title.toLowerCase().includes(q))
      .slice(0, 8)
  })

  // Filtered tags for tag autocomplete
  const tagAutocompleteSuggestions = computed(() => {
    if (!tagAutocompleteQuery.value) {
      return availableTags.value.slice(0, 8)
    }
    const q = tagAutocompleteQuery.value.toLowerCase()
    return availableTags.value
      .filter((t) => t.toLowerCase().includes(q))
      .slice(0, 8)
  })

  // Autocomplete functions
  function detectWikilinkTrigger(view: EditorView): boolean {
    const { state } = view
    const pos = state.selection.main.head
    const text = state.doc.toString()
    
    // Check if we just typed [[
    if (pos >= 2 && text.substring(pos - 2, pos) === '[[') {
      autocompleteStartPos = pos
      autocompleteQuery.value = ''
      autocompleteSelectedIndex.value = -1
      
      // Get cursor position on screen
      const coords = view.coordsAtPos(pos)
      if (coords) {
        autocompletePosition.value = { x: coords.left, y: coords.bottom + 5 }
      }
      
      autocompleteOpen.value = true
      return true
    }
    
    // Check if we're inside [[ ... and update query
    if (autocompleteOpen.value) {
      // Find the [[ before cursor
      let searchPos = pos - 1
      let foundStart = false
      
      while (searchPos >= 0) {
        const char = text[searchPos]
        if (char === ']' && text[searchPos + 1] === ']') {
          // Found closing ]], close autocomplete
          autocompleteOpen.value = false
          return false
        }
        if (char === '[' && text[searchPos - 1] === '[') {
          foundStart = true
          autocompleteStartPos = searchPos + 1
          break
        }
        searchPos--
      }
      
      if (foundStart) {
        autocompleteQuery.value = text.substring(autocompleteStartPos, pos)
        return true
      } else {
        autocompleteOpen.value = false
      }
    }
    
    return false
  }

  // Detect tag autocomplete trigger
  async function detectTagTrigger(view: EditorView): Promise<boolean> {
    const { state } = view
    const pos = state.selection.main.head
    const text = state.doc.toString()
    
    // Check if we just typed #
    if (pos >= 1 && text[pos - 1] === '#') {
      // Make sure # is not part of a word (check character before #)
      const charBefore = pos >= 2 ? text[pos - 2] : ' '
      if (/\s/.test(charBefore) || charBefore === '\n' || pos === 1) {
        // Refresh tags before showing autocomplete
        await fetchAvailableTags()
        
        console.log('[TagAutocomplete] Detected # at pos:', pos, 'charBefore:', charBefore, 'availableTags:', availableTags.value.length)
        
        tagAutocompleteStartPos = pos
        tagAutocompleteQuery.value = ''
        tagAutocompleteSelectedIndex.value = -1
        
        // Get cursor position on screen
        const coords = view.coordsAtPos(pos)
        if (coords) {
          tagAutocompletePosition.value = { x: coords.left, y: coords.bottom + 5 }
        }
        
        console.log('[TagAutocomplete] Opening autocomplete at:', tagAutocompletePosition.value)
        tagAutocompleteOpen.value = true
        return true
      }
    }
    
    // Check if we're inside # ... and update query
    if (tagAutocompleteOpen.value) {
      // Find the # before cursor
      let searchPos = pos - 1
      let foundStart = false
      
      while (searchPos >= 0) {
        const char = text[searchPos]
        // Stop if we hit whitespace or newline
        if (/\s/.test(char) || char === '\n') {
          if (char === '#') {
            foundStart = true
            tagAutocompleteStartPos = searchPos + 1
            break
          }
          tagAutocompleteOpen.value = false
          return false
        }
        if (char === '#') {
          foundStart = true
          tagAutocompleteStartPos = searchPos + 1
          break
        }
        searchPos--
      }
      
      if (foundStart) {
        tagAutocompleteQuery.value = text.substring(tagAutocompleteStartPos, pos)
        return true
      } else {
        tagAutocompleteOpen.value = false
      }
    }
    
    return false
  }

  // Handle keyboard events when autocomplete is open
  function handleKeyDown(key: string): boolean {
    // Check tag autocomplete first
    if (tagAutocompleteOpen.value) {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(key)) {
        switch (key) {
          case 'ArrowDown':
            tagAutocompleteSelectedIndex.value = Math.min(
              tagAutocompleteSelectedIndex.value + 1,
              tagAutocompleteSuggestions.value.length - 1
            )
            break
          case 'ArrowUp':
            tagAutocompleteSelectedIndex.value = Math.max(tagAutocompleteSelectedIndex.value - 1, -1)
            break
          case 'Enter':
            if (tagAutocompleteSuggestions.value[tagAutocompleteSelectedIndex.value]) {
              handleTagAutocompleteSelect(tagAutocompleteSuggestions.value[tagAutocompleteSelectedIndex.value])
            }
            break
          case 'Escape':
            tagAutocompleteOpen.value = false
            break
        }
        return true
      }
    }
    
    // Then check wikilink autocomplete
    if (!autocompleteOpen.value) return false
    
    // Handle navigation keys when autocomplete is open
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(key)) {
      switch (key) {
        case 'ArrowDown':
          // Increment index, clamped to max
          autocompleteSelectedIndex.value = Math.min(
            autocompleteSelectedIndex.value + 1,
            autocompleteSuggestions.value.length - 1
          )
          break
        case 'ArrowUp':
          // Decrement index, clamped to -1 (no selection)
          autocompleteSelectedIndex.value = Math.max(autocompleteSelectedIndex.value - 1, -1)
          break
        case 'Enter':
          // Select the highlighted item
          if (autocompleteSuggestions.value[autocompleteSelectedIndex.value]) {
            handleAutocompleteSelect(autocompleteSuggestions.value[autocompleteSelectedIndex.value].title)
          }
          break
        case 'Escape':
          autocompleteOpen.value = false
          break
      }
      // Prevent CodeMirror from handling these keys
      return true
    }
    
    return false
  }

  function handleAutocompleteSelect(title: string) {
    if (!editorView) return
    
    const { state } = editorView
    const pos = state.selection.main.head
    
    // Insert title + ]]
    editorView.dispatch({
      changes: {
        from: autocompleteStartPos,
        to: pos,
        insert: `${title}]]`,
      },
      selection: { anchor: autocompleteStartPos + title.length + 2 },
    })
    
    autocompleteOpen.value = false
  }

  function handleTagAutocompleteSelect(tag: string) {
    if (!editorView) return
    
    const { state } = editorView
    const pos = state.selection.main.head
    
    // Insert tag (replace query)
    editorView.dispatch({
      changes: {
        from: tagAutocompleteStartPos,
        to: pos,
        insert: tag,
      },
      selection: { anchor: tagAutocompleteStartPos + tag.length },
    })
    
    tagAutocompleteOpen.value = false
  }

  // Fetch available tags from API
  async function fetchAvailableTags() {
    try {
      const tags = await window.api.tags.getAll()
      availableTags.value = tags.map((t) => t.tag)
      console.log('[TagAutocomplete] Fetched tags:', availableTags.value)
    } catch (error) {
      console.error('[MarkdownEditor] Failed to fetch tags:', error)
      availableTags.value = []
    }
  }

  // Initialize CodeMirror
  onMounted(async () => {
    if (!editorContainer.value) return

    // Initialize note titles cache for wikilinks
    await updateNoteTitlesCache()
    
    // Fetch available tags
    await fetchAvailableTags()

    const startState = EditorState.create({
      doc: props.modelValue,
      extensions: [
        markdown(),
        history(),
        listContinuation(),
        markdownKeymap(),
        wikilinks(),
        taskCheckbox(),
        keymap.of([
          {
            key: 'ArrowDown',
            run: () => handleKeyDown('ArrowDown'),
          },
          {
            key: 'ArrowUp',
            run: () => handleKeyDown('ArrowUp'),
          },
          {
            key: 'Enter',
            run: () => handleKeyDown('Enter'),
          },
          {
            key: 'Escape',
            run: () => handleKeyDown('Escape'),
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        ...bearMode(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString()
            console.log('[MarkdownEditor] Content changed, emitting update:modelValue:', newContent.substring(0, 50))
            emit('update:modelValue', newContent)
            
            // Check for autocomplete triggers
            detectWikilinkTrigger(update.view)
            detectTagTrigger(update.view)
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '15px',
            backgroundColor: 'transparent',
            fontFamily: "'Avenir Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          },
          '.cm-content': {
            padding: 'var(--editor-padding, 48px)',
            caretColor: 'var(--color-text)',
            color: 'var(--color-text)',
            maxWidth: 'var(--editor-max-width, 700px)',
            margin: '0 auto',
          },
          '.cm-line': {
            lineHeight: 'var(--editor-line-height, 1.6)',
          },
          '&.cm-focused': {
            outline: 'none',
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: "'Avenir Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          },
        }),
      ],
    })

    editorView = new EditorView({
      state: startState,
      parent: editorContainer.value,
    })

    // Exposer pour les tests E2E
    ;(window as any).__brio_editorView = editorView
    ;(window as any).__brio_updateNoteTitlesCache = updateNoteTitlesCache
    console.log('[MarkdownEditor] EditorView exposed on window:', !!(window as any).__brio_editorView)

    // Listen for wikilink clicks using DOM event delegation
    editorContainer.value.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Check if clicked element or its parent is a wikilink
      const wikilinkElement = target.closest('[data-wikilink]')
      if (wikilinkElement) {
        const title = wikilinkElement.getAttribute('data-wikilink')
        if (title) {
          console.log('[MarkdownEditor] Wikilink clicked:', title, { metaKey: event.metaKey, ctrlKey: event.ctrlKey })
          emit('wikilink-click', { title, metaKey: event.metaKey, ctrlKey: event.ctrlKey })
        }
      }
    })
  })

  // Update editor when modelValue changes externally
  watch(
    () => props.modelValue,
    (newValue) => {
      if (!editorView) return

      const currentValue = editorView.state.doc.toString()
      if (newValue !== currentValue) {
        editorView.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: newValue,
          },
        })
      }
    }
  )

  // Cleanup
  onBeforeUnmount(() => {
    editorView?.destroy()
  })
</script>

<template>
  <div class="markdown-editor-wrapper" data-testid="markdown-editor">
    <div ref="editorContainer" data-testid="codemirror-editor" class="markdown-editor" />
    <WikilinkAutocomplete
      :is-open="autocompleteOpen"
      :query="autocompleteQuery"
      :position="autocompletePosition"
      :selected-index="autocompleteSelectedIndex"
      :suggestions="autocompleteSuggestions"
      @select="handleAutocompleteSelect"
    />
    <TagAutocomplete
      :is-open="tagAutocompleteOpen"
      :query="tagAutocompleteQuery"
      :position="tagAutocompletePosition"
      :selected-index="tagAutocompleteSelectedIndex"
      :suggestions="tagAutocompleteSuggestions"
      @select="handleTagAutocompleteSelect"
    />
  </div>
</template>

<style scoped>
  .markdown-editor-wrapper {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .markdown-editor {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .markdown-editor :deep(.cm-editor) {
    height: 100%;
  }

  .markdown-editor :deep(.cm-scroller) {
    overflow: auto;
  }
</style>
