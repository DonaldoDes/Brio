# Brio Architecture

> Electron + Vue 3 + TypeScript + PGlite + Radix Vue

## Directory Structure

```
Brio/
├── electron/                    # Main process (Node.js)
│   ├── main/
│   │   ├── index.ts            # App entry, window management
│   │   ├── database/
│   │   │   ├── index.ts        # Database initialization
│   │   │   ├── client.ts       # PGlite client wrapper
│   │   │   └── migrations/     # SQL migrations
│   │   │       └── 001_initial.sql
│   │   ├── ipc/
│   │   │   ├── index.ts        # IPC handler registration
│   │   │   └── handlers/       # Domain-specific handlers
│   │   │       └── notes.ts
│   │   └── services/           # Main process services
│   │       └── index.ts
│   └── preload/
│       └── index.ts            # Context bridge API
│
├── src/                         # Renderer process (Vue 3)
│   ├── main.ts                 # Vue app entry
│   ├── App.vue                 # Root component
│   │
│   ├── components/             # Shared UI components
│   │   ├── ui/                 # Design system primitives
│   │   │   ├── Button/
│   │   │   │   ├── Button.vue
│   │   │   │   ├── Button.test.ts
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   ├── Dialog/
│   │   │   ├── DropdownMenu/
│   │   │   └── index.ts        # Barrel export
│   │   └── common/             # App-specific shared components
│   │       └── index.ts
│   │
│   ├── composables/            # Vue composables (hooks)
│   │   ├── useNotes.ts
│   │   ├── useEditor.ts
│   │   └── index.ts
│   │
│   ├── stores/                 # Pinia stores
│   │   ├── notes.ts
│   │   ├── editor.ts
│   │   └── index.ts
│   │
│   ├── views/                  # Page-level components
│   │   ├── Editor/
│   │   │   ├── EditorView.vue
│   │   │   ├── components/     # View-specific components
│   │   │   └── index.ts
│   │   └── Settings/
│   │       └── SettingsView.vue
│   │
│   ├── services/               # Renderer-side services
│   │   ├── api.ts              # IPC wrapper (window.api)
│   │   └── index.ts
│   │
│   ├── styles/                 # Global styles
│   │   ├── tokens.css          # Design tokens (CSS variables)
│   │   ├── reset.css           # CSS reset
│   │   └── main.css            # Global styles entry
│   │
│   └── types/                  # TypeScript types
│       ├── api.d.ts            # IPC API types
│       ├── models.ts           # Domain models
│       └── index.ts
│
├── shared/                      # Shared between main & renderer
│   ├── constants/
│   │   ├── channels.ts         # IPC channel names
│   │   └── index.ts
│   └── types/
│       ├── note.ts             # Shared domain types
│       └── index.ts
│
├── public/                      # Static assets
│   └── favicon.ico
│
└── tests/                       # E2E tests (Playwright)
    └── e2e/
        └── notes.spec.ts
```

## Layer Responsibilities

### Main Process (`electron/`)

| Directory | Responsibility |
|-----------|----------------|
| `main/index.ts` | App lifecycle, window creation |
| `main/database/` | PGlite initialization, migrations, queries |
| `main/ipc/` | IPC handler registration and routing |
| `main/services/` | Business logic (file system, OS integration) |
| `preload/` | Secure context bridge API |

### Renderer Process (`src/`)

| Directory | Responsibility |
|-----------|----------------|
| `components/ui/` | Design system primitives (Radix wrappers) |
| `components/common/` | Reusable app components |
| `composables/` | Stateful logic (Vue hooks) |
| `stores/` | Global state (Pinia) |
| `views/` | Page components with routing |
| `services/` | API calls via IPC |
| `styles/` | CSS tokens and global styles |
| `types/` | TypeScript definitions |

### Shared (`shared/`)

| Directory | Responsibility |
|-----------|----------------|
| `constants/` | IPC channels, app constants |
| `types/` | Domain models shared across processes |

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Vue component | PascalCase | `Button.vue` |
| Composable | camelCase with `use` prefix | `useNotes.ts` |
| Store | camelCase | `notes.ts` |
| Service | camelCase | `api.ts` |
| Type file | camelCase | `models.ts` |
| Test file | `*.test.ts` colocated | `Button.test.ts` |
| CSS | kebab-case | `tokens.css` |

### Directories

| Type | Convention | Example |
|------|------------|---------|
| Component folder | PascalCase | `Button/` |
| Feature folder | PascalCase | `Editor/` |
| Utility folder | kebab-case | `database/` |

### Code

| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase | `EditorView` |
| Composable | camelCase | `useNotes()` |
| Store | camelCase | `useNotesStore()` |
| IPC channel | kebab-case with domain | `notes:create` |
| CSS variable | kebab-case | `--color-accent` |
| Constant | SCREAMING_SNAKE | `IPC_CHANNELS` |

## Component Structure

### UI Component (Design System)

```
components/ui/Button/
├── Button.vue          # Component implementation
├── Button.test.ts      # Unit tests
└── index.ts            # Barrel export
```

```typescript
// index.ts
export { default as Button } from './Button.vue'
export type { ButtonProps } from './Button.vue'
```

### View Component (Feature)

```
views/Editor/
├── EditorView.vue      # Main view component
├── components/         # View-specific components
│   ├── Toolbar.vue
│   └── Sidebar.vue
└── index.ts
```

## IPC Communication

### Channel Naming

```typescript
// shared/constants/channels.ts
export const IPC_CHANNELS = {
  NOTES: {
    CREATE: 'notes:create',
    GET: 'notes:get',
    GET_ALL: 'notes:getAll',
    UPDATE: 'notes:update',
    DELETE: 'notes:delete',
  },
} as const
```

### Handler Pattern

```typescript
// electron/main/ipc/handlers/notes.ts
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../../shared/constants'

export function registerNotesHandlers(db: Database) {
  ipcMain.handle(IPC_CHANNELS.NOTES.CREATE, async (_, title, content) => {
    return db.notes.create(title, content)
  })
}
```

## Design System

### CSS Tokens

```css
/* src/styles/tokens.css */
:root {
  /* Colors */
  --color-bg: #1a1a1a;
  --color-bg-secondary: #242424;
  --color-text: #ffffff;
  --color-accent: #646cff;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  
  /* Typography */
  --font-size-sm: 12px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  
  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  
  /* Transitions */
  --transition-fast: 150ms ease;
}
```

### Radix Vue Wrapper Pattern

```vue
<!-- components/ui/Button/Button.vue -->
<script setup lang="ts">
import { computed } from 'vue'

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'md',
})
</script>

<template>
  <button :class="['btn', `btn--${variant}`, `btn--${size}`]">
    <slot />
  </button>
</template>
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process                         │
│  ┌─────────┐    ┌───────────┐    ┌─────────────────────┐   │
│  │  View   │───▶│   Store   │───▶│    Composable       │   │
│  │ (Vue)   │◀───│  (Pinia)  │◀───│   (useNotes)        │   │
│  └─────────┘    └───────────┘    └──────────┬──────────┘   │
│                                              │              │
│                                   ┌──────────▼──────────┐   │
│                                   │   Service (api.ts)  │   │
│                                   └──────────┬──────────┘   │
└──────────────────────────────────────────────┼──────────────┘
                                               │ IPC
┌──────────────────────────────────────────────┼──────────────┐
│                      Main Process            │              │
│                                   ┌──────────▼──────────┐   │
│                                   │    IPC Handlers     │   │
│                                   └──────────┬──────────┘   │
│                                              │              │
│                                   ┌──────────▼──────────┐   │
│                                   │   Database (PGlite) │   │
│                                   └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## POC Migration Plan

### Current POC Location → Target Location

| POC File | Target |
|----------|--------|
| `src/poc/pglite/index.ts` | `electron/main/database/client.ts` |
| `src/poc/pglite/pglite.test.ts` | `electron/main/database/client.test.ts` |
| `src/poc/radix/Button.vue` | `src/components/ui/Button/Button.vue` |
| `src/poc/radix/Input.vue` | `src/components/ui/Input/Input.vue` |
| `src/poc/radix/Dialog.vue` | `src/components/ui/Dialog/Dialog.vue` |
| `src/poc/radix/DropdownMenu.vue` | `src/components/ui/DropdownMenu/DropdownMenu.vue` |
| `src/poc/ipc/ipc.test.ts` | `electron/main/ipc/handlers/notes.test.ts` |
| `electron/main/ipc.ts` | `electron/main/ipc/handlers/notes.ts` |
| `src/types/api.d.ts` | `shared/types/api.ts` |

### Migration Steps

1. Create directory structure
2. Move and refactor database code
3. Move UI components with tests
4. Update imports across codebase
5. Remove `src/poc/` directory
6. Update barrel exports

## Testing Strategy

| Layer | Tool | Location |
|-------|------|----------|
| Unit (components) | Vitest + Vue Test Utils | `*.test.ts` colocated |
| Unit (services) | Vitest | `*.test.ts` colocated |
| Integration (IPC) | Vitest | `electron/main/**/*.test.ts` |
| E2E | Playwright | `tests/e2e/` |

## Build Output

```
dist-electron/
├── main/
│   └── index.js        # Main process bundle
└── preload/
    └── index.mjs       # Preload script

dist/
├── index.html          # Renderer entry
└── assets/             # Vue app bundle
```
