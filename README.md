# DFSM - DataFrame Schema Manager

A Vue 3 frontend application for defining and managing DataFrame schemas using PI AF Server as the backend via PI Web API.

## Overview

DFSM allows users to create DataFrame definitions that map to PI AF Element Templates. Each DataFrame consists of named columns that can source data from PI Tags, fixed values, or formulas.

### Key Features

- **DataFrame Management**: Create, view, and delete DataFrame schemas
- **Column Definition**: Define columns with PI Tag, Fixed Value, or Formula sources
- **Tag Search**: Global tag search with Ctrl+K shortcut, debounced queries, and caching
- **Permissions**: Support for PRIVATE, PUBLIC, and SHARED access modes
- **PI AF Integration**: All data persisted to PI AF Server via PI Web API

## Tech Stack

- **Vue 3** with Composition API and `<script setup>`
- **TypeScript** with strict mode
- **Vite** for build tooling
- **PrimeVue 4** for UI components (Aura theme)
- **Pinia** for UI state management
- **TanStack Query** for server state and caching
- **ky** for HTTP client
- **Vitest** for testing

## Project Structure

```
src/
├── domain/           # Domain types and validation
├── piwebapi/         # PI Web API abstraction layer
├── services/         # Business logic
├── queries/          # TanStack Query hooks
├── stores/           # Pinia stores
├── modules/          # Decoupled feature modules
│   └── tagSearch/    # Tag search module (store, service, component)
├── pages/            # Route page components
├── ui/               # Shared UI components
└── tests/            # Test utilities and mocks
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

## Configuration

Runtime configuration is loaded from `/config/dsm.config.json`. Key settings:

```json
{
  "piWebApi": {
    "baseUrl": "/piwebapi",
    "timeoutMs": 15000
  },
  "af": {
    "root": {
      "strategy": "webId",
      "primary": { "elementWebId": "..." }
    }
  }
}
```

### PI Web API URL

- For same-origin deployment, use relative URL: `"/piwebapi"`
- For cross-origin, configure the full URL and ensure CORS is enabled on the server

## Architecture

### Module Boundaries

1. **Domain Layer** (`src/domain/`) - Pure types and validation, no external dependencies
2. **PI Web API Layer** (`src/piwebapi/`) - Only place that knows PI Web API specifics
3. **Service Layer** (`src/services/`) - Business logic, depends on domain and piwebapi
4. **Query Layer** (`src/queries/`) - TanStack Query hooks for data fetching
5. **UI Layer** (`src/pages/`, `src/ui/`) - Vue components

### Decoupled Modules

Feature modules like Tag Search are fully self-contained with their own:
- Store (Pinia)
- Service (business logic)
- Component (Vue)
- Types

Usage:
```typescript
import { useTagSearchStore, TagSearchModal } from '@/modules/tagSearch'

const tagSearch = useTagSearchStore()
tagSearch.open({
  onSelect: (tag) => console.log('Selected:', tag),
})
```

## Testing

Tests use Vitest with jsdom environment. Mocks are located in `src/tests/mocks/`.

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test --ui
```

## License

Proprietary
