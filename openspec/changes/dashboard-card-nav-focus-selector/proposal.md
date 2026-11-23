# Proposal

## Why

Dashboard information cards (Today, This Week, Projects This Week, Top Focus, Recent Time Entries) are static surfaces with no path to the underlying Time Entries data. Users cannot drill from a summary to the records behind it, and the Top Focus section is locked to a hardcoded "This week" tag with no Day/Week/Month toggle. Additionally, Time Entries filters exist only in component memory — they are lost on reload, Back/Forward, or card-based deep links. This disconnect makes the Dashboard a dead end and prevents shareable, restorable filtered views.

GitHub issue: [#518](https://github.com/ITSUA-team/GiTiempo/issues/518). Milestone: M8 Quality, Security, And Production Readiness. Coordinate with #516 (unified record presentation and Dashboard entry interactions).

## What Changes

- **Dashboard card navigation**: Every Dashboard information card (Today, This Week, Projects This Week, Top Focus section, Top Project, Top Task, Recent Time Entries) becomes a navigable link to the corresponding Time Entries scope with validated URL filter state. Nested controls (timer start/stop, entry editing, GitHub issue link, period selector) remain independent and never trigger card navigation.
- **Top Focus period selector**: Replace the hardcoded `This week` PrimeVue `<Tag>` in `DashboardWeeklyFocusCard` with a PrimeVue `<Select>` offering Day, Week, and Month. Week is the default. Selecting a period updates Top Project, Top Task, tracked durations, entry counts, percentages, empty-state copy, and heading/description text — all without a page reload.
- **URL filter state for Time Entries**: Add validated URL query parameters for date range (`dateFrom`/`dateTo` as exclusive upper-bound ISO), exact `projectId`, exact `taskId`, and `page`. Filters initialize from the URL before the first list request, survive reload and Back/Forward, and stay synchronized with visible controls. Card navigation starts on page 1 and replaces unrelated prior filters.
- **Focus period URL state**: The selected Top Focus period is encoded in the Dashboard URL (`?focusPeriod=day|week|month`, default `week`) so it survives Back/Forward navigation from card destinations.
- **Consistent drill-down time semantics**: Align Dashboard card period boundaries with Time Entries destination filter boundaries so the destination explains the card's displayed value. This includes overnight entries, running timers, week/month/year boundaries, local midnight, and DST. The Dashboard currently clips durations to the selected interval while Time Entries filters by `startedAt` and shows full entry durations — the proposal defines and implements consistent selection and duration semantics so a card value matches its destination.
- **Stale-response prevention**: Period changes fetch all required pages before deriving winners/shares; loading, empty, and request-error states are shown for the newly selected period without presenting values from the previous period. Stale API responses cannot replace a newer selection.
- **Accessibility**: Card navigation is discoverable via hover and visible keyboard focus, uses semantic links with accessible destination names, supports new-tab opening (Ctrl/Cmd+click, middle-click), and the non-control area of composite cards is navigable while nested links/actions remain independent.
- **Filter revalidation**: When workspace/access changes or a referenced resource disappears, filters are revalidated — no silent "show all records" while retaining an invalid selected label.
- **Month-boundary time helpers**: Add browser-local calendar-month boundary helpers to `packages/web-shared/src/time/` alongside the existing week helpers.

## Capabilities

### New Capabilities

_None._ All changes extend existing capabilities.

### Modified Capabilities

- `user-pages`: Add requirements for Dashboard card navigation destinations, Top Focus Day/Week/Month period selector, consistent drill-down time semantics between Dashboard and Time Entries, and filter revalidation on workspace/access changes. Modify the existing "User Dashboard Overview" requirement scope to include navigable cards and period selection.
- `frontend-routing`: Add requirements for validated URL query-parameter filter state on the Time Entries route (dates, project ID, task ID, pagination) and Dashboard focus-period URL state, with hydration before the first list request and synchronization with visible controls across reload and history navigation.

## Impact

- **Layers affected**: Frontend (user-web), shared (web-shared time helpers, possibly web-shared components).
- **Contracts**: No backend contract changes expected — the existing `GET /time-entries` query parameters (`dateFrom`, `dateTo`, `projectId`, `taskId`, `page`, `limit`) already support the needed filters. If consistent time semantics analysis reveals a gap (e.g., a need for duration-based selection vs. `startedAt`-only), a contract update will be identified in the design phase.
- **Authentication**: No authentication behavior changes.
- **Affected code**:
  - `apps/user-web/src/components/dashboard/DashboardOverview.vue` — wire card navigation
  - `apps/user-web/src/components/dashboard/DashboardWeeklyFocusCard.vue` — replace Tag with Select, dynamic heading
  - `apps/user-web/src/components/dashboard/DashboardRecentEntriesCard.vue` — navigable card area
  - `apps/user-web/src/composables/dashboard/useDashboardOverview.ts` — period-aware queries, stale prevention
  - `apps/user-web/src/lib/dashboard-overview-helpers.ts` — period-window generalization, consistent duration semantics
  - `apps/user-web/src/composables/time-entries/useTimeEntryFilters.ts` — URL sync, hydration, validation
  - `apps/user-web/src/views/TimeEntriesView.vue` — URL filter initialization, control synchronization
  - `apps/user-web/src/router/index.ts` — query param handling (if needed beyond composable)
  - `packages/web-shared/src/time/index.ts` — month-boundary helpers
  - Possibly `packages/web-shared/src/components/` — shared navigable card wrapper if pattern proves stable
- **Related issues**: Coordinate with #516 (unified record presentation, Dashboard entry interactions). Notification cleanup stays in #513.
- **Testing**: Regression tests for card targets, selector defaults/transitions, paginated aggregates, empty/error/racing responses, stable IDs/renames, URL hydration, workspace/access changes, nested-control isolation. Date tests for overnight entries, running timers, week/month/year boundaries, local midnight, DST.
- **Design frames**: Update approved Pencil frames for the period selector (currently only shows a static "This week" pill). Update `docs/ui/pages-user.md` for card navigation and period selector rules.
