# Design

## Context

See `proposal.md` for motivation. The read-only inspection below was made on the current implementation; line numbers are discovery anchors and must be checked against the implementation revision.

Three User SPA surfaces render record lists with divergent presentation:

- **Time Entries** (`apps/user-web/src/components/time-entries/TimeEntriesDaySection.vue`) is the reference. It uses `h-[52px]` rows, column widths `170/130/110px`, a `showHeader` prop that already hides the column-heading strip, emits `editEntry` (completed) and `openActiveTimer` (running) from the task title, displays optional descriptions, and exposes a `showStopFirstGuidance` prop.
- **Dashboard** (`apps/user-web/src/components/dashboard/DashboardRecentEntriesCard.vue`) uses the default row height (48px), column widths `180/120/120px`, always renders the heading strip via `managementTableHeaderClass`, emits only `startTimer`/`stopTimer`/`viewAll`, omits descriptions, and has no stop-first guidance or task-title interaction.
- **Projects** (`apps/user-web/src/components/projects/ProjectsTaskSection.vue`) renders a column-heading strip, places the timer action beside the title on mobile, and does not highlight the active task row/card.

The Dashboard display model (`DashboardRecentEntryRow` / `DashboardRecentEntryTimer` in `apps/user-web/src/lib/dashboard-overview-helpers.ts`) currently maps only `durationLabel`, `githubIssue`, `id`, `isHighlighted`, `projectName`, `taskTitle`, `timeRangeLabel`, and a partial `timerEntry` (`endedAt`, `id`, `task.title`, `taskId`). It omits `description` and the full `TimeEntryResponse` fields needed to open the existing entry-edit dialog.

Follow `apps/user-web/AGENTS.md`, `packages/web-shared/AGENTS.md`, `docs/ui/INDEX.md`, and the relevant `docs/ui/*` sections. Inspect the approved `.pen` frames for User Dashboard, Projects, and Time Entries before production edits and derive a concrete design-parity checklist.

## Goals / Non-Goals

**Goals:** Unify Dashboard and Projects record-list presentation to Time Entries with small, focused diffs that reuse existing components, props, emits, and composables. Extend the Dashboard display model with already-fetched data only. Keep each surface's domain model intact.

**Non-Goals:** No backend, API, contract, database, authentication, or permission change. No new shared abstraction layer, new dependency, or global component refactor. No forcing of Projects tasks into a time-entry model. No success/info notification cleanup (tracked in #513). No per-row requests or duplicate list fetches for presentation.

## Decisions

### 1. Align Dashboard column widths, row height, and heading visibility to Time Entries

Change `DashboardRecentEntriesCard.vue` column definitions from `180/120/120px` to `170/130/110px` and adopt the `h-[52px]` row class from Time Entries. Hide the column-heading strip by passing the existing `showHeader: false` (or the equivalent header-suppression option) to `ManagementTableShell`, matching what Time Entries already does via its `showHeader` prop.

Alternative rejected: introducing a shared column-config constant. The widths differ by surface context and a shared constant would couple unrelated views; duplicating three numbers is simpler and lower-risk.

### 2. Extend DashboardRecentEntryRow with description and full entry reference

Add `description: string | null` to `DashboardRecentEntryRow` and include it in `mapDashboardRecentEntryRows` from the already-fetched `TimeEntryResponse.description`. To support the entry-edit flow without per-row requests, also retain the original `TimeEntryResponse` reference on the row (e.g. `entry: TimeEntryResponse`) or extend `DashboardRecentEntryTimer` with the fields the edit dialog consumes (project, task, startedAt, endedAt, description, billable). Prefer retaining the full `TimeEntryResponse` reference since the Dashboard already fetches it; the mapper does not need to duplicate every field.

Alternative rejected: re-fetching the entry when the user opens the editor. This violates the issue's "use already fetched data" constraint and adds a per-row request.

### 3. Add editEntry and openActiveTimer emits to Dashboard

Add `editEntry: [entry: TimeEntryResponse]` and `openActiveTimer: [entryId: string]` emits to `DashboardRecentEntriesCard.vue`, mirroring Time Entries. Wire the task title click: completed entries emit `editEntry` (opening the existing `TimeEntryDialog`), the running entry emits `openActiveTimer` with the clicked entry's ID. `DashboardView.vue` wires these to the same dialog and picker components already used by Time Entries, reusing validation, permissions, save/delete behavior, and post-mutation reconciliation. Before opening the global timer picker, the view verifies via `verifyActiveTimerEntry(entryId)` that the clicked entry is still the authoritative running timer; if the timer changed (for example in another session or tab), the app refreshes timer and entry state, shows an info toast, and does not open the picker.

Alternative rejected: duplicating the edit dialog inside the Dashboard card. This would diverge behavior and duplicate reconciliation logic; reusing the existing dialog keeps mutations consistent.

### 4. Add stop-first guidance to Dashboard

Pass `showStopFirstGuidance` through to `DashboardRecentEntriesCard.vue` and wire it to the same top-bar timer guidance surface that Time Entries and Projects already use. Preserve the existing disabled pending/loading states, authoritative current-state checks, conflict handling, and duplicate-start/stop protection.

### 5. Match Dashboard mobile card layout to Time Entries

Update the `MobileRecordCard` slot composition in `DashboardRecentEntriesCard.vue` to place the timer action before the task title, show the optional description under the title, group Project and Duration together, and place the time Range below. Preserve readable truncation and render GitHub issue links separately from the task title.

### 6. Projects: hide headings, timer before title on mobile, active-task highlight

Pass the existing header-suppression option to `ManagementTableShell` in `ProjectsTaskSection.vue`. On mobile cards, move the timer action before the task title. Add an active-task highlight class to the row/card whose task matches `activeTimerTaskId` (the prop already exists). Keep Task/Status/Updated metadata, External/own-time cues, capability-based task editing, and closed-task timer rules unchanged.

### 7. Reuse small app-local components where presentation matches

Extract or reuse small app-local row/card/content components from Time Entries when Dashboard presentation and actions match. Keep Dashboard-specific orchestration (weekly insight, summary stats, `View all`) in the Dashboard view and Time Entries day grouping/totals/create controls in the Time Entries view. Do not force Projects tasks into a time-entry model.

### 8. Update loading skeletons

Update `DashboardOverviewLoading.vue` and `ProjectsLoadingSkeleton.vue` to match the headerless layouts and final row dimensions (52px for Dashboard, matching Projects row height).

## Risks / Trade-offs

- [Dashboard model carries full TimeEntryResponse] → Slightly larger reactive payload per row. Mitigation: the Dashboard already fetches these entries; retaining the reference adds no request, only avoids stripping fields in the mapper.
- [Shared component reuse across Dashboard and Time Entries] → Coupling two views through one component could complicate future divergence. Mitigation: reuse only small leaf components (row/card content blocks) with stable props/emits, not the entire section orchestration.
- [Projects active-task highlight] → Visual change on an existing surface. Mitigation: use the same highlight class already used by Dashboard and Time Entries (`bg-accent-tint`); verify in design-parity review.
- [Dashboard task-title interaction change] → Users who previously could not click Dashboard task titles now can. Mitigation: this is the intended unification; verify keyboard accessibility and focus management in acceptance.
