# Tasks

## 1. Frontend baseline and regression fixtures

- [x] 1.1 Record reproducible before-change request counts for Time Entries/Projects refresh, project-A task edits with project B visible, timer actions, fresh/stale Reports return, and preset writes; verify the baseline records revision, fixtures, request inputs, active consumers, and legitimate report pagination separately.
- [x] 1.2 Inspect the approved `.pen` frames for Time Entries, Projects, and Reports and record a parity checklist for first-load, populated refresh, failure, desktop, and mobile states; verify planned changes preserve field order, actions, skeleton shapes, and accessibility.
- [x] 1.3 Add controlled delayed-response/request-count fixtures in existing frontend tests and failing regressions for retained Time Entries/Projects content and duplicate Projects refresh scheduling; verify first-load and unchanged notification assertions remain covered before implementation edits.

## 2. user-web content continuity and refresh ownership

- [x] 2.1 Separate first-load, refreshing, and refresh-error state in Time Entries without unmounting populated results; verify delayed success/failure tests retain rows, filters, focus targets, and valid dialog state while initial loading and true empty results remain distinct.
- [x] 2.2 Preserve same-scope previous Time Entries results during server-filter/page changes with an updating indication and safe action gating; verify A-to-B-to-C late responses cannot overwrite the latest result and old totals are not presented as the new filter result.
- [x] 2.3 Preserve Projects filters and populated groups during background refresh; verify local search/status/updated changes remain request-free and refresh does not reset valid expansion or selection state.
- [x] 2.4 Replace the fetching-completed child-refetch cascade with one Projects refresh owner for initial load, focus, explicit retry, and changed access scopes; verify at most one request per required query input per same-generation wave and no child reload solely from an unchanged parent fetch.
- [x] 2.5 Document user page refreshing and scoped retry behavior in `docs/ui/pages-user.md`; verify the text matches the preceding transition and request-count tests.

## 3. user-web targeted reconciliation and bounded cache

- [x] 3.1 Pass affected project/task and available previous-entry context into mutation reconciliation; verify editing a task in project A updates its authoritative row/options without requesting project B's task list.
- [x] 3.2 Separate project-summary/visibility, per-project tasks, time-entry lists, and timer invalidation targets; verify create/update/delete/start/stop and running-task changes refresh only affected known scopes while preserving pagination and aggregate correctness.
- [x] 3.3 Implement and test own-time first-entry visibility, last-entry deletion/move removal, materialized external tasks, changed capabilities, and missing-source conservative reconciliation; verify hidden items leave rows, search, pickers, caches, and invalid dialogs.
- [x] 3.4 Add the design's 30-second freshness and five-minute inactive retention overrides for selected user lists/tasks without changing global defaults or authoritative timer/visibility policies; verify fake-clock fresh/stale/expired navigation budgets and existing option-cache sharing.
- [x] 3.5 Protect reconciliation against pre-mutation reads and session/workspace changes during pending requests; verify late results cannot restore old state or cross scopes, and timer conflicts still refresh authoritative state with valid drafts preserved.
- [x] 3.6 Document the user resource policy and authority exceptions in `docs/ui/pages-user.md`; run the focused query, timer, Projects, and Time Entries suites and verify unchanged success/info/error behavior.

## 4. admin-web Reports cache and preset writes

- [x] 4.1 Add regression tests for Reports fresh/stale route return and multi-project/multi-page results, then replace zero row retention with the design's bounded policy; verify fresh returns avoid remount-only row reads and stale returns retain content while fetching every required page once.
- [x] 4.2 Make cached report-row reuse depend on the current user/workspace/role and effective allowed-project scope; verify scope changes evict incompatible rows and stale project/member responses cannot expose unauthorized cached results.
- [x] 4.3 Keep explicit Reports refresh authoritative while coordinating its dependency/row reads once; verify existing local grouping/filter behavior and populated desktop/mobile table continuity remain intact.
- [x] 4.4 Reconcile preset create/save/rename/delete from write responses or confirmed deletion; verify one write with zero immediate preset-list/report-data reads, preserved ordering/active id/dirty baseline, and no state change on failed writes.
- [x] 4.5 Preserve page-entry/explicit preset revalidation and configuration application; verify remote deletion clears the active preset appropriately and opening a preset refreshes changed server inputs without breaking local grouping.
- [x] 4.6 Update `docs/ui/pages-admin.md` for Reports navigation cache and preset reconciliation; run focused report/query/preset suites and verify exports and existing notification expectations are unchanged.

## 5. Shared boundaries and loading documentation

- [x] 5.1 Update `docs/ui/components.md` to distinguish first-load skeletons, content-preserving refresh, stale-result transitions, and scoped retry; verify alignment with both apps and leave notification policy in `docs/ui/patterns.md` unchanged.
- [x] 5.2 Review any changed shared helper against `packages/web-shared/AGENTS.md`; reuse only proven-identical leaves, and verify both frontend consumers/tests if a shared file changes, or record that no shared production change was needed.
- [x] 5.3 Verify the implementation diff introduces no backend/API/schema, dependency, invoice-rounding, auth-protocol, or notification-policy changes; confirm existing API responses remain sufficient and report pagination was not truncated.

## 6. Cross-app integration and acceptance

- [x] 6.1 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`, confirming both frontend suites are included; verify all pass without new errors and record any environment limitation explicitly.
- [x] 6.2 Exercise real Time Entries, Projects, timer, Reports, and preset flows on desktop and mobile with populated/empty/delayed/failed data; verify retained content, scroll/focus/valid state, timer recovery, and workspace/own-time isolation, recording PASS/FAIL/BLOCKED with revision and evidence.
- [x] 6.3 Compare before/after network counts against every request budget in `design.md`, separating critical authority checks and report pagination; verify no duplicate refresh wave, no unrelated project task reload on a known edit, and no post-write preset-list read.
- [x] 6.4 Complete final `.pen` parity, PrimeVue exception, and reusable-pattern reviews; verify only intended refresh transitions differ and document any actual constraint or remaining delta.
- [x] 6.5 Run independent review and `pnpm exec openspec validate improve-spa-data-refresh --strict`; verify all findings are resolved or explicitly scoped and all implementation/acceptance evidence is linked before marking tasks complete.


## Workflow follow-up

- Synchronize the capability delta and archive the change after implementation and required acceptance are complete.
- Link the implementation PR to the associated GitHub issue using the repository's supported issue-reference format.
