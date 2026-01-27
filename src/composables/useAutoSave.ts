/**
 * Auto-save composable
 *
 * Automatically saves content changes with debounce
 */

import { watch, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useNotesStore } from '../stores/notes'

/**
 * Auto-save note content with 500ms debounce
 *
 * @param noteId - Reactive note ID
 * @param content - Reactive content
 */
export function useAutoSave(
  noteId: Ref<string | null>,
  content: Ref<string>
): { save: () => void } {
  const notesStore = useNotesStore()

  const saveAsync = useDebounceFn(async () => {
    if (noteId.value === null || noteId.value === '') return

    try {
      await notesStore.updateNote(noteId.value, { content: content.value })
    } catch (error) {
      console.error('[AutoSave] Failed to save:', error)
    }
  }, 500)

  const save = (): void => {
    void saveAsync()
  }

  watch(content, save)

  return { save }
}
