# DataFrame Schema Manager (DSM)

## Status

Draft (v1.0)

## 1. Overview

The DataFrame Schema Manager (DFSM) is a UX-driven, frontend-first web application that allows users to define, manage, and share **DataFrame schemas**. A DataFrame (DF) in this system represents **only the schema** (columns, types, metadata, and data sources), not persisted data.

DSM is built as a **Vue 3** frontend and uses **PI AF Server** as the backend persistence layer, accessed exclusively through **PI Web API** via a dedicated abstraction layer.

Future modules will enable data extraction for arbitrary time ranges and intervals, returning results to the frontend as **Apache Arrow Tables**, enabling lightweight visualization and export (CSV / Parquet).

---

## 2. Core Concepts

### 2.1 DataFrame (DF)

* A DF represents a **logical schema definition**.
* No data is stored or materialized in DSM.
* A DF can later be applied to different:

  * start time / end time
  * intervals
  * execution contexts

### 2.2 Column

* A DF consists of ordered columns.
* Each column maps to a PI AF Attribute.
* Columns define **how values will be sourced** in the future (tag, formula, fixed value).

### 2.3 Metadata

* Arbitrary key-value pairs defined by the user.
* Stored as a **custom JSON attribute (string)** in PI AF.
* No enforced schema.
* Reserved keys (e.g. `_LIKE_THIS_`) are validated and protected.

---

## 3. Authentication & Identity

### 3.1 Authentication Flow

* On application load, the frontend fetches:

  * `GET /system/userinfo`
* Example response:

```json
{
  "IdentityType": "WindowsIdentity",
  "Name": "COMPANY\\USER",
  "IsAuthenticated": true,
  "SID": "S-1-5-21-..."
}
```

### 3.2 Identity Handling

* If authenticated:

  * A **User Element** is created (if not existing).
* If not authenticated:

  * User has **read-only access** to PUBLIC DataFrames.

### 3.3 User Element Naming

* Username normalization:

  * `COMPANY\\USER` → `COMPANY_USER`
  * Uppercase
* SID is stored as the **internal immutable identifier**.

---

## 4. PI AF Data Model Mapping

### 4.1 AF Database

* A dedicated AF Database is used exclusively by DSM.

### 4.2 Element Hierarchy

```
USER_ELEMENT
 ├── DF_ELEMENT_1
 │    ├── Column_1 (Attribute)
 │    ├── Column_2 (Attribute)
 │    └── ...
 ├── DF_ELEMENT_2
 │    └── ...
```

### 4.3 Mapping Rules

| DSM Concept | PI AF Object |
| ----------- | ------------ |
| User        | AF Element   |
| DataFrame   | AF Element   |
| Column      | AF Attribute |

---

## 5. DataFrame Definition

### 5.1 DataFrame Fields

| Field       | Description                | Required |
| ----------- | -------------------------- | -------- |
| name        | DataFrame name             | Yes      |
| permissions | PRIVATE / PUBLIC / SHARED  | Yes      |
| metadata    | User-defined key-value map | No       |

### 5.2 Permissions Model

* **PRIVATE**: visible only to owner
* **PUBLIC**: readable by all users, read-only
* **SHARED**: visible to selected users, optional write access

> Permission model is intentionally extensible.

### 5.3 Copying a DataFrame

* Copying creates a **full clone**:

  * schema
  * columns
  * metadata
  * tag references
* Ownership transfers to the copying user.

---

## 6. Column Definition

### 6.1 Column Fields

| Field           | Description                      | Required |
| --------------- | -------------------------------- | -------- |
| name            | Column name                      | Yes      |
| valueSourceType | PiTag / FixedValue / Formula     | Yes      |
| valueSource     | Tag name, literal, or expression | No       |
| engineeringUnit | Engineering unit                 | No       |
| valueType       | Inferred (read-only)             | No       |
| metadata        | User-defined key-value map       | No       |

### 6.2 Value Source Types

#### PiTag

* Native PI tag reference.
* Value type inferred automatically.

#### FixedValue

* Scalar only (int, float, string) for MVP.
* Future support for arrays / structs.

#### Formula

* Expression language is extensible:

  * AF Native
  * Polars
  * SQL
  * Other (future)

---

## 7. Metadata System

### 7.1 Storage

* Stored as a **single JSON string attribute** with a standardized name.

### 7.2 Validation Rules

* Reserved keys:

  * Must start and end with `_`
* App-managed keys:

  * Cannot be overwritten by user

### 7.3 UX

* Free-form key/value editor.
* No suggestions.
* No enforced schema.

---

## 8. Arrow Representation

### 8.1 Schema Serialization

* A DataFrame schema is serialized as an **Apache Arrow Schema**:

  * column names
  * column types
  * column metadata
  * dataframe metadata

### 8.2 Future Data Flow

* Data extraction modules will return:

  * Arrow Tables
* Frontend capabilities:

  * Lightweight preview
  * Export to CSV / Parquet

---

## 9. Frontend Architecture

### 9.1 Tech Stack
 
* pnpm package manager
* Vue 3
* Vite
* TypeScript
* Composition API + `<script setup>`
* PrimeVue
* Pinia (UI & local app state)
* TanStack Query + ky (server state)
* Vitest (unit tests)

### 9.2 State Management

| Concern             | Tool           |
| ------------------- | -------------- |
| UI / theme / modals | Pinia          |
| Server data         | TanStack Query |

---

## 10. PI Web API Abstraction Layer

### 10.1 Principles

* All PI Web API interaction is isolated.
* Vue components must not depend on PI Web API directly.

### 10.2 Characteristics

* Async / await
* Fully typed (TypeScript)
* Cache-aware
* Optional cache bypass per request
* Retry and progress support

---

## 11. UX Overview

### 11.1 Core User Flows

* First access → user element auto-creation
* CRUD DataFrames
* CRUD Columns
* View public DataFrames
* Copy DataFrame

### 11.2 Tag Search Engine

* Implemented as a **global modal overlay**
* Accessible from anywhere in the app
* Real-time autocomplete (per keystroke)
* Highly responsive
* Implemented as a dedicated module

---

## 12. Testing Strategy

### 12.1 Unit Tests

* Vue components
* Utility libraries
* PI Web API wrappers

### 12.2 Integration Tests

* Separate test suite
* Focused on end-to-end flows

---

## 13. Non-Goals (v1)

* Persisted datasets
* Advanced RBAC
* Audit logs
* Versioning of DataFrames
* Heavy data visualization

---

## 14. Page Flow & Navigation (v1.1)

### 14.1 Application Shell

* Single Page Application (SPA)
* Persistent top bar with:

  * Current user
  * Quick actions (New DF, Tag Search)
  * Global loading / error indicators

### 14.2 Main Routes

```
/
 ├── /my-dataframes
 │     ├── list
 │     └── :dfId
 │          ├── schema
 │          ├── columns
 │          └── metadata
 ├── /public-dataframes
 │     ├── list
 │     └── :dfId (read-only)
 └── /shared-dataframes
       ├── list
       └── :dfId (permission-based)
```

### 14.3 Core Navigation Flows

#### My DataFrames

* Default landing page after authentication
* Displays all DataFrames owned by the user
* Actions:

  * Create
  * Rename
  * Delete
  * Open

#### DataFrame Detail View

* Tab-based navigation:

  * Schema overview
  * Columns editor
  * Metadata editor

#### Public DataFrames

* Read-only list of PUBLIC DataFrames
* Actions:

  * Preview schema
  * Copy DataFrame

#### Shared DataFrames

* DataFrames shared with the user
* UI adapts based on permission level (read / write)

### 14.4 Tag Search UX Integration

* Implemented as a **global modal overlay**
* Can be opened from:

  * Column editor
  * Toolbar
  * Keyboard shortcut
* Does not affect routing state

### 14.5 State & Routing Principles

* Vue Router used only for **semantic navigation**
* Modals and wizards managed via Pinia
* Route changes never block background data loading

---

## 15. Tag Search Engine Specification (v1.2)

### 15.1 Purpose

The Tag Search Engine provides a **high‑performance, low‑latency** interface for discovering PI tags and selecting them as column data sources.

The experience must feel **instantaneous**, similar to modern command palettes or IDE symbol search.

---

### 15.2 UX Principles

* Global modal overlay (not a route)
* Opens on top of any page
* Does not reset navigation context
* Optimized for keyboard usage
* Results update on **every keystroke**

---

### 15.3 Invocation

The Tag Search modal can be opened via:

* Toolbar action
* Column editor button
* Keyboard shortcut (e.g. `Ctrl + K` / `Cmd + K`)

---

### 15.4 User Interaction Flow

1. User opens Tag Search
2. Cursor is focused on input field
3. User types search text
4. Results stream in real time
5. User selects a tag
6. Modal closes
7. Selected tag is applied to the active column

---

### 15.5 Search Behavior

* Search is **incremental**
* Each keystroke triggers a new request
* Previous in‑flight requests are cancelled
* Results are sorted by relevance

---

### 15.6 Performance Targets

| Metric              | Target   |
| ------------------- | -------- |
| Initial response    | < 150 ms |
| Keystroke to update | < 100 ms |
| Modal open time     | < 50 ms  |

---

### 15.7 Result Set

Each search result includes:

| Field           | Description                 |
| --------------- | --------------------------- |
| tagName         | Fully qualified PI tag name |
| description     | Optional description        |
| valueType       | Tag data type               |
| engineeringUnit | Engineering unit            |
| path            | AF hierarchy path           |

---

### 15.8 Pagination & Limits

* Results are limited per request (configurable)
* Infinite scroll or virtualized list
* No traditional pagination UI

---

### 15.9 PI Web API Integration

* Implemented via the PI Web API wrapper
* Dedicated TagSearch service module
* Supports:

  * async / await
  * cancellation tokens
  * retry logic

---

### 15.10 Caching Strategy

* Query cache enabled by default
* Cache key includes:

  * search text
  * user context
* Cache can be disabled explicitly
* Stale results allowed for short duration

---

### 15.11 Error Handling

* Soft failures preferred
* Network errors show non‑blocking message
* Empty state shown when no results found

---

### 15.12 Accessibility

* Fully keyboard navigable
* ARIA‑compliant modal
* Screen reader friendly

---

### 15.13 Extensibility

Future extensions may include:

* Tag metadata filters
* Favorites / recent tags
* Cross‑AF‑server search
* Semantic ranking

---

## 16. PI AF Naming Conventions & Constraints (v1.3)

### 16.1 Naming Principles

* All PI AF objects created by DSM must follow deterministic naming rules.
* Names must be:

  * Stable
  * Human-readable
  * Collision-resistant

DSM never relies on display names for identity; immutable identifiers (WebId / SID) are always used internally.

---

### 16.2 User Element Naming

| Source           | Rule                 |
| ---------------- | -------------------- |
| Windows Identity | `COMPANY\USER`       |
| Normalization    | Replace `\` with `_` |
| Case             | Uppercase            |

Example:

```
COMPANY\john.doe → COMPANY_JOHN.DOE
```

---

### 16.3 DataFrame Element Naming

* DataFrame Elements are children of the User Element.
* Naming rules:

  * Use DF logical name
  * Sanitize invalid AF characters
  * Enforce uniqueness per user

Example:

```
USER: COMPANY_JOHN.DOE
DF:  production_metrics
AF Element: PRODUCTION_METRICS
```

---

### 16.4 Column / Attribute Naming

* Column names map directly to AF Attribute names.
* Rules:

  * Case-insensitive uniqueness within DF
  * No reserved AF characters
  * Stable after creation (rename creates update operation)

---

### 16.5 Reserved Attributes

DSM reserves specific attributes for internal use:

* Metadata JSON attribute
* Internal identifiers
* Permission markers

These attributes:

* Are hidden from normal editing
* Cannot be overwritten or deleted by users

---

### 16.6 AF Constraints Awareness

DSM must respect AF system limits, including:

* Max attributes per element
* Name length limits
* Request rate limits

These limits are:

* Not redefined by DSM
* Surfaced to the user via clear error messages

---

## 17. Example Schemas & Payloads (v1.4)

### 17.1 Example DataFrame (Logical)

```json
{
  "name": "production_metrics",
  "permissions": "PUBLIC",
  "metadata": {
    "_DESCRIPTION_": "Core production KPIs",
    "domain": "manufacturing"
  }
}
```

---

### 17.2 Example Column Definitions

```json
[
  {
    "name": "timestamp",
    "valueSourceType": "PiTag",
    "valueSource": "\\PISRV01\SINUSOID",
    "engineeringUnit": "s",
    "metadata": {
      "_ROLE_": "time"
    }
  },
  {
    "name": "pressure",
    "valueSourceType": "PiTag",
    "valueSource": "\\PISRV01\CDT158",
    "engineeringUnit": "bar",
    "metadata": {
      "_AGGREGATION_": "avg"
    }
  },
  {
    "name": "setpoint",
    "valueSourceType": "FixedValue",
    "valueSource": 42,
    "metadata": {}
  }
]
```

---

### 17.3 Example Arrow Schema (Conceptual)

```text
Schema
│
├─ timestamp: timestamp[ms]
│    └─ metadata: { role: "time" }
├─ pressure: float64
│    └─ metadata: { aggregation: "avg" }
├─ setpoint: int32
└─ dataframe metadata:
     { description: "Core production KPIs" }
```

---

### 17.4 Example Tag Search Result (Normalized)

```json
{
  "id": "P1AbCDeFgHiJk",
  "name": "SINUSOID",
  "path": "\\PISRV01\SINUSOID",
  "valueType": "Float64",
  "engineeringUnit": "",
  "description": "PI System Demo Tag"
}
```

---

## 18. PI Web API Contracts (v1.5)

### 18.1 Principles

* DSM never calls PI Web API directly from Vue components.
* All interactions go through typed service wrappers.
* PI Web API responses are normalized before reaching UI or domain layers.

---

### 18.2 Core Operations

#### User Resolution

* Purpose: resolve authenticated user and ensure User Element exists
* Endpoints:

  * `GET /system/userinfo`
  * AF Element lookup by normalized username
  * AF Element creation if missing

#### DataFrame Operations

* List DataFrames (owned / public / shared)
* Create DataFrame (AF Element)
* Update DataFrame (name, permissions, metadata)
* Delete DataFrame (hard delete in v1)

#### Column Operations

* List columns (AF Attributes)
* Create column
* Update column
* Delete column

#### Tag Search Operations

* Search PI Points / AF Attributes
* Resolve tag by WebId

---

### 18.3 Error Mapping

All PI Web API errors must be mapped to a normalized shape:

```ts
export type ApiError = {
  kind: "Auth" | "NotFound" | "Validation" | "Conflict" | "RateLimit" | "Server" | "Unknown";
  message: string;
  retryable: boolean;
  status?: number;
};
```

UI components must never depend on raw HTTP status codes.

---

## 19. Frontend Module Boundaries (v1.6)

### 19.1 High-Level Structure

```
/src
 ├── api/
 │    └── piwebapi/
 ├── services/
 │    ├── dataframes/
 │    ├── columns/
 │    └── tagSearch/
 ├── stores/
 │    ├── auth.ts
 │    ├── ui.ts
 │    └── preferences.ts
 ├── views/
 │    ├── my-dataframes/
 │    ├── public-dataframes/
 │    └── shared-dataframes/
 ├── components/
 │    ├── dataframe/
 │    ├── column/
 │    └── common/
 └── ui/
      └── tagSearch/
```

---

### 19.2 Dependency Rules

* `views` may depend on:

  * `services`
  * `stores`
  * `components`

* `components` may depend on:

  * `stores`
  * `services`

* `services` may depend on:

  * `api/piwebapi`

Forbidden:

* `views` → `api/piwebapi`
* `components` → `api/piwebapi`

---

### 19.3 State Ownership

| State Type         | Owner              |
| ------------------ | ------------------ |
| Auth / user        | Pinia (auth store) |
| UI (modals, theme) | Pinia (ui store)   |
| Server data        | TanStack Query     |

---

## 20. Execution Context Model (v1.7)

### 20.1 Purpose

The Execution Context defines **how and when** a DataFrame schema is applied to retrieve data in future modules.

This model is introduced early to ensure schema compatibility and avoid redesign.

---

### 20.2 Execution Context Fields

| Field     | Description                     |
| --------- | ------------------------------- |
| startTime | Absolute or relative start time |
| endTime   | Absolute or relative end time   |
| interval  | Sampling interval               |
| timezone  | Optional timezone               |
| options   | Engine-specific options         |

---

### 20.3 Semantics

* Execution Context is:

  * Not persisted in v1
  * Passed as input to future data extraction engines

* Time formats:

  * Absolute (ISO 8601)
  * Relative (PI-style expressions)

---

### 20.4 Compatibility Rules

* All columns must be resolvable for the given context
* Missing data results in nulls, not errors
* Schema never mutates based on execution context

---

### 20.5 Future Usage

Execution Context will be used by:

* Arrow data extraction module
* Caching / materialization layers
* Scheduling and automation features

---

## 18. PI Web API Contracts (v1.5)

### 18.1 General Rules

* All PI Web API interactions must go through the **PI Web API abstraction layer**.
* DSM uses **WebId** as the primary identifier for AF objects.
* Never depend on display names for object identity.
* All requests must support:

  * cancellation (AbortController)
  * retries (with backoff)
  * progress reporting for long-running operations

---

### 18.2 Authentication & Identity

#### 18.2.1 User Info

* `GET /system/userinfo`
* Used to:

  * detect authentication
  * obtain `Name` and `SID`
  * decide read-only public mode when unauthenticated

---

### 18.3 AF Database Discovery

* DSM is bound to a dedicated AF Database.
* Discovery options (choose one per environment):

  1. Configured by **fixed WebId** (recommended)
  2. Configured by **fixed name + server**

> The wrapper must expose a single function that resolves the configured database to a WebId.

---

### 18.4 Core AF Operations (Abstracted)

> PI Web API endpoint paths vary by deployment and configuration. The DSM wrapper must implement these operations using the appropriate PI Web API resources (e.g., Asset Databases, Elements, Attributes, Points).

#### 18.4.1 User Element

* `getOrCreateUserElement(identity)`

  * Find user element by normalized name
  * If not found, create it as a child of the DSM root container
  * Persist immutable identifiers:

    * SID
    * createdAt

#### 18.4.2 DataFrames (DF Elements)

* `listMyDataFrames(userElementWebId)`
* `createDataFrame(userElementWebId, dfDefinition)`
* `updateDataFrame(dfWebId, patch)`
* `deleteDataFrame(dfWebId)`

Required behaviors:

* Create/update must be idempotent where possible.
* Delete policy:

  * v1 default: hard delete
  * future: soft delete via metadata flag

#### 18.4.3 Columns (AF Attributes)

* `listColumns(dfWebId)`
* `createColumn(dfWebId, columnDefinition)`
* `updateColumn(columnWebId, patch)`
* `deleteColumn(columnWebId)`

Required behaviors:

* Column order must be preserved.
* Attribute configuration fields are optional; only `name` is required.

---

### 18.5 Metadata Storage Contract

DSM stores user metadata as a **single JSON string attribute** with a standardized name.

* DataFrame metadata attribute (on DF Element):

  * `DSM__METADATA_JSON`
* Column metadata attribute (on Attribute):

  * `DSM__METADATA_JSON`

Rules:

* The wrapper must:

  * read/write JSON atomically
  * validate reserved key constraints (start/end with `_`)
  * block overwrite of app-managed keys

---

### 18.6 Permissions Contract

DSM permissions are stored on the DF Element as a dedicated attribute:

* `DSM__PERMISSIONS_JSON` (stringified JSON)

Example:

```json
{
  "mode": "SHARED",
  "ownerSid": "S-1-5-21-...",
  "read": ["S-1-5-21-..."],
  "write": ["S-1-5-21-..."]
}
```

Notes:

* v1 UI may only implement:

  * PRIVATE
  * PUBLIC
  * SHARED (basic)
* Enforcement must be applied in the backend boundary (AF/PI Web API access patterns + wrapper rules). The frontend must also respect permissions for UX.

---

### 18.7 Tag Search Contract

Tag search is implemented by the wrapper and returns normalized results.

Wrapper API:

* `searchTags(query, opts)`
* `getTagById(id, opts)`

Implementation guidance (PI Web API typical resources):

* PI Points search (name/path filters)
* Optional AF Search endpoint if deployed

The wrapper must normalize all results to a stable internal shape.

---

### 18.8 Error Mapping

All wrapper calls must map errors into a single typed shape:

* `Network`
* `Auth`
* `RateLimit`
* `Server`
* `Unknown`

And include:

* `retryable`
* `status` (when available)

---

## 19. Frontend Module Boundaries (v1.6)

### 19.1 Folder Structure (Recommended)

```
src/
  app/                  # app bootstrap
  router/               # Vue Router routes
  stores/               # Pinia stores (UI state only)
  queries/              # TanStack Query hooks
  services/             # domain services (tagSearch, dfService, etc.)
  piwebapi/             # PI Web API wrapper layer (only place that knows PI Web API)
  domain/               # pure TS types, invariants, schemas
  ui/                   # reusable UI components
  pages/                # route-level pages
  assets/
  tests/
```

---

### 19.2 Dependency Rules

Hard rules:

* `pages/` and `ui/` **must not** import from `piwebapi/`.
* `services/` may import from `piwebapi/` and `domain/`.
* `queries/` may import from `services/` and `domain/`.
* `stores/` (Pinia) is reserved for:

  * modals
  * local filters
  * wizard state
  * theme/preferences

TanStack Query is the source of truth for:

* server-backed DataFrames
* Columns
* Public/Shared lists

---

### 19.3 Domain Types

`domain/` must define stable types that the UI and services share:

* `DataFrameDefinition`
* `ColumnDefinition`
* `Permissions`
* `Metadata`
* `TagSearchResult`

No PI Web API raw shapes are allowed outside `piwebapi/`.

---

### 19.4 Query Keys (Conventions)

Example query keys:

* `['auth', 'userinfo']`
* `['df', 'mine']`
* `['df', 'public']`
* `['df', dfId]`
* `['df', dfId, 'columns']`
* `['tagSearch', query]`

All mutations must invalidate relevant queries.

---

### 19.5 UI Composition Rules

* Route pages assemble:

  * data hooks (TanStack Query)
  * domain services
  * UI components
* UI components are:

  * stateless when possible
  * receive data via props
  * emit events with typed payloads

---

## 20. Execution Context Model (v1.7)

> Execution Context defines *how* a DataFrame schema will be applied to retrieve data in the future. In v1, DSM stores and edits the context model, but does not execute extraction.

### 20.1 Execution Context Fields

| Field        | Description                              | Required |
| ------------ | ---------------------------------------- | -------- |
| startTime    | Start of time range                      | Yes      |
| endTime      | End of time range                        | Yes      |
| interval     | Sampling / aggregation interval          | No       |
| timeZone     | Display/execution timezone               | No       |
| mode         | Raw / Interpolated / Aggregated (future) | No       |
| limit        | Max rows/points returned (future)        | No       |
| outputFormat | Arrow (default), CSV, Parquet (future)   | No       |

Notes:

* `interval` and `mode` are placeholders for the data extraction module.

---

### 20.2 UX Placement

Execution Context is edited as a lightweight panel within DF detail pages:

* Default values are provided (configurable)
* Users can create named presets (future)

In v1:

* The context is **not persisted** as part of the DF schema unless explicitly enabled later.

---

### 20.3 Future Integration Contract

When the extraction module is introduced, it will accept:

* DF schema (Arrow Schema)
* Execution Context

And return:

* Arrow Table

The frontend will then support:

* preview
* export to CSV / Parquet
* optional lightweight charts

---

## 21. Runtime Configuration (v1.8)

DSM must be deployable to multiple environments (different web servers, PI Web API hosts, and AF databases) **without rebuilding** the frontend bundle. Environment-specific values must be provided via a runtime-loaded configuration document.

### 21.1 Config Loading

* The application loads configuration at startup from a well-known URL, e.g.:

  * `GET /config/dsm.config.json`
* If config loading fails:

  * Show a blocking error screen with diagnostics
  * Do not attempt PI Web API calls

Optional override mechanism (future):

* Support `window.__DSM_CONFIG__` injected by the hosting page.

---

### 21.2 Config Schema (JSON)

```json
{
  "version": 1,
  "piWebApi": {
    "baseUrl": "https://piwebapi.company.com/piwebapi",
    "timeoutMs": 15000,
    "retry": { "enabled": true, "maxAttempts": 3, "baseDelayMs": 200 },
    "cors": { "withCredentials": true }
  },
  "af": {
    "root": {
      "strategy": "webId",
      "primary": {
        "elementWebId": "F1AbCDeFgHiJkLmNoPqR"
      },
      "fallback": {
        "afServerName": "AFSERVER01",
        "databaseName": "DSM_DB",
        "elementPath": "\DSM_ROOT"
      }
    },
    "naming": {
      "userName": { "replaceBackslashWith": "_", "uppercase": true },
      "sanitize": { "collapseWhitespace": true, "maxNameLength": 255 }
    },
    "reservedAttributes": {
      "metadataJson": "DSM__METADATA_JSON",
      "permissionsJson": "DSM__PERMISSIONS_JSON"
    }
  },
  "features": {
    "sharedPermissions": true,
    "tagSearch": {
      "minChars": 2,
      "debounceMs": 120,
      "limit": 50,
      "virtualizeAbove": 50,
      "enableCache": true
    },
    "executionContext": {
      "enabled": true,
      "defaultTimeZone": "America/New_York"
    }
  }
}
```

Notes:

* All fields must be validated at startup.
* Unknown fields should be ignored (forward-compatible).
* `version` enables future migration.

---

### 21.3 AF Root Container Resolution

DSM must resolve a single **root element** under which all DSM-managed objects live (e.g., `DSM_ROOT`).

#### 21.3.1 Primary Strategy: WebId

* If `af.root.primary.elementWebId` is present:

  * Resolve the root element by WebId.
  * This is the most stable strategy.

#### 21.3.2 Fallback Strategy: AF Path

* If WebId resolution fails (or is not provided), resolve root using:

  * `afServerName`
  * `databaseName`
  * `elementPath` (AF path under the database)

The wrapper must:

* Resolve AF Server → Database → Root Element
* Cache the resulting WebIds for the session
* Surface a clear error if both strategies fail

---

### 21.4 Multi-Host Deployments & CORS

The config document exists specifically to allow:

* The same frontend bundle to run on multiple web servers
* Different `piWebApi.baseUrl` values per deployment

Requirements:

* `piWebApi.baseUrl` must be the only required server-specific setting.
* Additional server-specific values (timeouts, features, naming overrides) may be provided here as well.

---

## 22. Testing Strategy (v1.9)

### 22.1 Overview

DSM employs a multi-layered testing strategy to ensure reliability and correctness at different levels of integration.

---

### 22.2 Test Layers

#### 22.2.1 Unit Tests

* **Purpose**: Test individual functions, components, and domain logic in isolation
* **Environment**: Vitest with jsdom
* **Dependencies**: Uses mocks from `src/tests/mocks/`
* **Speed**: Fast (< 1 second per test suite)
* **When to run**: On every code change, pre-commit, CI pipeline

Characteristics:

* No external dependencies (no PI Web API)
* Pure domain logic testing
* Component behavior testing
* Mock-based service testing

#### 22.2.2 Contract Tests

* **Purpose**: Validate PI Web API integration against real server
* **Environment**: Vitest with Node.js + Test Proxy
* **Dependencies**: Real PI Web API server (dev/staging)
* **Speed**: Slower (API round-trips)
* **When to run**: Before merging, nightly builds, on-demand

Characteristics:

* Tests against real PI Web API
* Validates API contracts and responses
* Ensures schema compatibility
* Catches breaking changes in PI Web API

---

### 22.3 Contract Test Infrastructure

#### 22.3.1 Test Proxy Architecture

Contract tests use a local HTTP proxy server to solve authentication and CORS challenges:

```text
┌──────────────────┐
│  Contract Tests  │  (Node.js + Vitest)
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   Test Proxy     │  (localhost:3001)
│                  │  - Adds CORS headers
│                  │  - Injects authentication
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   PI Web API     │  (Real server)
│  (Dev/Staging)   │
└──────────────────┘
```

Benefits:

* Solves CORS issues without modifying production code
* Centralizes authentication injection
* Enables request/response logging for debugging
* No browser security restrictions

#### 22.3.2 Test Environment Isolation

All contract tests execute against a dedicated AF environment:

* **Dedicated AF Database**: Separate from production (e.g., `DSM_TEST_DB`)
* **Test Root Element**: All test elements created under a known root
* **Isolated Credentials**: Test user credentials stored in `.env.test` (gitignored)

Configuration via environment variables:

```bash
TEST_AF_SERVER=AFSERVER-DEV
TEST_AF_DATABASE=DSM_TEST_DB
TEST_AF_ROOT_WEBID=F1AbCDeFgHiJkLmNoPqR...
```

#### 22.3.3 Test Naming Convention

To prevent collisions and enable parallel execution, all test elements use unique names:

**Format**: `TEST_T<timestamp>_<type>_<name>_<random>`

**Example**: `TEST_T1KJH8A_DF_PRODUCTION_METRICS_X7B2`

Components:

* `TEST_`: Identifier prefix for easy recognition
* `T<timestamp>`: Base36-encoded timestamp for age tracking
* `<type>`: Element type (DF, COL, USER, etc.)
* `<name>`: Original logical name
* `<random>`: Random suffix for uniqueness

Benefits:

* **Collision-free**: Timestamp + random ensures uniqueness
* **Parallel-safe**: Multiple test runs can coexist
* **Age-trackable**: Timestamp enables cleanup of old elements
* **Identifiable**: Easy to spot test elements in AF

#### 22.3.4 Automatic Cleanup

Test elements are automatically cleaned up through multiple strategies:

1. **Per-Test Cleanup**: Elements created in a test are deleted after that test
2. **Pre-Run Cleanup**: Old test elements (>24h) are removed before test execution
3. **Post-Suite Cleanup**: Final cleanup of any remaining elements

Cleanup configuration (`.env.test`):

```bash
TEST_CLEANUP=true              # Enable cleanup
TEST_CLEANUP_HOURS=24          # Delete elements older than 24h
```

Cleanup tracking:

* Each created element is registered via `trackCreatedElement(webId)`
* Cleanup utilities maintain a registry of created elements
* Deletion occurs in reverse order (children before parents)

---

### 22.4 Test Directory Structure

```text
tests/
├── config/
│   └── test-env.ts            # Test environment configuration
├── utils/
│   ├── test-naming.ts         # Unique name generation
│   └── test-cleanup.ts        # Cleanup utilities
├── proxy/
│   ├── server.ts              # HTTP proxy server
│   └── config.ts              # Proxy configuration
└── contract/
    ├── setup.ts               # Global setup/teardown
    ├── userinfo.test.ts       # UserInfo API tests
    ├── dataframes.test.ts     # DataFrame API tests
    ├── columns.test.ts        # Column API tests
    └── tags.test.ts           # Tag search API tests
```

---

### 22.5 Security Considerations

* Test credentials stored in `.env.test` (gitignored)
* `.env.test.example` template committed (no secrets)
* Test environment completely isolated from production
* Proxy runs locally only (not exposed to network)
* Test database has restricted permissions

---

### 22.6 CI/CD Integration

Contract tests can be integrated into CI/CD pipelines:

Requirements:

* CI environment must have network access to test PI Web API
* Test credentials configured as CI secrets
* Dedicated AF test database available
* Test root element pre-created

CI configuration example:

```yaml
test:
  script:
    - pnpm install
    - pnpm test:unit
    - pnpm test:contract
  variables:
    TEST_PIWEBAPI_URL: $CI_TEST_PIWEBAPI_URL
    TEST_PIWEBAPI_USERNAME: $CI_TEST_USERNAME
    TEST_PIWEBAPI_PASSWORD: $CI_TEST_PASSWORD
```

---

### 22.7 Test Coverage Goals

* **Unit Tests**: > 80% code coverage for domain and service layers
* **Contract Tests**: 100% coverage of PI Web API wrapper functions
* **Integration Tests** (future): Key user flows end-to-end

---

## 23. Future Extensions

* Data extraction engine
* Arrow-based analytics
* Dashboarding
* Metadata versioning
* Advanced sharing and permissions
* Data lake integrations
