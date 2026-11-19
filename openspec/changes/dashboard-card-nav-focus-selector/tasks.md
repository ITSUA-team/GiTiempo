# Tasks

## 1. Shared — Month-boundary time helpers

- [ ] 1.1 Add `startOfLocalMonth(date)`, `nextLocalMonthStart(date)`, and `getLocalMonthRange(nowMs)` to `packages/web-shared/src/time/index.ts`. Verify: unit tests in `packages/web-shared/src/time/index.spec.ts` cover month start, exclusive next-month boundary, and DST transitions within a month.
- [ ] 1.2 Run `pnpm --filter @gitiempo/web-shared lint && typecheck && test` to verify shared package health after adding month helpers.

## 2. User-web — Dashboard period generalization

- [ ] 2.1 Add `getDashboardPeriodWindow(period: 'day' | 'week' | 'month', nowMs: number): { dateFrom: string; dateTo: string }` to `apps/user-web/src/lib/dashboard-overview-helpers.ts`, reusing `startOfLocalDay`/`nextLocalDay` for Day, `startOfLocalIsoWeek`/`addLocalDays(+7)` for Week, and the new `startOfLocalMonth`/`nextLocalMonthStart` for Month. Verify: unit tests in `dashboard-overview-helpers.spec.ts` cover all three periods, exclusive end boundaries, and local midnight/DST edge cases.
- [ ] 2.2 Generalize `buildDashboardStats` and `buildDashboardWeeklyFocus` in `dashboard-overview-helpers.ts` to accept a period window parameter instead of hardcoded week logic. Ensure Today/This Week/Projects This Week stats retain their own fixed scopes while Top Focus uses the passed window. Verify: existing helper tests pass with updated signatures; new tests cover Day and Month period aggregation.
- [ ] 2.3 Update `useDashboardOverview.ts` to accept a `focusPeriod` ref and use `getDashboardPeriodWindow` for the Top Focus query. Keep Today/This Week/Projects This Week queries using their existing fixed windows. Ensure all-pages pagination loop works for Month period (potentially more pages than Week). Verify: `useDashboardOverview.spec.ts` updated to test period switching, all-pages fetch for each period, and that Today/This Week stats remain fixed when Top Focus period changes.

## 3. User-web — Top Focus period selector UI

- [ ] 3.1 Replace the `<Tag severity="secondary" value="This week" />` in `DashboardWeeklyFocusCard.vue` with a PrimeVue `<Select>` offering Day/Week/Month options, bound to a `focusPeriod` model prop with `update:focusPeriod` emit. Verify: `DashboardWeeklyFocusCard.spec.ts` updated to test select rendering, option list, and default Week selection.
- [ ] 3.2 Make the `SectionHeader` title and description dynamic based on `focusPeriod` (e.g., "Top Focus Today" / "Top Focus This Week" / "Top Focus This Month"). Update empty-state copy for each period. Verify: spec tests cover heading/description text for all three periods and period-appropriate empty-state messages.
- [ ] 3.3 Wire `DashboardOverview.vue` to pass `focusPeriod` to `DashboardWeeklyFocusCard` and handle `update:focusPeriod` by updating the composable state. Verify: `DashboardOverview.spec.ts` tests period selection updates all Top Focus values (Top Project, Top Task, durations, counts, percentages) without affecting Today/This Week/Projects This Week cards.

## 4. User-web — Dashboard focus period URL state

- [ ] 4.1 Add `focusPeriod` query parameter reading to `DashboardOverview.vue` using `useRoute()`. On mount and on `route.query.focusPeriod` change, validate the value (`day` | `week` | `month`, default `week`) and update the composable. Verify: spec test covers URL-driven period initialization, invalid-value fallback to Week, and history navigation restoration.
- [ ] 4.2 Update the URL via `router.replaceState()` when the user changes the period selector. Verify: spec test confirms URL updates on period change and uses replace (not push).

## 5. User-web — Time Entries URL filter hydration and sync

- [ ] 5.1 Add Zod schema for URL filter validation (`dateFrom`: ISO datetime, `dateTo`: ISO datetime, `projectId`: UUID, `taskId`: UUID, `page`: positive int) in `apps/user-web/src/composables/time-entries/useTimeEntryFilters.ts` or a co-located validation module. Verify: unit tests cover valid params, invalid UUIDs, out-of-range pages, reversed date ranges, and partial param sets.
- [ ] 5.2 Add URL hydration to `useTimeEntryFilters.ts`: on initialization, read `route.query`, validate via the Zod schema, and set internal filter state before the first list request is enabled. Verify: integration test confirms no unfiltered request is sent before the filtered request when loading from a URL with filter params.
- [ ] 5.3 Add URL sync to `useTimeEntryFilters.ts`: when filter state changes from control interactions, update the URL via `router.replaceState()`. Use `router.push()` only for card-navigation-initiated filter changes. Verify: spec test confirms URL updates on filter changes and uses replaceState for control-driven changes.
- [ ] 5.4 Update `TimeEntriesView.vue` to ensure visible controls (date range picker, project autocomplete, task autocomplete, paginator) are initialized from the hydrated filter state and stay synchronized. Verify: spec test covers loading from URL with all filter params and verifying all controls reflect the URL state.
- [ ] 5.5 Add filter revalidation on workspace/access changes: when `visibleProjects` updates and a selected project or task is no longer visible, clear the invalid filter and update the URL. Verify: spec test covers workspace switch clearing invalid project/task filters and URL update.

## 6. User-web — Dashboard card navigation

- [ ] 6.1 Create `useDashboardCardNavigation` composable in `apps/user-web/src/composables/dashboard/` that builds validated route objects with query parameters for each card destination (Today, This Week, Projects This Week, Top Focus section, Top Project, Top Task, Recent Time Entries). Verify: unit tests cover each destination's query params, exclusive date boundaries, stable project/task IDs, and page 1 default.
- [ ] 6.2 Make each Dashboard card navigable by wrapping the non-control area in a semantic link element (RouterLink or role="link" div). Use the "stretched link" pattern or equivalent to make the entire card area clickable while keeping nested controls independent. Verify: `DashboardOverview.spec.ts` tests card navigation triggers `router.push` with correct query params for each card.
- [ ] 6.3 Implement nested control isolation: ensure Start/Stop timer actions, entry editing, GitHub issue links, and the period selector use `@click.stop` or equivalent to prevent triggering card navigation. Verify: spec tests confirm activating each nested control does not trigger navigation.
- [ ] 6.4 Add keyboard accessibility: navigable cards show visible focus indicators and respond to Enter/Space. Add accessible destination names. Verify: spec test covers keyboard focus and Enter/Space activation.
- [ ] 6.5 Support new-tab opening: ensure Ctrl/Cmd+click and middle-click on navigable cards open the destination in a new tab. Verify: spec test or manual QA confirms new-tab behavior.

## 7. User-web — Period change state handling

- [ ] 7.1 Add stale-response prevention in `useDashboardOverview.ts`: track the current `focusPeriod` and discard query responses for a previous period when a newer period has been selected. Use AbortController or request-ID guard in the queryFn. Verify: spec test covers rapid period switching (Day → Month) and confirms Day response is discarded.
- [ ] 7.2 Add loading state for period changes: show a loading indicator in the Top Focus section during fetch, without showing previous-period values. Verify: spec test confirms loading state appears and previous values are not displayed.
- [ ] 7.3 Add empty and error states for period changes: show period-appropriate empty-state copy and request-error state with Retry. Verify: spec tests cover empty period, fetch error, and Retry behavior.

## 8. User-web — Consistent drill-down time semantics

- [ ] 8.1 Verify that Dashboard card period windows and Time Entries destination filter boundaries use identical browser-local calendar boundaries (inclusive start, exclusive end). Ensure `getDashboardPeriodWindow` output matches the `dateFrom`/`dateTo` encoding used in card navigation URLs. Verify: unit test confirms boundary equality for Day, Week, and Month periods including DST transition days.
- [ ] 8.2 Add date-edge regression tests in `dashboard-overview-helpers.spec.ts` covering overnight entries, running timers, week/month/year boundaries, local midnight, and DST. Verify: tests pass for all edge cases and confirm destination filter includes entries that started within the period.

## 9. User-web — Update existing tests

- [ ] 9.1 Update `DashboardOverview.spec.ts` to cover card navigation destinations, period selector defaults/transitions, nested control isolation, and URL-driven period state. Verify: all updated tests pass.
- [ ] 9.2 Update `DashboardWeeklyFocusCard.spec.ts` to cover PrimeVue Select rendering, period-dependent heading/description, and empty-state copy for each period. Verify: all updated tests pass.
- [ ] 9.3 Update `useDashboardOverview.spec.ts` to cover period-aware queries, all-pages pagination for Month, stale-response prevention, and loading/empty/error states. Verify: all updated tests pass.
- [ ] 9.4 Update `useTimeEntryFilters.spec.ts` (or create if not present) to cover URL hydration, URL sync, invalid parameter handling, stable ID encoding, and workspace/access filter revalidation. Verify: all updated tests pass.

## 10. Docs — UI documentation and Pencil frames

- [ ] 10.1 Update `docs/ui/pages-user.md` Dashboard section to document card navigation destinations, the Day/Week/Month period selector, URL filter state behavior, and accessibility requirements. Verify: documentation reflects all spec requirements and is consistent with `docs/ui/INDEX.md` rules.
- [ ] 10.2 Update `docs/ui/pages-user.md` Time Entries section to document URL query parameter filter state, hydration, and synchronization behavior. Verify: documentation is consistent with the spec delta.
- [x] 10.3 Pencil frames created in `GITiempo.pen` for the Top Focus period selector and card navigation feature. Six new frames added: "Dashboard - Focus Day" (ZrszX), "Dashboard - Focus Month" (KJjt3), "Dashboard - Period Selector Open" (mNZ2n) with dropdown panel (lRDHl) showing Day/Week/Month options, "Dashboard - Card Hover State" (d8OFWc) with elevated Today card, "Dashboard - Card Focus State" (VfgSU) with brand focus ring on Top Project tile, and "Time Entries - Filtered from Card" (nIU7i) in the Time Entries canvas with date range/project/task filters applied. Canvas captions added. Verify: frames are present in the pen file and match the design system (Inter, #5D2B85, #E8E1F5, #F4F4F5, #FFFFFF).

## 11. Integration verification

- [ ] 11.1 Run `pnpm --filter user-web lint && typecheck` and verify zero new errors. Follow `apps/user-web/AGENTS.md` verification rules.
- [ ] 11.2 Run `pnpm --filter user-web test` and verify all tests pass, including updated and new specs.
- [ ] 11.3 Run `pnpm --filter @gitiempo/web-shared lint && typecheck && test` and verify shared package health (month helpers change).
- [ ] 11.4 If `packages/web-shared` changed, run `pnpm --filter admin-web lint && typecheck && test` to verify both SPAs (per root AGENTS.md cross-app frontend rules).
- [ ] 11.5 Run `openspec validate --strict` for this change and verify it passes.
- [ ] 11.6 Manual desktop and mobile QA: verify all card links navigate correctly, keyboard focus/select operation works, new-tab opening works, Back/Forward/reload preserves filters and focus period, and no unintended timer/edit actions trigger from card clicks.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.
- Coordinate with #516 implementation to ensure card navigation preserves editor, GitHub, and timer behavior.
