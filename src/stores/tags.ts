/**
 * Tags Store
 *
 * Manages tags state and operations via IPC
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TagWithCount } from '../../shared/types/tag'

export const useTagsStore = defineStore('tags', () => {
  // State
  const tags = ref<TagWithCount[]>([])
  const selectedTag = ref<string | null>(null)
  const selectedTags = ref<string[]>([])
  const isLoading = ref<boolean>(false)

  // Getters
  const filteredNoteIds = ref<string[]>([])
  const selectedTagsNoteIds = ref<string[]>([])

  /**
   * Build hierarchical tree from flat tags
   * Example: ['dev/frontend/vue', 'dev/backend/node'] -> creates parent nodes 'dev', 'dev/frontend', 'dev/backend'
   */
  const tagsTree = computed(() => {
    const tree: Record<string, any> = {}
    const allPaths = new Map<string, number>() // Track all paths and their counts

    // First pass: collect all paths (including parent paths)
    for (const { tag, count } of tags.value) {
      const parts = tag.split('/')
      
      // Add all parent paths
      for (let i = 0; i < parts.length; i++) {
        const fullPath = parts.slice(0, i + 1).join('/')
        
        // Only set count for the actual tag, not parent paths
        if (i === parts.length - 1) {
          allPaths.set(fullPath, count)
        } else if (!allPaths.has(fullPath)) {
          allPaths.set(fullPath, 0) // Parent path with 0 count
        }
      }
    }

    // Second pass: build tree structure
    for (const [fullPath, count] of allPaths.entries()) {
      const parts = fullPath.split('/')
      let current = tree

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const pathUpToHere = parts.slice(0, i + 1).join('/')

        if (!current[part]) {
          current[part] = {
            name: part,
            fullPath: pathUpToHere,
            count: allPaths.get(pathUpToHere) || 0,
            children: {},
          }
        }

        current = current[part].children
      }
    }

    return tree
  })

  // Actions

  /**
   * Load all tags from database
   */
  async function loadTags(): Promise<void> {
    isLoading.value = true
    try {
      tags.value = await window.api.tags.getAll()
    } catch (error) {
      console.error('[TagsStore] Failed to load tags:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Select a tag to filter notes
   */
  async function selectTag(tag: string | null): Promise<void> {
    selectedTag.value = tag

    if (tag === null) {
      filteredNoteIds.value = []
      return
    }

    try {
      filteredNoteIds.value = await window.api.tags.getNotesByTag(tag)
    } catch (error) {
      console.error('[TagsStore] Failed to get notes by tag:', error)
      filteredNoteIds.value = []
    }
  }

  /**
   * Clear tag filter
   */
  function clearFilter(): void {
    selectedTag.value = null
    filteredNoteIds.value = []
  }

  /**
   * Toggle a tag in the selectedTags array and update filtered note IDs
   */
  async function toggleTag(tag: string): Promise<void> {
    const index = selectedTags.value.indexOf(tag)
    if (index === -1) {
      selectedTags.value.push(tag)
    } else {
      selectedTags.value.splice(index, 1)
    }
    await updateSelectedTagsFilter()
  }

  /**
   * Clear all selected tags
   */
  function clearSelectedTags(): void {
    selectedTags.value = []
    selectedTagsNoteIds.value = []
  }

  /**
   * Update filtered note IDs based on selectedTags (intersection of all tags)
   */
  async function updateSelectedTagsFilter(): Promise<void> {
    if (selectedTags.value.length === 0) {
      selectedTagsNoteIds.value = []
      return
    }

    try {
      // Get note IDs for each selected tag
      const noteIdSets = await Promise.all(
        selectedTags.value.map((tag) => window.api.tags.getNotesByTag(tag))
      )

      // Intersection: notes that have ALL selected tags
      if (noteIdSets.length === 1) {
        selectedTagsNoteIds.value = noteIdSets[0]
      } else {
        const firstSet = new Set(noteIdSets[0])
        selectedTagsNoteIds.value = Array.from(firstSet).filter((noteId) =>
          noteIdSets.every((set) => set.includes(noteId))
        )
      }
    } catch (error) {
      console.error('[TagsStore] Failed to update selected tags filter:', error)
      selectedTagsNoteIds.value = []
    }
  }

  return {
    // State
    tags,
    selectedTag,
    selectedTags,
    isLoading,
    filteredNoteIds,
    selectedTagsNoteIds,

    // Getters
    tagsTree,

    // Actions
    loadTags,
    selectTag,
    clearFilter,
    toggleTag,
    clearSelectedTags,
  }
})
