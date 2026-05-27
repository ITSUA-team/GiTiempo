## ADDED Requirements

### Requirement: Web SPAs Use TanStack Query For Migrated Server State
The `user-web` and `admin-web` applications MUST use TanStack Vue Query as the ownership layer for frontend server-state reads and mutations migrated by this change while keeping existing API clients responsible for request transport, auth headers, payload shape, response parsing, and API error propagation. Server-state owners not listed in the proposal, design, or tasks are not implicitly migrated by this capability.

#### Scenario: Query plugin is available in both SPAs
- **WHEN** either web SPA bootstraps its Vue app
- **THEN** it installs the TanStack Vue Query plugin with an app-owned QueryClient configuration
- **AND** route, component, and composable tests that exercise Query-backed behavior provide an isolated QueryClient for the test case

#### Scenario: Query functions reuse existing client boundaries
- **WHEN** a Query-backed composable loads server data
- **THEN** its query function calls an existing app-local or shared domain client boundary
- **AND** it does not duplicate request URL construction, auth header behavior, JSON parsing, or repository error-message handling in the query composable

#### Scenario: Query cache is scoped to the authenticated session
- **WHEN** Query-backed data is cached for an authenticated request
- **THEN** the query key includes a non-secret user, workspace, or session-scope value when that value is available and affects the response
- **AND** query keys never include raw access tokens, refresh tokens, Firebase identity tokens, or other bearer credentials
- **AND** the owning SPA clears or removes affected Query cache entries when logout, failed session bootstrap, or login to a different session makes cached authenticated data unsafe to reuse

#### Scenario: Mutations reconcile server state through query cache
- **WHEN** a Query-backed state-changing mutation succeeds
- **THEN** it invalidates or updates the affected query keys through the QueryClient
- **AND** it does not rely on a separate imperative full-page reload function as the primary cache reconciliation path

#### Scenario: Non-state-changing export actions do not force invalidation
- **WHEN** a Query-backed export action such as CSV download succeeds
- **THEN** it may use a mutation/action owner for pending, error, and download handling
- **AND** it does not invalidate unrelated cached server state unless the export endpoint also changes server state

#### Scenario: Shared Query code remains leaf-only
- **WHEN** Query-related code moves to `packages/web-shared`
- **THEN** the shared code is limited to generic QueryClient/test helpers or narrow domain leaves whose behavior is proven identical across both SPAs
- **AND** app-specific route orchestration and product-specific domain query composition remain app-local or feature-local

### Requirement: Query Keys Are Stable And Scope Complete
Query-backed frontend server state MUST use typed feature-owned query-key factories that include every server-scope input that can change the response.

#### Scenario: List query key reflects filters and pagination
- **WHEN** a list surface such as time entries, visible projects/tasks, reports, or members loads data from the backend
- **THEN** the query key includes the authenticated request scope and every server-side filter, date range, pagination, sorting, or grouping input sent to that request
- **AND** changing any included input causes the affected query to resolve independently from stale cached data for another scope

#### Scenario: Single-resource query key reflects authenticated scope
- **WHEN** a single-resource surface such as workspace settings loads data from the backend
- **THEN** the query key includes the authenticated request scope and any prerequisite identifier that affects the resource
- **AND** it does not add list-only filter or pagination inputs that are not part of the request

#### Scenario: Conditional queries are explicitly gated
- **WHEN** a server request requires an access token, selected project, selected task, valid date range, or other prerequisite value
- **THEN** the query uses an explicit enabled condition or equivalent guard so it does not call the backend before the prerequisite exists
- **AND** disabled queries do not render as successful empty data for a request that was never valid to send

#### Scenario: Mutation invalidation uses key factories
- **WHEN** a create, update, delete, start, stop, or save action changes data that other surfaces consume
- **THEN** its invalidation targets are derived from the feature query-key factories
- **AND** invalidation remains narrow enough to preserve unrelated cached data for other users, workspaces, filters, or pages

### Requirement: Page Composables Are Split By Responsibility
Route-level and feature-level composables in both web SPAs MUST avoid god-composable responsibilities by composing focused modules for server data, local view state, forms, validation, formatting, dialogs, confirmation, and mutation side effects.

#### Scenario: Route page composable remains a thin aggregator
- **WHEN** a route view uses a page-level composable after this refactor
- **THEN** that composable composes focused feature modules and exposes the view model needed by the route
- **AND** it does not directly own unrelated responsibilities such as API transport, query key construction, form validation, date formatting, dialog state, and toast side effects in the same module body

#### Scenario: Local UI state stays outside Query cache
- **WHEN** a feature owns local state such as filters, dialog visibility, form drafts, field errors, selected rows, table-only discovery filters, or ticking elapsed time
- **THEN** that state is managed by a focused Vue composable or pure utility rather than stored in TanStack Query cache
- **AND** the state can be reset or validated independently of server data fetching

#### Scenario: Pure formatting and derivation are extracted
- **WHEN** date, duration, currency, grouping, or row-mapping logic is reused or mixed with server-state orchestration
- **THEN** that logic is moved to pure utility functions or focused derivation modules with direct tests
- **AND** those utilities do not invoke Vue lifecycle APIs, toasts, confirmation dialogs, or HTTP clients

### Requirement: Existing Page Behavior Is Preserved During Query Migration
Migrating server state to TanStack Query and splitting composables MUST preserve documented user-visible behavior for the existing user and admin pages.

#### Scenario: Async states remain distinct
- **WHEN** a migrated page or feature is loading initial data, background-refetching, empty after a successful request, or failed after a required request
- **THEN** it renders the same documented loading, empty, retryable request-error, and background action states as before the migration
- **AND** failed requests are not collapsed into empty/default data because query data is missing

#### Scenario: User feedback remains scoped
- **WHEN** a migrated read or write operation succeeds or fails
- **THEN** success and error toasts remain aligned with the existing user-visible action
- **AND** one failed action does not create duplicate page-level and local inline errors for unrelated surfaces

#### Scenario: Design and accessibility behavior remain unchanged
- **WHEN** a migrated feature renders its existing PrimeVue/Tailwind surface
- **THEN** the refactor does not change field order, action hierarchy, loading skeleton shape, row/card accessibility labels, confirmation ownership, or approved design parity except where separately specified

### Requirement: Refactor Coverage Protects Composable Boundaries
The migration MUST include focused tests that protect both server-state Query behavior and the new composable responsibility boundaries.

#### Scenario: Query behavior is tested at feature boundaries
- **WHEN** a feature data composable introduces query keys, enabled conditions, or mutation invalidation
- **THEN** tests cover key composition, gated request behavior, success data mapping, API error propagation, and invalidation or cache update behavior

#### Scenario: Split local-state modules are tested directly
- **WHEN** filters, dialog forms, validation, timer ticking, grouping, or formatting move into focused modules
- **THEN** those modules have direct tests for their state transitions and pure output
- **AND** route/view integration tests still cover assembled user-visible behavior for each migrated page surface

#### Scenario: Cross-app verification is required
- **WHEN** this change touches shared frontend helpers or Query test utilities consumed by both SPAs
- **THEN** both `user-web` and `admin-web` lint, typecheck, and test suites run before the change is marked complete
