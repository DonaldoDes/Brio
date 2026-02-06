<script setup lang="ts">
  import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,
    DialogTrigger,
  } from 'radix-vue'
  import { ref } from 'vue'
  import type { DialogProps } from './types'

  const props = withDefaults(defineProps<DialogProps>(), {
    open: false,
    title: null,
    description: null,
  })

  const emit = defineEmits<{
    'update:open': [value: boolean]
  }>()

  const isOpen = ref(props.open)

  const handleOpenChange = (value: boolean) => {
    isOpen.value = value
    emit('update:open', value)
  }
</script>

<template>
  <DialogRoot :open="isOpen" @update:open="handleOpenChange">
    <DialogTrigger as-child>
      <slot name="trigger" />
    </DialogTrigger>

    <DialogPortal>
      <DialogOverlay class="radix-dialog-overlay" />
      <DialogContent class="radix-dialog-content">
        <DialogTitle v-if="title || $slots.title" class="radix-dialog-title">
          <slot name="title">{{ title }}</slot>
        </DialogTitle>

        <DialogDescription
          v-if="description || $slots.description"
          class="radix-dialog-description"
        >
          <slot name="description">{{ description }}</slot>
        </DialogDescription>

        <div class="radix-dialog-body">
          <slot />
        </div>

        <div v-if="$slots.actions" class="radix-dialog-actions">
          <slot name="actions" />
        </div>

        <DialogClose class="radix-dialog-close" aria-label="Close">
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
  .radix-dialog-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 50;
    animation: fadeIn 150ms ease-out;
  }

  /* Content */
  .radix-dialog-content {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 500px;
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

  .radix-dialog-content:focus {
    outline: none;
  }

  /* Title */
  .radix-dialog-title {
    margin: 0 0 var(--space-md) 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  /* Description */
  .radix-dialog-description {
    margin: 0 0 var(--space-lg) 0;
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  /* Body */
  .radix-dialog-body {
    margin-bottom: var(--space-lg);
  }

  /* Actions */
  .radix-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-md);
    margin-top: var(--space-xl);
  }

  /* Close button */
  .radix-dialog-close {
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

  .radix-dialog-close:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text);
  }

  .radix-dialog-close:focus-visible {
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
