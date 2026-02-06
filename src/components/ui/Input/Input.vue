<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { InputProps } from './types'

  const props = withDefaults(defineProps<InputProps>(), {
    modelValue: '',
    type: 'text',
    placeholder: undefined,
    disabled: false,
    error: false,
    errorMessage: undefined,
    icon: undefined,
    id: undefined,
  })

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    focus: [event: FocusEvent]
    blur: [event: FocusEvent]
  }>()

  const inputRef = ref<HTMLInputElement>()
  const isFocused = ref(false)

  const classes = computed(() => {
    return [
      'radix-input-wrapper',
      {
        'radix-input-wrapper--focused': isFocused.value,
        'radix-input-wrapper--error': props.error,
        'radix-input-wrapper--disabled': props.disabled,
        'radix-input-wrapper--with-icon': props.icon,
      },
    ]
  })

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    emit('update:modelValue', target.value)
  }

  const handleFocus = (event: FocusEvent) => {
    isFocused.value = true
    emit('focus', event)
  }

  const handleBlur = (event: FocusEvent) => {
    isFocused.value = false
    emit('blur', event)
  }

  const focus = () => {
    inputRef.value?.focus()
  }

  defineExpose({ focus })
</script>

<template>
  <div class="radix-input-container">
    <div :class="classes">
      <span v-if="icon" class="radix-input-icon" aria-hidden="true">
        {{ icon }}
      </span>
      <input
        :id="id"
        ref="inputRef"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-invalid="error"
        :aria-describedby="error && errorMessage ? `${id}-error` : undefined"
        class="radix-input"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </div>
    <span v-if="error && errorMessage" :id="`${id}-error`" class="radix-input-error" role="alert">
      {{ errorMessage }}
    </span>
  </div>
</template>

<style scoped>
  .radix-input-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .radix-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .radix-input-wrapper:hover:not(.radix-input-wrapper--disabled) {
    border-color: var(--color-text-secondary);
  }

  .radix-input-wrapper--focused {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(232, 93, 76, 0.1);
  }

  .radix-input-wrapper--error {
    border-color: var(--color-error);
  }

  .radix-input-wrapper--error.radix-input-wrapper--focused {
    box-shadow: 0 0 0 3px rgba(255, 68, 68, 0.1);
  }

  .radix-input-wrapper--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .radix-input-wrapper--with-icon {
    padding-left: var(--space-lg);
  }

  .radix-input-icon {
    position: absolute;
    left: var(--space-md);
    display: flex;
    align-items: center;
    color: var(--color-text-secondary);
    font-size: var(--font-size-lg);
    pointer-events: none;
  }

  .radix-input {
    flex: 1;
    height: 36px;
    padding: 0 var(--space-md);
    background: transparent;
    border: none;
    color: var(--color-text);
    font-size: var(--font-size-md);
    font-family: inherit;
    outline: none;
  }

  .radix-input::placeholder {
    color: var(--color-text-secondary);
  }

  .radix-input:disabled {
    cursor: not-allowed;
  }

  .radix-input-wrapper--with-icon .radix-input {
    padding-left: var(--space-xl);
  }

  .radix-input-error {
    font-size: var(--font-size-sm);
    color: var(--color-error);
    padding-left: var(--space-md);
  }

  /* Search type specific styles */
  .radix-input[type='search']::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
    height: 16px;
    width: 16px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a0a0a0' stroke-width='2'%3E%3Cpath d='M18 6L6 18M6 6l12 12'/%3E%3C/svg%3E");
    background-size: 16px 16px;
    cursor: pointer;
  }
</style>
