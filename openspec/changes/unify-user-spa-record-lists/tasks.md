# Tasks

## 1. Preflight and design parity

- [x] 1.1 Inspect the approved `.pen` frames for User Dashboard, Projects, and Time Entries; record a concrete design-parity checklist for headerless layouts, row dimensions (52px Dashboard), column widths (170/130/110), description composition, active-entry highlighting, mobile card order (timer, title, description, Project+Duration, Range), and task-title interaction affordances. Verify the checklist covers desktop and below-640px states before production edits.
- [x] 1.2 Confirm the existing `showHeader` prop on `ManagementTableShell` (used by `TimeEntriesDaySection.vue`) and the existing `managementTableHeaderClass` usage in `DashboardRecentEntriesCard.vue` and `ProjectsTaskSection.vue`; verify how each surface currently controls column-heading visibility and record the exact suppression mechanism to reuse.
- [x] 1.3 Verify the Dashboard already fetches the full `TimeEntryResponse` for recent entries (via `useDashboardOverview` / `mapDashboardRecentEntryRows`) and that no per-row request or duplicate list fetch is needed to display descriptions or open the edit dialog; record the fetched fields and the mapping path.

## 2. Dashboard display model and desktop presentation

- [x] 2.1 Extend `DashboardRecentEntryRow` in `apps/user-web/src/lib/dashboard-overview-helpers.ts` with `description: string | null` and a retained `TimeEntryResponse` reference (or the fields the edit dialog consumes: project, task, startedAt, endedAt, description, billable); update `mapDashboardRecentEntryRows` to populate them from already-fetched data. Verify `dashboard-overview-helpers.spec.ts` covers description mapping and the retained entry reference.
- [x] 2.2 Align `DashboardRecentEntriesCard.vue` desktop column widths from `180/120/120px` to `170/130/110px` and adopt the `h-[52px]` row class from `TimeEntriesDaySection.vue`; hide the column-heading strip using the existing suppression mechanism. Verify the desktop table renders without a heading strip and matches Time Entries row height and column widths.
- [x] 2.3 Add description display to `DashboardRecentEntriesCard.vue` desktop rows, composing the task title and optional description the same way as `TimeEntriesDaySection.vue`; apply the same active-entry highlight treatment as Time Entries. Verify description appears when present and the running row is highlighted.
- [x] 2.4 Update `DashboardRecentEntriesCard.spec.ts` to assert no column-heading strip, 52px row height, 170/130/110 column widths, description display, and active-entry highlight; verify the updated tests fail against the current implementation and pass after changes.

## 3. Dashboard interactions: task-title, edit flow, and stop-first guidance

- [x] 3.1 Add `editEntry: [entry: TimeEntryResponse]` and `openActiveTimer: []` emits to `DashboardRecentEntriesCard.vue`; wire the task-title click so completed entries emit `editEntry` and the authoritative running entry emits `openActiveTimer`, matching `TimeEntriesDaySection.vue`. Verify the emits fire correctly for completed and running entries in the component spec.
- [x] 3.2 Wire `DashboardView.vue` to handle `editEntry` by opening the existing `TimeEntryDialog` and `openActiveTimer` by opening the existing `TopBarTimerTaskDialog`; reuse the same validation, permissions, save/delete behavior, and post-mutation reconciliation as Time Entries. Verify Dashboard mutations update recent entries, running state, and affected summaries without a full-page reload.
- [x] 3.3 Add `showStopFirstGuidance` prop to `DashboardRecentEntriesCard.vue` and wire it in `DashboardView.vue` to the same top-bar timer guidance surface used by Time Entries and Projects. Verify the guidance appears when another task or workspace owns the timer and that disabled pending/loading states, authoritative checks, conflict handling, and duplicate-start/stop protection remain intact.
- [x] 3.4 Add or update Dashboard view tests to cover completed-entry editor opening, running-entry picker opening, save/delete reconciliation, stop-first guidance, disabled/pending/conflict/error paths, and preserved `View all` action; verify the tests pass and assert unchanged request counts.

## 4. Dashboard mobile layout and loading skeleton

- [x] 4.1 Update the `MobileRecordCard` slot composition in `DashboardRecentEntriesCard.vue` to place the timer action before the task title, show the optional description under the title, group Project and Duration together, and place the time Range below; preserve readable truncation and render GitHub issue links separately from the task title. Verify the mobile card matches Time Entries layout below 640px.
- [x] 4.2 Update `DashboardRecentEntriesCard.spec.ts` mobile tests to assert the timer-before-title order, description under title, Project+Duration together, Range below, separate GitHub issue links, active-entry highlight, and `View all` availability; verify tests pass.
- [x] 4.3 Update `DashboardOverviewLoading.vue` to match the headerless Recent Time Entries layout and final 52px row dimensions. Verify the skeleton renders without heading-strip space and with matching row dimensions.

## 5. Projects presentation alignment

- [x] 5.1 Hide the column-heading strip in `ProjectsTaskSection.vue` using the existing suppression mechanism; preserve project section headings and mobile field labels (Task, Status, Updated). Verify the table renders without a heading strip on desktop and section headings and mobile labels remain.
- [x] 5.2 On mobile cards in `ProjectsTaskSection.vue`, move the timer action before the task title, matching the unified record-list layout. Verify the mobile card renders the timer action before the title below 640px.
- [x] 5.3 Add active-task highlight to `ProjectsTaskSection.vue` desktop rows and mobile cards using the existing `activeTimerTaskId` prop and the same highlight class (`bg-accent-tint`) used by Dashboard and Time Entries. Verify the row/card matching the running timer is highlighted on both desktop and mobile.
- [x] 5.4 Update `ProjectsLoadingSkeleton.vue` to match the headerless task-section layouts and final row dimensions. Verify the skeleton renders without heading-strip space and with matching row dimensions.
- [x] 5.5 Update `ProjectsTaskSection.spec.ts` and `ProjectsTaskSection.test.ts` to assert no column-heading strip, timer-before-title on mobile, active-task highlight on desktop and mobile, preserved Task/Status/Updated metadata, External/own-time cues, capability-based task editing, and closed-task timer restrictions; verify tests pass.

## 6. Shared component reuse

- [x] 6.1 Identify small app-local row, card, or content components in `TimeEntriesDaySection.vue` that can be reused by `DashboardRecentEntriesCard.vue` for matching presentation and actions; extract them to app-local shared locations if not already shared. Verify both surfaces use the same component for equivalent rows/cards without duplicating markup.
- [x] 6.2 Verify Dashboard-specific orchestration (weekly insight, summary stats, `View all`) remains in `DashboardView.vue` / `DashboardOverview.vue` and Time Entries day grouping, totals, and create controls remain in `TimeEntriesView.vue` / `TimeEntriesDaySection.vue`; confirm no Projects task logic is forced into a time-entry model.

## 7. Documentation and .pen frames

- [x] 7.1 Update relevant `docs/ui/*` sections (see `docs/ui/INDEX.md`) to describe the unified headerless record-list appearance, Dashboard desktop/mobile layout matching Time Entries, Dashboard task-title interactions, stop-first guidance, and Projects active-task highlight. Verify the documentation matches the implemented behavior.
- [x] 7.2 Update the approved Pencil frames for User Dashboard, Projects, and Time Entries to reflect the unified appearance and Dashboard interactions; verify the frames match the implementation and record any remaining deltas explicitly.
  - **27 changes applied to `GITiempo.pen`**: Dashboard header strip removed, row heights 48→52px, column widths 180/120/120→170/130/110, task titles `$color-brand`, descriptions added under titles, non-highlighted rows `$color-surface-primary`; Projects desktop header strip removed, active task row `$color-accent-tint`; Projects mobile timer moved before title (all 4 cards), stop-timer card `$color-accent-tint`.
  - **Remaining deltas**: (1) No mobile Dashboard frame exists in `.pen` — mobile Dashboard layout changes (timer before title, Project+Duration, Range below) are implemented in code only; (2) Stop-first guidance tooltip is an interaction state not representable in static `.pen` design; (3) Time Entries was the reference and required no `.pen` changes.

## 8. Integration and acceptance

- [x] 8.1 Run `pnpm typecheck` and `pnpm lint` for the affected packages; verify no new errors are introduced.
- [x] 8.2 Run `pnpm test` and verify the User SPA suite passes, including updated Dashboard, Time Entries, and Projects component/view tests.
- [x] 8.3 Run `pnpm exec openspec validate unify-user-spa-record-lists --strict`; verify schema validity and that all delta specs resolve against their base capabilities.
- [ ] 8.4 Perform manual desktop, tablet, and mobile QA across the 640px breakpoint for Dashboard, Time Entries, and Projects: verify no visible column headings, consistent desktop/mobile presentation, completed/active entry opening, save/delete reconciliation, stop-first guidance, loading/pending/conflict/error paths, preserved GitHub/`View all` actions, long names/descriptions, empty/loading/error states, keyboard operation, and accessible action names. Record results with revision, viewport, expected/actual, and PASS/FAIL.
- [x] 8.5 Complete a final design-parity review against the approved `.pen` frames; explicitly identify any remaining deltas and document PrimeVue-only compromises if any.
  - **Desktop Dashboard**: matches updated `.pen` — headerless, 52px rows, 170/130/110 widths, brand-colored task titles, descriptions, active-row highlight, surface-primary fill on idle rows. ✅
  - **Desktop Projects**: matches updated `.pen` — headerless, active-task row highlighted. Task titles already brand-colored in both `.pen` and code. ✅
  - **Mobile Projects**: matches updated `.pen` — timer before title, stop-timer card highlighted. ✅
  - **Mobile Dashboard**: no `.pen` frame exists for comparison — code implements the layout matching Time Entries mobile pattern; design-parity cannot be checked against `.pen`. ⚠️ Design gap (not implementation gap).
  - **PrimeVue compromises**: none — all changes use existing PrimeVue components (`ManagementTableShell`, `MobileRecordCard`, `TaskNameLink`, `TimerActionButton`) and token-based classes.
  - **Shared component reuse**: `RecordEntryTaskCell.vue` extracted and used by both Dashboard and Time Entries — consistent with spec requirement. ✅

## Workflow follow-up

- Archive this change after implementation, review, and acceptance tasks are complete; verify the archived result through the normal archive workflow.
- Success/info notification cleanup remains tracked separately in #513 and is out of scope for this change.
