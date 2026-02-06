<script setup lang="ts">
  import { onMounted, computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useTagsStore } from '../../stores/tags'
  import { useNotesStore } from '../../stores/notes'

  const tagsStore = useTagsStore()
  const notesStore = useNotesStore()
  const { tags, selectedTag, tagsTree } = storeToRefs(tagsStore)

  // Load tags on mount
  onMounted(async () => {
    await tagsStore.loadTags()
  })

  // Flatten tree for display with hierarchy
  interface FlatTag {
    tag: string
    fullPath: string
    count: number
    level: number
  }

  const flatTags = computed(() => {
    const result: FlatTag[] = []

    function traverse(node: any, level: number = 0) {
      const entries = Object.entries(node).sort(([a], [b]) => a.localeCompare(b))
      
      for (const [key, value] of entries) {
        const item = value as any
        result.push({
          tag: item.name,
          fullPath: item.fullPath,
          count: item.count,
          level,
        })
        
        if (item.children && Object.keys(item.children).length > 0) {
          traverse(item.children, level + 1)
        }
      }
    }

    traverse(tagsTree.value)
    return result
  })

  async function handleTagClick(fullPath: string) {
    if (selectedTag.value === fullPath) {
      // Deselect if clicking the same tag
      await tagsStore.clearFilter()
    } else {
      await tagsStore.selectTag(fullPath)
    }
  }

  async function clearFilter() {
    await tagsStore.clearFilter()
  }
</script>

<template>
  <div class="tag-panel" data-testid="tag-panel">
    <div class="tag-panel-header">
      <h3 class="tag-panel-title">Tags</h3>
      <button
        v-if="selectedTag"
        class="clear-filter-button"
        data-testid="clear-tag-filter-button"
        @click="clearFilter"
      >
        Clear
      </button>
    </div>

    <div v-if="selectedTag" class="tag-filter-indicator" data-testid="tag-filter-indicator">
      Filtered by: <strong>{{ selectedTag }}</strong>
    </div>

    <div class="tag-list">
      <div
        v-for="{ tag, fullPath, count, level } in flatTags"
        :key="fullPath"
        class="tag-item"
        :class="{ selected: selectedTag === fullPath }"
        :style="{ paddingLeft: `${level * 16 + 8}px` }"
        data-testid="tag-item"
        :data-tag="fullPath"
        @click="handleTagClick(fullPath)"
      >
        <span class="tag-name">{{ tag }}</span>
        <span class="tag-count">{{ count }}</span>
      </div>

      <div v-if="flatTags.length === 0" class="tag-empty">No tags yet</div>
    </div>
  </div>
</template>

<style scoped>
  .tag-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--space-md);
  }

  .tag-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
  }

  .tag-panel-title {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    margin: 0;
  }

  .clear-filter-button {
    padding: var(--space-xs) var(--space-sm);
    background-color: var(--color-bg-secondary);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .clear-filter-button:hover {
    background-color: var(--color-bg);
  }

  .tag-filter-indicator {
    padding: var(--space-sm);
    background-color: var(--color-accent);
    color: white;
    border-radius: 4px;
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-md);
  }

  .tag-list {
    flex: 1;
    overflow-y: auto;
  }

  .tag-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm);
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .tag-item:hover {
    background-color: var(--color-bg-secondary);
  }

  .tag-item.selected {
    background-color: var(--color-accent);
    color: white;
  }

  .tag-name {
    font-size: var(--font-size-sm);
    color: var(--color-text);
  }

  .tag-item.selected .tag-name {
    color: white;
  }

  .tag-count {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    background-color: var(--color-bg-secondary);
    padding: 2px 6px;
    border-radius: 10px;
  }

  .tag-item.selected .tag-count {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .tag-empty {
    padding: var(--space-md);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }
</style>
