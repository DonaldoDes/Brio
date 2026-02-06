<script setup lang="ts">
import { ref } from 'vue'

// Props
interface Props {
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false
})

// Emits
const emit = defineEmits<{
  'close': []
}>()

// Methods
function handleClose() {
  emit('close')
}

function handleBackdropClick() {
  handleClose()
}
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="settings-modal-backdrop"
      @click="handleBackdropClick"
    >
      <div 
        class="settings-modal" 
        data-testid="settings-modal"
        @click.stop
      >
        <header class="modal-header">
          <h2>Settings</h2>
          <button 
            class="close-button" 
            aria-label="Close settings"
            @click="handleClose"
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        
        <div class="modal-content">
          <p>Settings content coming soon...</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.settings-modal {
  background-color: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #E5E5E5;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333333;
}

.close-button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #888888;
  cursor: pointer;
  border-radius: 6px;
  transition: all 150ms ease;
}

.close-button:hover {
  background-color: #F5F5F5;
  color: #333333;
}

.modal-content {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(80vh - 80px);
}

.modal-content p {
  margin: 0;
  color: #666666;
  font-size: 14px;
}
</style>
