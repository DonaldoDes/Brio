/**
 * Auto-save composable
 *
 * Automatically saves content changes with debounce
 */

import { watch, ref, nextTick, type Ref } from 'vue'
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
): { save: () => void; saveNow: () => Promise<void>; isSaving: Ref<boolean> } {
  const notesStore = useNotesStore()
  const isSaving = ref(false)

  const saveAsync = useDebounceFn(async () => {
    if (noteId.value === null || noteId.value === '') return

    isSaving.value = true
    try {
      console.log(`[AutoSave] Saving note ${noteId.value}`)
      await notesStore.updateNote(noteId.value, { content: content.value })
      console.log(`[AutoSave] Saved note ${noteId.value}`)
      // Delay reset so the watcher sees isSaving=true
      await nextTick()
    } catch (error) {
      console.error('[AutoSave] Failed to save:', error)
    } finally {
      isSaving.value = false
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

    isSaving.value = true
    try {
      console.log(`[AutoSave] Force saving note ${noteId.value}`)
      await notesStore.updateNote(noteId.value, { content: content.value })
      console.log(`[AutoSave] Force saved note ${noteId.value}`)
      // Delay reset so the watcher sees isSaving=true
      await nextTick()
    } catch (error) {
      console.error('[AutoSave] Failed to force save:', error)
      throw error
    } finally {
      isSaving.value = false
    }
  }

  watch(content, save)

  return { save, saveNow, isSaving }
}
