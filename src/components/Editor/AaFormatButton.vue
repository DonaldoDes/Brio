<script setup lang="ts">
interface Props {
  open: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggle: []
}>()

function handleClick() {
  emit('toggle')
}
</script>

<template>
  <button
    data-testid="aa-format-button"
    class="aa-button"
    :class="{ 'is-active': open }"
    :aria-label="'Toggle formatting toolbar'"
    :aria-pressed="open"
    @click="handleClick"
  >
    Aa
  </button>
</template>

<style scoped>
.aa-button {
  position: absolute;
  top: 20px;
  right: 40px;
  padding: 8px 16px;
  background: #F5F5F5;
  border: 1px solid #E0E0E0;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  color: #333333;
  cursor: pointer;
  transition: background 0.1s;
  z-index: 20; /* Above content */
}

.aa-button:hover {
  background: #E8E8E8;
}

.aa-button.is-active {
  background: #E0E0E0;
}

.aa-button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .aa-button {
    background: #2C2C2E;
    border-color: #3A3A3C;
    color: #E5E5E7;
  }

  .aa-button:hover {
    background: #3A3A3C;
  }

  .aa-button.is-active {
    background: #3A3A3C;
  }
}
</style>
