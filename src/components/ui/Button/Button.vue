<script setup lang="ts">
  import { computed } from 'vue'
  import type { ButtonProps } from './types'

  const props = withDefaults(defineProps<ButtonProps>(), {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    type: 'button',
  })

  const emit = defineEmits<{
    click: [event: MouseEvent]
  }>()

  const classes = computed(() => {
    return [
      'radix-button',
      `radix-button--${props.variant}`,
      `radix-button--${props.size}`,
      {
        'radix-button--disabled': props.disabled,
        'radix-button--loading': props.loading,
      },
    ]
  })

  const handleClick = (event: MouseEvent) => {
    if (!props.disabled && !props.loading) {
      emit('click', event)
    }
  }
</script>

<template>
  <button
    :class="classes"
    :type="type"
    :disabled="disabled || loading"
    :aria-disabled="disabled || loading"
    :aria-busy="loading"
    @click="handleClick"
  >
    <span v-if="loading" class="radix-button__spinner" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
        />
      </svg>
    </span>
    <span :class="{ 'radix-button__content--hidden': loading }">
      <slot />
    </span>
  </button>
</template>

<style scoped>
  .radix-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
    font-family: inherit;
    white-space: nowrap;
    user-select: none;
  }

  /* Sizes */
  .radix-button--sm {
    height: 28px;
    padding: 0 var(--space-md);
    font-size: var(--font-size-sm);
    border-radius: var(--radius-sm);
  }

  .radix-button--md {
    height: 36px;
    padding: 0 var(--space-lg);
    font-size: var(--font-size-md);
    border-radius: var(--radius-md);
  }

  .radix-button--lg {
    height: 44px;
    padding: 0 var(--space-xl);
    font-size: var(--font-size-lg);
    border-radius: var(--radius-md);
  }

  /* Variants */
  .radix-button--primary {
    background: var(--color-accent);
    color: white;
  }

  .radix-button--primary:hover:not(:disabled) {
    background: var(--color-accent-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .radix-button--primary:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: none;
  }

  .radix-button--secondary {
    background: var(--color-bg-secondary);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .radix-button--secondary:hover:not(:disabled) {
    background: var(--color-bg-tertiary);
    border-color: var(--color-text-secondary);
  }

  .radix-button--ghost {
    background: transparent;
    color: var(--color-text);
  }

  .radix-button--ghost:hover:not(:disabled) {
    background: var(--color-bg-secondary);
  }

  .radix-button--danger {
    background: var(--color-error);
    color: white;
  }

  .radix-button--danger:hover:not(:disabled) {
    background: #ff5555;
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  /* States */
  .radix-button--disabled,
  .radix-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  .radix-button--loading {
    cursor: wait;
  }

  /* Spinner */
  .radix-button__spinner {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    animation: spin 1s linear infinite;
  }

  .radix-button__spinner svg {
    width: 100%;
    height: 100%;
  }

  .radix-button__content--hidden {
    visibility: hidden;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Focus styles */
  .radix-button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
</style>
