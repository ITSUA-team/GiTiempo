# Design

## Context

The User SPA Dashboard currently renders static information cards with no navigation path to Time Entries. The Top Focus section uses a hardcoded "This week" PrimeVue `<Tag>` with no period toggle. Time Entries filters exist entirely in component memory (`useTimeEntryFilters.ts`) with no URL sync — filters are lost on reload, Back/Forward, or deep links. Dashboard period boundaries (Monday-start local ISO week via `getDashboardWeekWindow`) and Time Entries filter boundaries (`startOfLocalDay` / `nextLocalDay` exclusive) both use browser-local calendar arithmetic, but the Dashboard clips durations to the interval while Time Entries filters by `startedAt` and shows full entry durations, creating a mismatch for overnight and boundary-crossing entries.

See `proposal.md` for motivation and scope. See `specs/user-pages/spec.md` and `specs/frontend-routing/spec.md` for behavioral requirements.

Key implementation constraints:
- PrimeVue v4 Styled Mode is the standard for all controls (per `docs/ui/INDEX.md` and `apps/user-web/AGENTS.md`).
- Shared time helpers live in `packages/web-shared/src/time/index.ts` (date-fns based).
- The API `GET /time-entries` already supports `dateFrom`, `dateTo` (exclusive `lt` on `startedAt`), `projectId`, `taskId`, `page`, `limit` — no contract changes needed for basic filter URL state.
- Dashboard aggregates are computed client-side from paginated `listOwnEntries` calls, not from a dedicated stats endpoint.
- TanStack Vue Query is used for all server state (`timeEntriesKeys`, `useRecentOwnTimeEntriesQuery`).

## Goals / Non-Goals

**Goals:**
- Make every Dashboard information card a navigable link to the correct Time Entries scope with validated URL filter state.
- Replace the static "This week" tag with a PrimeVue `<Select>` offering Day/Week/Month, defaulting to Week.
- Add URL query-parameter sync for Time Entries filters and Dashboard focus period, with hydration before the first list request.
- Align Dashboard card period boundaries with Time Entries destination filter boundaries for consistent drill-down semantics.
- Handle loading/empty/error/stale-response states for period changes.
- Ensure nested controls (timer, edit, GitHub link, period selector) never trigger card navigation.
- Add browser-local calendar-month boundary helpers to shared time utilities.

**Non-Goals:**
- A dedicated Projects page filtered by tracked activity (separate feature per issue #518).
- Backend contract changes for new filter parameters (existing parameters suffice).
- Admin SPA changes (this change is user-web only, unless shared package changes require admin verification).
- Notification cleanup (stays in #513).
- Unified record presentation changes (coordinate with #516 but do not implement #516's scope here).

## Decisions

### 1. Period window generalization in shared time helpers

**Decision:** Add `startOfLocalMonth`, `nextLocalMonthStart`, and `getLocalMonthRange` to `packages/web-shared/src/time/index.ts` alongside the existing `startOfLocalIsoWeek` and week helpers. Add a unified `getDashboardPeriodWindow(period, nowMs)` helper in `apps/user-web/src/lib/dashboard-overview-helpers.ts` that returns `{ dateFrom, dateTo }` for Day, Week, or Month.

**Rationale:** The existing week helpers are in `web-shared` because both SPAs may need them. Month helpers follow the same pattern. The period-window selector logic stays app-local in `dashboard-overview-helpers.ts` since Dashboard is user-web only.

**Alternatives considered:**
- Putting all period logic in `web-shared`: rejected because Dashboard is user-web only and the period selector is Dashboard-specific.
- Using date-fns `startOfMonth` directly in components: rejected because the project convention is to wrap date-fns in named helpers in `web-shared/src/time` for consistency and testability.

### 2. Top Focus period selector as PrimeVue Select in SectionHeader actions slot

**Decision:** Replace the `<Tag severity="secondary" value="This week" />` in `DashboardWeeklyFocusCard.vue`'s `SectionHeader` `#actions` slot with a PrimeVue `<Select>` bound to a `focusPeriod` ref (`'day' | 'week' | 'month'`). The card emits `update:focusPeriod` and `navigate` events. The heading and description text become computed properties derived from the selected period.

**Rationale:** The `#actions` slot is already the designated location for header controls. PrimeVue `<Select>` is the standard dropdown control per project conventions. Making the card emit events keeps it presentational while the parent (`DashboardOverview`) orchestrates data fetching and URL sync.

**Alternatives considered:**
- Moving the selector to the composable and rendering it outside the card: rejected because it breaks the visual design (the pen frame shows the selector in the card header's upper-right).
- Making the card stateful: rejected because the current architecture keeps the card as a pure presenter with data from the composable.

### 3. URL filter state via composable + router replaceState

**Decision:** Add URL query-parameter sync to `useTimeEntryFilters.ts` using `useRoute()` and `router.replaceState()`. On initialization, the composable reads `route.query` and validates parameters (UUID for `projectId`/`taskId`, positive int for `page`, valid ISO for `dateFrom`/`dateTo`) before setting internal state. Filter changes call `router.replaceState()` to update the URL without creating new history entries for control-driven changes. Card navigation uses `router.push()` to create a new history entry.

**Rationale:** The composable already owns all filter state, making it the natural place for URL sync. Using `replaceState` for control changes avoids history pollution (every keystroke would create a history entry with `push`). Using `push` for card navigation ensures Back returns to the Dashboard.

**Alternatives considered:**
- A separate `useUrlFilterSync` composable: rejected because it would need to duplicate or tightly couple to `useTimeEntryFilters` state. Keeping URL sync in the filter composable is simpler.
- Vue Router's `scrollBehavior` or route-level `beforeEnter` guards: rejected because filter hydration must happen before the first list request, which is composable-level logic.

### 4. Card navigation via wrapper component or composable

**Decision:** Create a `useDashboardCardNavigation` composable in `apps/user-web/src/composables/dashboard/` that builds destination route objects with validated query parameters. Each card wraps its navigable area in a semantic `<RouterLink>` or a `<component :is="navigable ? 'router-link' : 'div'">` pattern. Nested controls use `@click.stop` to prevent bubbling.

**Rationale:** Centralizing navigation logic in a composable keeps card components clean and makes destination mapping testable. Using `<RouterLink>` provides semantic links, keyboard focus, and new-tab support (Ctrl/Cmd+click, middle-click) natively.

**Alternatives considered:**
- A shared `NavigableCard` wrapper component in `web-shared`: deferred until the pattern proves stable across both SPAs. The issue mentions extraction candidates but this is user-web only for now.
- `@click` handlers with `router.push()`: rejected because they don't provide keyboard focus, semantic links, or new-tab support without extra work.

### 5. Stale response prevention via request sequencing

**Decision:** Use a request ID or AbortController pattern in `useDashboardOverview.ts` to ensure that when the user switches periods, responses from earlier period fetches are discarded. The composable tracks the current `focusPeriod` and checks whether the response's period matches the current one before committing results.

**Rationale:** TanStack Vue Query's `queryKey` already includes the period window, so cache invalidation is automatic. However, in-flight requests for a previous period can still resolve after a new period is selected. An explicit guard in the queryFn or a watcher ensures stale data is never displayed.

**Alternatives considered:**
- Relying solely on Vue Query's `staleTime` and `keepPreviousData`: insufficient because `keepPreviousData` would show the previous period's values during the new fetch, which the issue explicitly prohibits.

### 6. Consistent drill-down semantics: startedAt-based selection with card-matched boundaries

**Decision:** Dashboard cards and Time Entries destinations use the same browser-local calendar boundaries (inclusive start, exclusive end) for `dateFrom`/`dateTo`. The Dashboard continues to clip displayed durations to the interval (via `getEntryTrackedSecondsWithinRange`), but the Time Entries destination filter uses `startedAt >= dateFrom AND startedAt < dateTo`, which is the existing API semantics. This means an entry that starts within the period will appear in the destination even if its full duration extends beyond the period — the destination shows the full entry, explaining what contributed to the card's clipped value.

**Rationale:** The API filters by `startedAt`, not by duration overlap. Changing the API to support duration-overlap filtering would be a significant contract change. Instead, the destination shows all entries that started within the period, which includes the entries that contributed to the card's displayed (clipped) value. The card's clipped value is a subset of what the destination shows, but the destination provides the full context. This is consistent with the issue's requirement: "the destination explains the card's displayed value."

**Alternatives considered:**
- Adding a duration-overlap filter to the API: rejected as out of scope and a major contract change. The issue says "Include API/contract updates if needed" but the startedAt-based approach explains the card's value without requiring it.
- Clipping Time Entries durations to match the Dashboard: rejected because it would change Time Entries' existing display behavior and break the "full entry duration" contract.

### 7. Dashboard focus period URL state

**Decision:** Add `focusPeriod` as a query parameter on the Dashboard route (`/?focusPeriod=day|week|month`). The `DashboardOverview` component reads it on mount and on route query changes, defaulting to `week`. Period selection updates the URL via `router.replaceState()`.

**Rationale:** Keeping focus period in the URL ensures it survives Back/Forward navigation from card destinations. Using `replaceState` avoids creating a history entry for every period change (the issue says "without a page reload", not "add to history").

## Risks / Trade-offs

- **[Client-side aggregation for Month period]** → The Dashboard fetches all pages of entries for the selected period client-side. For users with many entries in a month, this could be slow. Mitigation: the existing pagination loop already handles this for weeks; month periods may have more pages. Monitor performance and consider a server-side stats endpoint as a future optimization if needed.
- **[URL parameter validation complexity]** → Validating UUIDs, date ranges, and page numbers from URLs adds complexity to the filter composable. Mitigation: use Zod schemas (already a project convention) for URL parameter validation.
- **[Nested click target ambiguity]** → Wrapping composite cards in `<RouterLink>` while having nested buttons/links can create invalid HTML (anchor inside anchor) and ambiguous click targets. Mitigation: use a `<div>` with `role="link"` and `tabindex="0"` for the card wrapper instead of a literal `<a>`, or use the "stretched link" pattern (absolute-positioned `<a>` overlaying the card with nested controls having higher `z-index`).
- **[#516 coordination]** → Card navigation must preserve editor, GitHub, and timer behavior from #516 (unified record presentation). Mitigation: review #516's scope before implementation and ensure nested control isolation patterns are compatible.
- **[Existing test coverage]** → The change touches multiple composables and components with existing specs. Mitigation: update existing tests and add regression tests for new behavior per the acceptance criteria.

## Migration Plan

1. **Phase 1 — Shared helpers:** Add month-boundary helpers to `packages/web-shared/src/time/`. Verify with existing time helper tests and run both SPA test suites.
2. **Phase 2 — URL filter state:** Add URL sync to `useTimeEntryFilters.ts` and hydration in `TimeEntriesView.vue`. This is additive — existing in-memory filter behavior continues to work, URL state is layered on top.
3. **Phase 3 — Period selector:** Generalize `useDashboardOverview.ts` and `dashboard-overview-helpers.ts` for Day/Week/Month. Replace `<Tag>` with `<Select>` in `DashboardWeeklyFocusCard.vue`. Add focus period URL state.
4. **Phase 4 — Card navigation:** Add navigation composable and wire cards. Implement nested control isolation.
5. **Phase 5 — Stale prevention and states:** Add request sequencing and loading/empty/error states for period changes.
6. **Phase 6 — Tests and docs:** Update existing component/composable specs, add regression tests, update `docs/ui/pages-user.md` and Pencil frames.

**Rollback:** Each phase is independently revertible. URL filter state can be disabled by removing the `useRoute`/`router.replaceState` calls. Period selector can be reverted to the static `<Tag>`. Card navigation can be disabled by removing the `<RouterLink>` wrappers.

## Open Questions

1. **#516 scope alignment:** The issue says to coordinate with #516 (unified record presentation and Dashboard entry interactions). Before implementation, verify #516's scope and timeline to ensure card navigation patterns are compatible with #516's record interaction model. This can be resolved at implementation start without changing the specs or approach.
2. **Pencil frame update:** Resolved — six new frames have been added directly to `GITiempo.pen`: "Dashboard - Focus Day", "Dashboard - Focus Month", "Dashboard - Period Selector Open" (with dropdown panel), "Dashboard - Card Hover State", "Dashboard - Card Focus State", and "Time Entries - Filtered from Card". The existing "This week" pill was enhanced with a chevron-down indicator in the new frames to show it is now a PrimeVue Select dropdown.
3. **Stretched link vs. role="link" for composite cards:** The exact HTML pattern for wrapping composite cards with navigation while keeping nested controls independent needs validation against PrimeVue component structure and accessibility requirements. This can be resolved during implementation with a quick prototype and a11y check.
