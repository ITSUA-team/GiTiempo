# Spec Delta

## MODIFIED Requirements

### Requirement: Existing Page Behavior Is Preserved During Query Migration

Migrating server state to TanStack Query and splitting composables MUST preserve documented user-visible behavior for the existing user and admin pages. The content-preserving refresh and bounded cache-reuse exceptions in this change apply only to Time Entries, Projects, Reports, and their changed query/mutation paths; other surfaces retain their existing behavior.

#### Scenario: Async states remain distinct

- **GIVEN** a migrated page has either no successful response or previously loaded data for its current authorized scope
- **WHEN** it loads initial data, refreshes in the background, receives a successful empty result, or encounters a request failure
- **THEN** initial loading, background refresh, empty, and retryable failure remain distinguishable
- **AND** on the selected Time Entries, Projects, and Reports surfaces, a background refresh does not replace previously loaded same-scope content with a full-page loading skeleton
- **AND** failed requests are not collapsed into empty/default data because query data is missing

#### Scenario: User feedback remains scoped

- **WHEN** a migrated read or write operation succeeds or fails
- **THEN** success and error toasts remain aligned with the existing user-visible action
- **AND** one failed action does not create duplicate page-level and local inline errors for unrelated surfaces
- **AND** this refresh optimization does not remove, suppress, reclassify, or otherwise change existing success, info, or error notification behavior

#### Scenario: Design and accessibility behavior remain unchanged

- **WHEN** a migrated feature renders its existing PrimeVue/Tailwind surface
- **THEN** the refactor does not change field order, action hierarchy, first-load skeleton shape, row/card accessibility labels, confirmation ownership, or approved design parity except for the separately specified refresh transitions
- **AND** on the selected Time Entries, Projects, and Reports surfaces, an in-place refreshing indication does not obscure existing content or remove keyboard focus solely because a request started

## ADDED Requirements

### Requirement: Refresh Preserves Authorized Page Content

The Time Entries, Projects, and Reports surfaces SHALL retain already loaded authorized content during background refresh. They SHALL preserve unaffected local interaction state and distinguish refresh failure from both an empty result and an initial-load failure.

#### Scenario: Same-scope refresh retains the page

- **GIVEN** a selected surface has loaded content for its current user and workspace
- **WHEN** a background refresh or successful mutation reconciliation begins
- **THEN** the existing content and filter controls remain mounted with an accessible busy state
- **AND** Time Entries and Projects do not insert visible refresh-status messages that shift existing content
- **AND** scroll position, keyboard focus, expansions, and valid form drafts are not reset solely by the refresh
- **AND** completed results update the affected content in place; removed or unauthorized targets no longer retain invalid interaction state

#### Scenario: Changed server filters do not mislabel previous results

- **GIVEN** a list has rendered results for a previous filter or page selection within the same authorized scope
- **WHEN** a different server-side filter or page is requested
- **THEN** the stable result region exposes `aria-busy` until the new response arrives, without inserting a visible status row
- **AND** old totals, export content, and selection-dependent actions are not presented as authoritative for the new selection
- **AND** a late response for the previous selection cannot replace results for the latest selection

#### Scenario: Refresh failure retains usable same-scope results

- **GIVEN** a surface has previously loaded authorized results
- **WHEN** its background request fails transiently
- **THEN** the existing results remain visible with a scoped retryable failure indication and existing error feedback
- **AND** the interface does not show a successful empty state or a full-page initial loading state

#### Scenario: Authorization failure overrides content retention

- **GIVEN** cached results or open dialogs exist
- **WHEN** logout, workspace/session change, revoked access, or an authoritative response makes their scope or target invalid
- **THEN** the affected content, selectors, search suggestions, and dialogs are cleared or disabled before further interaction
- **AND** retained-content behavior does not expose data from a previous or unauthorized scope

### Requirement: Selected Resources Have Bounded Cache Reuse

Selected Time Entries, Projects task lists, and Reports resources SHALL reuse same-scope cached results within an explicit finite freshness window and retain inactive results for a finite navigation window. Explicit refresh, relevant mutations, and authoritative access or timer reconciliation SHALL override cache freshness.

#### Scenario: Return within the freshness window

- **GIVEN** the same resource, filters, and authorized scope have a successful non-invalidated cached result within the configured freshness window
- **WHEN** the user leaves and returns to a selected page
- **THEN** the page renders that cached result without a first-load skeleton
- **AND** it does not request the same resource again solely because the page remounted
- **AND** required authoritative timer and visibility checks remain independent of this reuse

#### Scenario: Return with stale but retained data

- **GIVEN** same-scope cached results are past their freshness window but remain within their retention window
- **WHEN** the page is reopened
- **THEN** usable cached content is shown while one refresh sequence updates it
- **AND** a report refresh still loads every required project and pagination segment before treating the result and totals as complete

#### Scenario: Expiration or explicit refresh

- **GIVEN** cached results have expired, were invalidated, or the user explicitly requests a refresh
- **WHEN** the surface resolves its data
- **THEN** it fetches current results rather than treating freshness settings as permission to skip that refresh
- **AND** first-load skeletons are used only when no usable authorized content remains

#### Scenario: Current timer remains authoritative

- **GIVEN** a timer can be changed in another tab, workspace, or supported external client
- **WHEN** the existing timer lifecycle requires revalidation or a timer action reports a conflict
- **THEN** the current timer is reconciled with the server regardless of list-cache freshness
- **AND** stop-first behavior and the user's valid retry draft are preserved

### Requirement: Refresh Triggers Share One Request Owner

For the same authorized resource and request inputs, overlapping refresh triggers SHALL share one current refresh sequence. A completed parent-list request SHALL NOT unconditionally launch another refresh of every existing child collection. New mutations or scope changes SHALL still receive a response authoritative for the new state.

#### Scenario: Projects retry is a single refresh wave

- **GIVEN** the Projects surface has already completed its initial load
- **WHEN** the user invokes retry or explicit refresh
- **THEN** the project list and each child collection required by that refresh are requested at most once per distinct request input in that wave
- **AND** observing completion of the project request does not schedule those child requests again

#### Scenario: Focus refresh does not cascade to fresh unrelated tasks

- **GIVEN** project visibility needs revalidation while existing task collections remain fresh and their access scopes are unchanged
- **WHEN** the application regains focus
- **THEN** it revalidates the required visibility data without reloading every fresh unrelated task collection
- **AND** new, stale, invalidated, or scope-changed collections are refreshed as needed

#### Scenario: Mutation occurs during an older read

- **GIVEN** a read began before a successful mutation or scope transition
- **WHEN** reconciliation for the newer state starts
- **THEN** an older response cannot overwrite the newer result or restore invalidated access
- **AND** request deduplication does not suppress a necessary post-mutation authoritative read

#### Scenario: Timer consumers share authoritative reads

- **GIVEN** the top-bar timer and direct page timer actions are active in the same user/workspace scope
- **WHEN** a timer starts or stops successfully
- **THEN** those consumers share one post-mutation current-timer read
- **AND** idle-context resolution shares any same-wave visible-project and affected-project task read without accepting pre-mutation or invalidated access data
- **AND** unrelated project task collections are not refreshed solely by the timer action
- **AND** the direct-list stop preflight, expected-timer-id guard, authoritative focus/conflict checks, and own-time access rules remain in effect

### Requirement: Mutations Refresh Only Their Affected Resources

Task, time-entry, and timer mutations SHALL update authoritative returned data or refresh only affected resources and required dependent summaries. They SHALL preserve pagination, sorting, ownership, capabilities, and own-time visibility instead of treating every mutation as a full feature reload.

#### Scenario: Edit one task without refreshing other project tasks

- **GIVEN** Projects displays task collections for multiple projects
- **WHEN** a task in one project is edited successfully
- **THEN** the task and dependent visible labels are reconciled from the authoritative response or a targeted read
- **AND** task collections in unrelated projects are not requested solely because of that edit
- **AND** any aggregate or timer context actually affected by the edit remains correct

#### Scenario: Time-entry changes preserve scope-sensitive visibility

- **GIVEN** the user creates, moves, updates, or deletes a time entry, including through a timer action
- **WHEN** the mutation succeeds
- **THEN** affected time-entry lists, timer state, summaries, and source/destination project visibility are reconciled
- **AND** first own-time entries can reveal only server-authorized project/tasks
- **AND** deleting or moving the final own-time entry removes unauthorized project/tasks from lists, search, pickers, and open dialogs
- **AND** unrelated project task collections are not refreshed solely by a broad feature-level invalidation

#### Scenario: Pagination membership cannot be inferred safely

- **GIVEN** a mutation can change list ordering, filtered membership, or pagination boundaries
- **WHEN** its response is insufficient to reconstruct affected list results
- **THEN** the application performs a targeted authoritative refresh for those results
- **AND** it does not fabricate complete lists, summaries, or totals from a partial mutation response

### Requirement: Preset Writes Reconcile Without Reloading Report Data

Successful saved-report preset writes SHALL reconcile the visible preset collection from the authoritative write result or confirmed deletion without an unconditional follow-up collection read. Preset-only writes SHALL NOT refresh report rows or their project/member dependencies unless an explicit action changes the active report scope.

#### Scenario: Save or rename a preset

- **GIVEN** the Reports surface has loaded its workspace's presets
- **WHEN** creating, saving, or renaming a preset succeeds
- **THEN** the returned preset updates the visible collection, active preset, and dirty-state baseline as appropriate
- **AND** the write does not issue an additional preset-list or report-data read solely to rediscover the returned change
- **AND** opening a preset still applies its configuration and refreshes any changed server-side report scope

#### Scenario: Delete a preset or fail a write

- **GIVEN** a preset is visible
- **WHEN** deletion succeeds
- **THEN** it is removed locally and its active selection is cleared if necessary without resetting the current report filters or rows
- **AND** a failed write leaves the previously committed collection and report state intact with existing failure feedback

#### Scenario: Another user changes the preset collection

- **GIVEN** other authorized users can modify presets in the workspace
- **WHEN** the collection is next revalidated on page entry or explicit refresh
- **THEN** the server collection replaces stale local metadata and removes deleted active presets
- **AND** avoiding an immediate read after this user's write does not disable future collection revalidation

### Requirement: Refresh Optimizations Have Observable Regression Coverage

The selected surfaces SHALL have regression coverage for rendered-content continuity, bounded request counts, stale-response rejection, and session/access isolation. Acceptance SHALL include the real consuming pages on desktop and mobile, not only mocked transport assertions.

#### Scenario: Request and rendering behavior are tested together

- **WHEN** the selected refresh behavior is verified
- **THEN** controlled delayed-response tests assert retained rows, controls, and valid local state alongside request counts for the same inputs
- **AND** tests cover cold load, fresh/stale route return, focus, retry, filter changes, task edits, timer actions, own-time visibility loss, and refresh failures
- **AND** report pagination requests with distinct inputs are counted as required work rather than duplicate requests

#### Scenario: Cross-app real-page acceptance is recorded

- **WHEN** implementation acceptance is performed
- **THEN** user Time Entries/Projects/timer and admin Reports/presets are exercised in desktop and mobile layouts with populated, empty, delayed, and failed responses as applicable
- **AND** results record revision, environment, expected/actual behavior, and evidence or an explicit blocker
- **AND** both SPA test suites, lint, and typecheck pass while existing notification behavior remains covered
