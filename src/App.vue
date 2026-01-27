<script setup lang="ts">
  import EditorLayout from './views/Editor/EditorLayout.vue'
</script>

<template>
  <EditorLayout />
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
</style>
