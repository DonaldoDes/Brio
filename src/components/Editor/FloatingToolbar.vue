<script setup lang="ts">
import { Transition } from 'vue'
import { Bold, Italic, Underline, Link, Code, List } from 'lucide-vue-next'

interface Props {
  open: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  format: [type: string]
}>()

function handleFormat(type: string) {
  emit('format', type)
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="open"
      data-testid="floating-toolbar"
      class="floating-toolbar"
      role="toolbar"
      aria-label="Text formatting"
    >
      <div class="toolbar-card">
        <button
          data-testid="toolbar-bold"
          class="toolbar-button"
          aria-label="Bold"
          @click="handleFormat('bold')"
        >
          <Bold class="w-4 h-4" />
        </button>
        
        <button
          data-testid="toolbar-italic"
          class="toolbar-button"
          aria-label="Italic"
          @click="handleFormat('italic')"
        >
          <Italic class="w-4 h-4" />
        </button>
        
        <button
          data-testid="toolbar-underline"
          class="toolbar-button"
          aria-label="Underline"
          @click="handleFormat('underline')"
        >
          <Underline class="w-4 h-4" />
        </button>
        
        <div data-testid="toolbar-separator" class="toolbar-separator" />
        
        <button
          data-testid="toolbar-link"
          class="toolbar-button"
          aria-label="Link"
          @click="handleFormat('link')"
        >
          <Link class="w-4 h-4" />
        </button>
        
        <button
          data-testid="toolbar-code"
          class="toolbar-button"
          aria-label="Code"
          @click="handleFormat('code')"
        >
          <Code class="w-4 h-4" />
        </button>
        
        <button
          data-testid="toolbar-list"
          class="toolbar-button"
          aria-label="List"
          @click="handleFormat('list')"
        >
          <List class="w-4 h-4" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.floating-toolbar {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.toolbar-card {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .toolbar-card {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
  }
}

.toolbar-button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: rgb(255, 255, 255); /* white text in light mode */
  transition: background-color 150ms ease-out;
}

.toolbar-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.toolbar-button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Dark mode button colors */
@media (prefers-color-scheme: dark) {
  .toolbar-button {
    color: rgb(41, 37, 36); /* neutral-800 text in dark mode */
  }
  
  .toolbar-button:hover {
    background: rgba(0, 0, 0, 0.1);
  }
}

.toolbar-separator {
  width: 1px;
  height: 24px;
  background-color: rgba(255, 255, 255, 0.2);
  margin: auto 4px;
}

@media (prefers-color-scheme: dark) {
  .toolbar-separator {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>
