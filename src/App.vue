<script setup lang="ts">
  import { ref, onMounted, watch } from 'vue'
  import EditorLayout from './views/Editor/EditorLayout.vue'

  const isReady = ref(false)
  const notesLoaded = ref(false)

  // Watch for notes loaded state from window
  onMounted(() => {
    console.log('[App] App.vue mounted')
    isReady.value = true
    
    // Poll for notesLoaded state
    const checkNotesLoaded = () => {
      const loaded = (window as any).__brio_notesLoaded
      console.log('[App] Checking notesLoaded:', loaded)
      if (loaded) {
        console.log('[App] Notes loaded!')
        notesLoaded.value = true
      }
    }
    
    const interval = setInterval(checkNotesLoaded, 100)
    
    // Cleanup after 10 seconds
    setTimeout(() => {
      console.log('[App] Timeout reached, clearing interval')
      clearInterval(interval)
    }, 10000)
  })
</script>

<template>
  <div 
    id="app"
    :data-app-ready="isReady"
    :data-notes-loaded="notesLoaded"
  >
    <EditorLayout />
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
