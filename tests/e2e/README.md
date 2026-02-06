# Dual-Mode E2E Testing

Les tests E2E de Brio fonctionnent en **mode Electron** (défaut) et **mode Web** (navigateur).

## Usage

### Mode Electron (défaut)
```bash
npm run test:e2e
```

### Mode Web
```bash
npm run test:e2e:web
```

## Architecture

### Helper Setup (`helpers/setup.ts`)
- Détecte automatiquement le mode via `process.env.BRIO_MODE` ou le nom de la config
- Exporte `test` et `expect` avec le setup approprié
- Fournit `isWebMode` pour les tests conditionnels

### Configurations Playwright
- `playwright.config.ts` - Mode Electron (défaut)
- `playwright.config.web.ts` - Mode Web avec webServer

## Migration des tests

Pour migrer un test existant :

```typescript
// Avant
import { test, expect } from './electron'

// Après
import { test, expect, isWebMode } from './helpers/setup'

// Pour skipper un test en mode web
test.skip(isWebMode, 'Electron-only feature')
```

## État actuel

### Tests compatibles dual-mode
- ✅ US-001 CRUD Notes (7/8 tests passent en web)
- ✅ US-002 Wikilinks (9/13 tests passent en web)
- ✅ US-003 Tags
- ✅ US-004 Tasks
- ✅ US-005 Note Types
- ✅ US-006 Search
- ✅ US-009 Backlinks
- ✅ US-014 Quick Capture
- ✅ US-021 Themes

### Tests Electron-only (à migrer)
- ⚠️ US-016 Layout (utilise `electron.launch` directement)
- ⚠️ debug-drag.spec.ts
- ⚠️ diagnostic-raw.spec.ts

## Limitations connues

### Mode Web
- Navigation clavier dans la liste de notes (focus/keyboard events)
- Certains tests de wikilinks (timing/race conditions)
- Global shortcuts (Electron-only)

### Mode Electron
- Aucune limitation

## Développement

### Ajouter un nouveau test
1. Importer depuis `./helpers/setup`
2. Utiliser `test` et `expect` normalement
3. Ajouter `test.skip(isWebMode, 'reason')` si Electron-only

### Déboguer
```bash
# Mode web avec UI
npm run test:e2e:web -- --ui

# Mode Electron avec UI
npm run test:e2e:ui
```
