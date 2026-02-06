<script setup lang="ts">
  import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuRoot,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
  } from 'radix-vue'
  import type { DropdownMenuProps } from './types'

  defineProps<DropdownMenuProps>()
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent class="radix-dropdown-content" :side-offset="5">
        <template v-for="(item, index) in items" :key="index">
          <DropdownMenuSeparator v-if="item.separator" class="radix-dropdown-separator" />

          <DropdownMenuSub v-else-if="item.submenu">
            <DropdownMenuSubTrigger class="radix-dropdown-item">
              <span v-if="item.icon" class="radix-dropdown-icon">
                {{ item.icon }}
              </span>
              <span class="radix-dropdown-label">{{ item.label }}</span>
              <span class="radix-dropdown-submenu-indicator">›</span>
            </DropdownMenuSubTrigger>

            <DropdownMenuPortal>
              <DropdownMenuSubContent class="radix-dropdown-content" :side-offset="8">
                <DropdownMenuItem
                  v-for="(subitem, subindex) in item.submenu"
                  :key="subindex"
                  class="radix-dropdown-item"
                  :disabled="subitem.disabled"
                  @select="subitem.onSelect"
                >
                  <span v-if="subitem.icon" class="radix-dropdown-icon">
                    {{ subitem.icon }}
                  </span>
                  <span class="radix-dropdown-label">{{ subitem.label }}</span>
                  <span v-if="subitem.shortcut" class="radix-dropdown-shortcut">
                    {{ subitem.shortcut }}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem
            v-else
            class="radix-dropdown-item"
            :disabled="item.disabled"
            @select="item.onSelect"
          >
            <span v-if="item.icon" class="radix-dropdown-icon">
              {{ item.icon }}
            </span>
            <span class="radix-dropdown-label">{{ item.label }}</span>
            <span v-if="item.shortcut" class="radix-dropdown-shortcut">
              {{ item.shortcut }}
            </span>
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<style>
  /* Content */
  .radix-dropdown-content {
    min-width: 200px;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-xs);
    box-shadow: var(--shadow-md);
    z-index: 100;
    animation: slideDown 150ms ease-out;
  }

  .radix-dropdown-content:focus {
    outline: none;
  }

  /* Item */
  .radix-dropdown-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    font-size: var(--font-size-md);
    color: var(--color-text);
    border-radius: var(--radius-sm);
    cursor: pointer;
    user-select: none;
    outline: none;
    transition: background var(--transition-fast);
  }

  .radix-dropdown-item:hover,
  .radix-dropdown-item[data-highlighted] {
    background: var(--color-bg-tertiary);
  }

  .radix-dropdown-item[data-disabled] {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .radix-dropdown-item:focus-visible {
    background: var(--color-bg-tertiary);
  }

  /* Icon */
  .radix-dropdown-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    font-size: var(--font-size-lg);
  }

  /* Label */
  .radix-dropdown-label {
    flex: 1;
  }

  /* Shortcut */
  .radix-dropdown-shortcut {
    margin-left: auto;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  /* Submenu indicator */
  .radix-dropdown-submenu-indicator {
    margin-left: auto;
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
  }

  /* Separator */
  .radix-dropdown-separator {
    height: 1px;
    background: var(--color-border);
    margin: var(--space-xs) 0;
  }

  /* Animations */
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
