<script setup lang="ts">
  import { ref, watch, onMounted, onUnmounted } from 'vue'
  import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,
  } from 'radix-vue'
  import { useNotesStore } from '../../stores/notes'

  const notesStore = useNotesStore()
  const isOpen = ref(false)
  const inputText = ref('')
  const history = ref<string[]>([])
  const historyIndex = ref(-1)

  // Load history on mount
  onMounted(async () => {
    // Guard: only access window.api in Electron mode
    if (window.api?.quickCapture) {
      try {
        history.value = await window.api.quickCapture.getHistory()
      } catch (error) {
        console.error('[QuickCapture] Failed to load history:', error)
      }
    }

    // Listen for global shortcut trigger from main process (Electron only)
    if (window.ipcRenderer?.on) {
      window.ipcRenderer.on('quick-capture:toggle', () => {
        toggleModal()
      })
    }
  })

  onUnmounted(() => {
    // Guard: only remove listener in Electron mode
    if (window.ipcRenderer?.off) {
      window.ipcRenderer.off('quick-capture:toggle', toggleModal)
    }
  })

  function toggleModal() {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      inputText.value = ''
      historyIndex.value = -1
    }
  }

  async function handleSave() {
    if (!inputText.value.trim()) return

    // Guard: only save via API in Electron mode
    if (!window.api?.quickCapture) {
      console.warn('[QuickCapture] window.api not available (web mode)')
      isOpen.value = false
      inputText.value = ''
      historyIndex.value = -1
      return
    }

    try {
      await window.api.quickCapture.save(inputText.value)
      // Refresh history
      history.value = await window.api.quickCapture.getHistory()
      // Reload notes to show the updated Inbox note
      await notesStore.loadNotes()
      isOpen.value = false
      inputText.value = ''
      historyIndex.value = -1
    } catch (error) {
      console.error('[QuickCapture] Failed to save:', error)
    }
  }

  function handleCancel() {
    isOpen.value = false
    inputText.value = ''
    historyIndex.value = -1
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Cmd+Enter or Ctrl+Enter to save
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      handleSave()
      return
    }

    // Escape to cancel
    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancel()
      return
    }

    // Arrow up/down for history navigation
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (history.value.length === 0) return

      if (historyIndex.value < history.value.length - 1) {
        historyIndex.value++
        inputText.value = history.value[historyIndex.value]
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (historyIndex.value > 0) {
        historyIndex.value--
        inputText.value = history.value[historyIndex.value]
      } else if (historyIndex.value === 0) {
        historyIndex.value = -1
        inputText.value = ''
      }
    }
  }

  // Keyboard shortcut listener (Cmd+Shift+N when app is focused)
  function handleGlobalKeyDown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'N') {
      event.preventDefault()
      toggleModal()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleGlobalKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleGlobalKeyDown)
  })

  // Auto-focus input when modal opens
  const textareaRef = ref<HTMLTextAreaElement | null>(null)
  watch(isOpen, (newValue) => {
    if (newValue) {
      setTimeout(() => {
        textareaRef.value?.focus()
      }, 100)
    }
  })
</script>

<template>
  <DialogRoot v-model:open="isOpen">
    <DialogPortal>
      <DialogOverlay class="quick-capture-overlay" />
      <DialogContent data-testid="quick-capture-modal" class="quick-capture-content">
        <DialogTitle class="quick-capture-title">Quick Capture</DialogTitle>
        <DialogDescription class="quick-capture-description">
          Capture your thoughts quickly. Press Cmd+Enter to save, Escape to cancel.
        </DialogDescription>

        <textarea
          ref="textareaRef"
          v-model="inputText"
          data-testid="quick-capture-input"
          class="quick-capture-input"
          placeholder="What's on your mind?"
          rows="5"
          @keydown="handleKeyDown"
        />

        <div class="quick-capture-hint">
          <span>↑/↓ to navigate history</span>
          <span>Cmd+Enter to save</span>
        </div>

        <DialogClose class="quick-capture-close" aria-label="Close">
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
              fill="currentColor"
              fill-rule="evenodd"
              clip-rule="evenodd"
            />
          </svg>
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
  /* Overlay */
  .quick-capture-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 50;
    animation: fadeIn 150ms ease-out;
  }

  /* Content */
  .quick-capture-content {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 600px;
    max-height: 85vh;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    z-index: 51;
    box-shadow: var(--shadow-lg);
    animation: slideIn 200ms ease-out;
    overflow-y: auto;
  }

  .quick-capture-content:focus {
    outline: none;
  }

  /* Title */
  .quick-capture-title {
    margin: 0 0 var(--space-md) 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  /* Description */
  .quick-capture-description {
    margin: 0 0 var(--space-lg) 0;
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  /* Input */
  .quick-capture-input {
    width: 100%;
    padding: var(--space-md);
    font-size: var(--font-size-md);
    font-family: inherit;
    color: var(--color-text);
    background-color: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    resize: vertical;
    outline: none;
    margin-bottom: var(--space-md);
  }

  .quick-capture-input:focus {
    border-color: var(--color-primary);
  }

  /* Hint */
  .quick-capture-hint {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* Close button */
  .quick-capture-close {
    position: absolute;
    top: var(--space-lg);
    right: var(--space-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .quick-capture-close:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .quick-capture-close:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translate(-50%, -48%) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
</style>
