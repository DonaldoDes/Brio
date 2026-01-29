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
): { save: () => void; saveNow: () => Promise<void> } {
  const notesStore = useNotesStore()

  const saveAsync = useDebounceFn(async () => {
    if (noteId.value === null || noteId.value === '') return

    try {
      console.log(`[AutoSave] Saving note ${noteId.value}`)
      await notesStore.updateNote(noteId.value, { content: content.value })
      console.log(`[AutoSave] Saved note ${noteId.value}`)
    } catch (error) {
      console.error('[AutoSave] Failed to save:', error)
    }
  }, 500)

  const save = (): void => {
    void saveAsync()
  }

  /**
   * Force immediate save without debounce
   * Useful for tests and manual save (Cmd+S)
   */
  const saveNow = async (): Promise<void> => {
    if (noteId.value === null || noteId.value === '') return

    try {
      console.log(`[AutoSave] Force saving note ${noteId.value}`)
      await notesStore.updateNote(noteId.value, { content: content.value })
      console.log(`[AutoSave] Force saved note ${noteId.value}`)
    } catch (error) {
      console.error('[AutoSave] Failed to force save:', error)
      throw error
    }
  }

  watch(content, save)

  return { save, saveNow }
}
