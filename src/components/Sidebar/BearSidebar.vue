<script setup lang="ts">
import { ref, computed, defineComponent, h } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '../../stores/notes'
import { useTagsStore } from '../../stores/tags'
import { useTheme } from '../../composables/useTheme'
import { Settings } from 'lucide-vue-next'

// Types for TagTreeNode
interface TagNode {
  name: string
  fullPath: string
  count: number
  children: Record<string, TagNode>
}

// Recursive TagTreeNode component
const TagTreeNode: any = defineComponent({
  name: 'TagTreeNode',
  props: {
    tagNode: { type: Object as () => TagNode, required: true },
    activeTag: { type: String, default: '' },
    collapsedState: { type: Object as () => Record<string, boolean>, required: true },
    depth: { type: Number, default: 0 }
  },
  emits: ['toggle-collapse', 'tag-click'],
  setup(props, { emit }): () => any {
    const hasChildren = computed(() => {
      return props.tagNode.children && Object.keys(props.tagNode.children).length > 0
    })
    
    const isExpanded = computed(() => {
      return props.collapsedState[props.tagNode.fullPath] !== false
    })
    
    const paddingLeft = computed(() => {
      return 12 + (props.depth * 16)
    })
    
    return (): any => {
      // Parent tag item
      const parentItem = h('div', {
        class: ['tag-item', { active: props.activeTag === props.tagNode.fullPath }],
        'data-testid': `tag-item-${props.tagNode.name}`,
        tabindex: 0,
        role: 'button',
        style: { paddingLeft: `${paddingLeft.value}px`, height: '32px' },
        onClick: () => emit('tag-click', props.tagNode.fullPath)
      }, [
        // Chevron for parent tags
        hasChildren.value ? h('span', {
          class: ['tag-chevron', { expanded: isExpanded.value }],
          'data-testid': `chevron-tag-${props.tagNode.name}`,
          onClick: (e: Event) => {
            e.stopPropagation()
            emit('toggle-collapse', props.tagNode.fullPath)
          }
        }, '›') : h('span', { class: ['tag-chevron', 'hidden'] }, '›'),
        // Tag icon
        h('div', { 
          class: 'tag-icon',
          style: {
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: '0'
          }
        }, [
          h('svg', { width: '16', height: '16', viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': '1' }, [
            h('path', { d: 'M2 2h5l7 7-5 5-7-7V2z' }),
            h('circle', { cx: '5.5', cy: '5.5', r: '0.5', fill: 'currentColor' })
          ])
        ]),
        // Tag label
        h('span', { class: 'tag-label' }, props.tagNode.name),
        // Tag count
        h('span', {
          class: 'tag-count',
          'data-testid': `tag-count-${props.tagNode.name}`
        }, `${props.tagNode.count}`)
      ])
      
      // Render children recursively if expanded
      const childItems: any[] = []
      if (hasChildren.value && isExpanded.value) {
        for (const [childName, childNode] of Object.entries(props.tagNode.children)) {
          const typedChildNode = childNode as TagNode
          childItems.push(
            h(TagTreeNode, {
              key: typedChildNode.fullPath,
              tagNode: typedChildNode,
              activeTag: props.activeTag,
              collapsedState: props.collapsedState,
              depth: props.depth + 1,
              onToggleCollapse: (path: string) => emit('toggle-collapse', path),
              onTagClick: (path: string) => emit('tag-click', path)
            })
          )
        }
      }
      
      return [parentItem, ...childItems]
    }
  }
})

// Props
interface Props {
  isDark?: boolean
  activeSection?: string
  activeTag?: string
  mobileOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isDark: false,
  activeSection: 'today',
  activeTag: '',
  mobileOpen: false
})

// Emits
const emit = defineEmits<{
  'open-settings': []
  'navigate': [section: string]
  'filter-by-tag': [tag: string]
  'close-mobile': []
}>()

// Stores
const notesStore = useNotesStore()
const tagsStore = useTagsStore()
const { tagsTree } = storeToRefs(tagsStore)
const theme = useTheme()
const themeIsDark = computed(() => theme?.resolvedTheme?.value === 'dark' || props.isDark || false)
const toggleTheme = theme?.toggleTheme || (() => {})

// State
const notesExpanded = ref(true)
const tagsExpanded = ref(true)
const tagCollapsedState = ref<Record<string, boolean>>({})

// Computed
const todayCount = computed(() => {
  // Count notes from today
  const today = new Date().toISOString().split('T')[0]
  return notesStore.notes?.filter(note => 
    note.created_at?.toISOString().startsWith(today)
  ).length || 0
})

const notesCount = computed(() => notesStore.notes?.length || 0)

const projectsCount = computed(() => {
  // Count notes with type=project
  return notesStore.notes?.filter(note => 
    note.type === 'project'
  ).length || 0
})

const peopleCount = computed(() => {
  // Count notes with type=person
  return notesStore.notes?.filter(note => 
    note.type === 'person'
  ).length || 0
})

const organizationsCount = computed(() => {
  // Count notes with type=meeting (organizations not in NoteType)
  return notesStore.notes?.filter(note => 
    note.type === 'meeting'
  ).length || 0
})

const archiveCount = computed(() => {
  // Count archived notes (using deleted_at as proxy for archived)
  return notesStore.notes?.filter(note => note.deleted_at !== null).length || 0
})

const trashCount = computed(() => {
  // Count trashed notes (same as archived for now)
  return notesStore.notes?.filter(note => note.deleted_at !== null).length || 0
})

const untaggedCount = computed(() => {
  // Count notes without tags (notes that don't have # in content)
  return notesStore.notes?.filter(note => 
    note.deleted_at === null && !note.content?.includes('#')
  ).length || 0
})

// Methods
function handleThemeToggle() {
  if (toggleTheme) {
    toggleTheme()
  }
}

function handleSettingsClick() {
  emit('open-settings')
}

function handleNavigate(section: string) {
  emit('navigate', section)
}

function toggleNotesSection() {
  notesExpanded.value = !notesExpanded.value
  localStorage.setItem('brio-sidebar-notes-collapsed', String(!notesExpanded.value))
}

function toggleTagsSection() {
  tagsExpanded.value = !tagsExpanded.value
}

function toggleTagCollapse(tagName: string) {
  tagCollapsedState.value[tagName] = !tagCollapsedState.value[tagName]
}

function isTagExpanded(tagName: string): boolean {
  return tagCollapsedState.value[tagName] !== false
}

function hasChildren(tagNode: any): boolean {
  return tagNode.children && Object.keys(tagNode.children).length > 0
}

function handleTagClick(tagName: string) {
  emit('filter-by-tag', tagName)
}

function handleBackdropClick() {
  emit('close-mobile')
}

// Load collapse state from localStorage
const storedNotesCollapsed = localStorage.getItem('brio-sidebar-notes-collapsed')
if (storedNotesCollapsed === 'true') {
  notesExpanded.value = false
}
</script>

<template>
  <!-- Mobile backdrop -->
  <div 
    v-if="mobileOpen" 
    class="sidebar-backdrop" 
    data-testid="sidebar-backdrop"
    @click="handleBackdropClick"
  />
  
  <aside 
    class="bear-sidebar" 
    :class="{ 'dark-mode': themeIsDark, 'mobile-open': mobileOpen }"
    data-testid="bear-sidebar"
  >
    <!-- Header (36px) -->
    <header class="sidebar-header" data-testid="sidebar-header">
      <h1 class="logo" data-testid="sidebar-logo">Brio</h1>
      <div class="header-actions">
        <button 
          class="icon-button theme-toggle" 
          data-testid="theme-toggle"
          :aria-label="themeIsDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="handleThemeToggle"
        >
          <svg 
            v-if="!themeIsDark" 
            data-testid="icon-moon"
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="1"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <svg 
            v-else 
            data-testid="icon-sun"
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="1"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </button>
        <button 
          class="icon-button settings-button" 
          data-testid="settings-button"
          aria-label="Settings"
          @click="handleSettingsClick"
        >
          <Settings :size="18" :stroke-width="1" />
        </button>
      </div>
    </header>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <!-- Notes (collapsible) -->
      <div 
        class="nav-item" 
        :class="{ active: activeSection === 'notes' }"
        data-testid="nav-item-notes"
        tabindex="0"
        role="button"
        aria-label="Notes"
        @click="handleNavigate('notes')"
        @keydown.enter="toggleNotesSection"
      >
        <span 
          class="nav-chevron" 
          :class="{ expanded: notesExpanded }"
          data-testid="chevron-notes"
          @click.stop="toggleNotesSection"
        >›</span>
        <svg 
          class="nav-icon" 
          data-testid="icon-notes"
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="1"
        >
          <path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
          <path d="M2 5h12"/>
        </svg>
        <span class="nav-label">Notes</span>
        <span class="nav-count" data-testid="notes-count" :aria-label="`${notesCount} notes`">{{ notesCount }}</span>
      </div>

      <!-- Nested items -->
      <div 
        v-if="notesExpanded" 
        class="nested-items" 
        data-testid="nested-items"
      >
        <!-- Today -->
        <div 
          class="nav-item nested" 
          :class="{ active: activeSection === 'today' }"
          data-testid="nav-item-today-nested"
          tabindex="0"
          role="button"
          aria-label="Today"
          @click="handleNavigate('today')"
          @keydown.enter="handleNavigate('today')"
        >
          <span class="nav-chevron hidden">›</span>
          <svg 
            class="nav-icon" 
            data-testid="icon-today-nested"
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="1"
          >
            <path d="M8 2L2 6v8h4V9h4v5h4V6L8 2z"/>
          </svg>
          <span class="nav-label">Today</span>
          <span class="nav-count" data-testid="today-count-nested" :aria-label="`${todayCount} notes`">{{ todayCount }}</span>
        </div>

        <!-- Untagged -->
        <div 
          class="nav-item nested" 
          :class="{ active: activeSection === 'untagged' }"
          data-testid="nav-item-untagged"
          tabindex="0"
          role="button"
          aria-label="Untagged"
          @click="handleNavigate('untagged')"
          @keydown.enter="handleNavigate('untagged')"
        >
          <span class="nav-chevron hidden">›</span>
          <svg 
            class="nav-icon" 
            data-testid="icon-untagged"
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="1"
          >
            <path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
            <path d="M5 5h6M5 8h6M5 11h4"/>
          </svg>
          <span class="nav-label">Untagged</span>
          <span class="nav-count" data-testid="untagged-count" :aria-label="`${untaggedCount} notes`">{{ untaggedCount }}</span>
        </div>

        <!-- Archive -->
        <div 
          class="nav-item nested" 
          :class="{ active: activeSection === 'archive' }"
          data-testid="nav-item-archive-nested"
          tabindex="0"
          role="button"
          aria-label="Archive"
          @click="handleNavigate('archive')"
          @keydown.enter="handleNavigate('archive')"
        >
          <span class="nav-chevron hidden">›</span>
          <svg 
            class="nav-icon" 
            data-testid="icon-archive-nested"
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="1"
          >
            <rect x="2" y="2" width="12" height="12" rx="2"/>
            <path d="M2 6h12"/>
          </svg>
          <span class="nav-label">Archive</span>
          <span class="nav-count" data-testid="archive-count-nested" :aria-label="`${archiveCount} notes`">{{ archiveCount }}</span>
        </div>

        <!-- Trash -->
        <div 
          class="nav-item nested" 
          :class="{ active: activeSection === 'trash' }"
          data-testid="nav-item-trash-nested"
          tabindex="0"
          role="button"
          aria-label="Trash"
          @click="handleNavigate('trash')"
          @keydown.enter="handleNavigate('trash')"
        >
          <span class="nav-chevron hidden">›</span>
          <svg 
            class="nav-icon" 
            data-testid="icon-trash-nested"
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="1"
          >
            <path d="M5 2l1-1h4l1 1h3v2H2V2h3z"/>
            <path d="M3 4h10v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z"/>
          </svg>
          <span class="nav-label">Trash</span>
          <span class="nav-count" data-testid="trash-count-nested" :aria-label="`${trashCount} notes`">{{ trashCount }}</span>
        </div>
      </div>
    </nav>

    <!-- Tags Section -->
    <div class="tags-section">
      <div 
        class="tags-header" 
        data-testid="tags-header"
        @click="toggleTagsSection"
      >
        <span class="tags-header-text">Tags</span>
        <span 
          class="nav-chevron" 
          :class="{ expanded: tagsExpanded }"
          data-testid="chevron-tags"
        >›</span>
      </div>

      <div v-if="tagsExpanded" class="tags-list">
        <template v-for="(tagNode, tagName) in tagsTree" :key="tagNode.fullPath">
          <!-- Recursive tag rendering -->
          <TagTreeNode
            :tag-node="tagNode"
            :active-tag="activeTag"
            :collapsed-state="tagCollapsedState"
            :depth="0"
            @toggle-collapse="toggleTagCollapse"
            @tag-click="handleTagClick"
          />
        </template>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.bear-sidebar {
  width: 220px;
  height: 100vh;
  background-color: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow-y: auto;
  flex-shrink: 0;
  transition: background-color 200ms ease;
}

/* Header */
.sidebar-header {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  border-bottom: none;
  flex-shrink: 0;
}

.logo {
  font-size: 14px;
  font-weight: 500;
  color: #555555;
  margin: 0;
}

.dark-mode .logo {
  color: #E5E5E7;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-button {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #888888;
  cursor: pointer;
  transition: color 150ms ease;
}

.icon-button:hover {
  color: var(--icon-hover, #333333);
}

.dark-mode .icon-button {
  color: #8E8E93;
}

.dark-mode .icon-button:hover {
  color: var(--icon-hover, #E5E5E7);
}

/* Navigation */
.sidebar-nav {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.nav-item {
  height: 32px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 0;
  border-radius: 0;
  font-size: 13px;
  font-weight: 400;
  color: #555555;
  background-color: transparent;
  cursor: pointer;
  transition: background 0.1s;
  outline: none;
}

.nav-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.nav-item:focus,
.nav-item:focus-visible {
  outline: 2px solid #E85B5B;
  outline-offset: 2px;
}

.nav-item.active {
  background-color: rgba(0, 0, 0, 0.06);
  color: #000000;
  font-weight: 400;
}

.nav-item.active .nav-icon {
  color: #333333;
}

.dark-mode .nav-item {
  color: #E5E5E7;
}

.dark-mode .nav-item:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.dark-mode .nav-item.active {
  background-color: rgba(255, 255, 255, 0.1);
  color: #E5E5E7;
}

.dark-mode .nav-item.active .nav-icon {
  color: #E5E5E7;
}

.nav-item.nested {
  padding-left: 32px;
}

.nav-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  color: #888888;
  flex-shrink: 0;
}

.dark-mode .nav-icon {
  color: #8E8E93;
}

.nav-label {
  font-size: 13px;
  font-weight: 400;
  color: #555555;
  flex: 1;
}

.dark-mode .nav-label {
  color: #E5E5E7;
}

.nav-chevron {
  font-size: 10px;
  color: #CCCCCC;
  transition: transform 0.2s;
  user-select: none;
  transform: rotate(0deg);
  margin-right: 4px;
  width: 12px;
  flex-shrink: 0;
}

.nav-chevron.expanded {
  transform: rotate(90deg);
}

.nav-chevron.hidden {
  visibility: hidden;
}

.dark-mode .nav-chevron {
  color: #8E8E93;
}

.nav-count {
  font-size: 12px;
  font-weight: 400;
  color: #AAAAAA;
  margin-left: auto;
}

.dark-mode .nav-count {
  color: #8E8E93;
}

.nested-items {
  display: flex;
  flex-direction: column;
  gap: 0;
  transition: height 200ms ease;
}

/* Tags Section */
.tags-section {
  margin-top: 16px;
}

.tags-header {
  padding: 8px 12px 4px 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
}

.tags-header-text {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  font-weight: 600;
}

.dark-mode .tags-header {
  color: #8E8E93;
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tag-item {
  height: 32px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 0;
  border-radius: 0;
  font-size: 13px;
  font-weight: 400;
  color: #555555;
  background-color: transparent;
  cursor: pointer;
  transition: background 0.1s;
  outline: none;
}

.tag-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.tag-item:focus,
.tag-item:focus-visible {
  outline: 2px solid #E85B5B;
  outline-offset: 2px;
}

.tag-item.active {
  background-color: rgba(245, 158, 11, 0.1);
  color: #000000;
  font-weight: 400;
}

.tag-item.active .tag-label {
  color: #F59E0B;
  font-weight: 500;
}

.dark-mode .tag-item {
  color: #E5E5E7;
}

.dark-mode .tag-item:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.dark-mode .tag-item.active {
  background-color: rgba(245, 158, 11, 0.15);
  color: #E5E5E7;
}

.dark-mode .tag-item.active .tag-label {
  color: #F59E0B;
  font-weight: 500;
}

.tag-item.child {
  padding-left: 32px;
}

.tag-chevron {
  width: 12px;
  height: 12px;
  margin-right: 4px;
  font-size: 10px;
  color: #CCCCCC;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.dark-mode .tag-chevron {
  color: #8E8E93;
}

.tag-chevron.expanded {
  transform: rotate(90deg);
}

.tag-chevron.hidden {
  visibility: hidden;
}

.tag-icon {
  width: 16px !important;
  height: 16px !important;
  margin-right: 8px;
  flex-shrink: 0;
  color: #888888;
  display: flex !important;
  align-items: center;
  justify-content: center;
}

.tag-icon svg {
  width: 16px;
  height: 16px;
}

.dark-mode .tag-icon {
  color: #8E8E93;
}

.tag-label {
  font-size: 13px;
  font-weight: 400;
  color: #555555;
  flex: 1;
}

.dark-mode .tag-label {
  color: #E5E5E7;
}

.tag-count {
  font-size: 12px;
  font-weight: 400;
  color: #AAAAAA;
  margin-left: auto;
}

.dark-mode .tag-count {
  color: #8E8E93;
}

/* Desktop - visible by default */
.bear-sidebar {
  position: relative;
  transform: translateX(0);
  visibility: visible;
}

/* Mobile - hidden by default, visible when mobileOpen */
@media (max-width: 768px) {
  .bear-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    transform: translateX(-100%);
    visibility: hidden;
    transition: transform 250ms ease, visibility 0s 250ms;
  }

  .bear-sidebar.mobile-open {
    transform: translateX(0);
    visibility: visible;
    transition: transform 250ms ease, visibility 0s 0s;
  }
}

.sidebar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 999;
  opacity: 0.4;
}
</style>
