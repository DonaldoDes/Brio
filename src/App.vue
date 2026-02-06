<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import EditorLayout from './views/Editor/EditorLayout.vue'
  import QuickCaptureModal from './components/QuickCapture/QuickCaptureModal.vue'
  import { useTheme } from './composables/useTheme'

  const isReady = ref(false)
  const notesLoaded = ref(false)
  const { initialize } = useTheme()

  // Global keyboard handler for Cmd+F
  function handleGlobalKeydown(event: KeyboardEvent) {
    // Cmd+F (Mac) or Ctrl+F (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
      event.preventDefault()
      event.stopPropagation()
      
      // Focus the search input
      const searchInput = document.querySelector('[data-testid="search-input"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    }
  }

  // Watch for notes loaded state from window
  onMounted(async () => {
    console.log('[App] App.vue mounted')
    
    // Initialize theme system
    await initialize()
    
    isReady.value = true

    // Add global keyboard listener
    window.addEventListener('keydown', handleGlobalKeydown)

    // Poll for notesLoaded state
    const checkNotesLoaded = () => {
      const loaded = (window as any).__brio_notesLoaded
      console.log('[App] Checking notesLoaded:', loaded)
      if (loaded) {
        console.log('[App] Notes loaded!')
        notesLoaded.value = true
      }
    }

    const interval = window.setInterval(checkNotesLoaded, 100)

    // Cleanup after 10 seconds
    window.setTimeout(() => {
      console.log('[App] Timeout reached, clearing interval')
      window.clearInterval(interval)
    }, 10000)
  })

  onUnmounted(() => {
    // Remove global keyboard listener
    window.removeEventListener('keydown', handleGlobalKeydown)
  })
</script>

<template>
  <div id="app" :data-app-ready="isReady" :data-notes-loaded="notesLoaded">
    <EditorLayout />
    <QuickCaptureModal />
  </div>
</template>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #1a1a1a;
  }

  #app {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  /* Ensure app takes full space */
  #app > * {
    width: 100%;
    height: 100%;
  }
</style>
