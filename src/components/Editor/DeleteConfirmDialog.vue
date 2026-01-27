<script setup lang="ts">
  defineProps<{
    open: boolean
    noteTitle: string
  }>()

  const emit = defineEmits<{
    confirm: []
    cancel: []
  }>()
</script>

<template>
  <div
    v-if="open"
    data-testid="delete-confirmation-dialog"
    class="dialog-overlay"
    @click.self="emit('cancel')"
  >
    <div class="dialog-content">
      <h2 class="dialog-title">Delete Note</h2>
      <p class="dialog-message">
        Are you sure you want to delete "{{ noteTitle }}"? This action cannot be undone.
      </p>

      <div class="dialog-actions">
        <button class="button button-secondary" @click="emit('cancel')">Cancel</button>
        <button
          data-testid="confirm-delete-button"
          class="button button-danger"
          @click="emit('confirm')"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
  }

  .dialog-content {
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    max-width: 400px;
    width: 90%;
    box-shadow: var(--shadow-lg);
  }

  .dialog-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    margin-bottom: var(--space-md);
  }

  .dialog-message {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    line-height: var(--line-height-normal);
    margin-bottom: var(--space-xl);
  }

  .dialog-actions {
    display: flex;
    gap: var(--space-md);
    justify-content: flex-end;
  }

  .button {
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .button-secondary {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .button-secondary:hover {
    background-color: var(--color-border-hover);
  }

  .button-danger {
    background-color: var(--color-error);
    color: white;
  }

  .button-danger:hover {
    background-color: #cc3333;
  }
</style>
