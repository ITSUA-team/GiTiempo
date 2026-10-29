# Design

## Context

See `proposal.md` for motivation and scope. This is a frontend behavior change across both SPAs, so a design is needed for cache freshness, access-sensitive reconciliation, and request coordination.

Observed implementation:

- `apps/user-web/src/composables/time-entries/useTimeEntriesData.ts` treats both initial pending and background fetching as page loading. `TimeEntriesView.vue` replaces its results with a skeleton; `ProjectView.vue` also replaces filters and grouped content while its data composable is fetching.
- `apps/user-web/src/composables/projects/useProjectsData.ts` refreshes all child task queries after a subsequent project fetch. Its `loadPage()` also explicitly refreshes those queries. This proves duplicate scheduling, not a guaranteed number of completed HTTP requests.
- `apps/user-web/src/lib/query-keys.ts` ignores the project id in task invalidation and invalidates the whole projects family for timer/time-entry mutations. That family contains both project metadata and all child task lists.
- Both app QueryClients use `staleTime: 0`, disabled focus refetch by default, and disabled retries. Some user queries opt into focus revalidation. The existing server-state spec explicitly permits tested feature overrides; the global defaults do not need to change.
- `apps/admin-web/src/composables/reports/useReportRowsData.ts` uses `gcTime: 0` and fetches every required page for each eligible project. Its table already retains populated rows during background refresh; preserve that behavior. One report query is not one HTTP request.
- `apps/admin-web/src/composables/reports/useSavedReports.ts` receives authoritative saved presets but immediately lists all presets again after each write.
- The existing own-time contract makes project/task visibility dependent on the user's time entries. Removing all project/task invalidation after timer or entry mutations would violate that contract. Local task-option caches are already shared by matching scope/project/access keys; a second option-display key alone is not evidence of duplicate HTTP work.

Follow `apps/user-web/AGENTS.md`, `apps/admin-web/AGENTS.md`, `docs/ui/INDEX.md`, and relevant `components.md`, `pages-user.md`, `pages-admin.md`, `patterns.md`, and `layout.md`. If a shared leaf changes, also follow `packages/web-shared/AGENTS.md`. Existing approved `.pen` screens remain the baseline for structure; implementation must inspect them and record parity for the changed loading transitions. This proposal does not claim browser or visual acceptance has already passed.

## Goals / Non-Goals

**Goals:** Retain valid rendered data, reduce repeated identical reads, reuse short-lived cache across navigation, and keep reconciliation correct under mutations, filters, and permission changes.

**Non-Goals:** No notification changes, global cache-default flip, new query framework, persistent storage, backend batching endpoint, report pagination truncation, general route-state persistence/KeepAlive rollout, invoice refactor, or authentication redesign. Preserve existing external/OAuth navigation and exceptional session-recovery paths.

## Decisions

### 1. Separate initial loading, refreshing, and refresh failure

Derive initial loading from the absence of usable data for the current authorized scope, not merely `isFetching`. Keep populated list subtrees mounted on same-key refresh; use an existing PrimeVue-compatible small refreshing indicator and accessible busy state. A successful empty result is still loaded data. Do not reset filters, focus, expansion, or dialogs just because a request started.

On a transient refetch failure, retain same-scope data and expose a local retry state plus unchanged toast feedback. On a known authorization loss or session/workspace transition, clear unsafe content and dependent selections immediately. Content retention never takes precedence over access revocation.

For Time Entries server-filter/pagination transitions, retain previous results only within the same authorization scope and mark them as updating. Keep the last committed result's totals associated with those rows; suspend selection-dependent mutations/export of stale results until the requested result commits. Do not reuse previous-scope placeholders. Query identity and request generation must reject late results. Projects search/status/updated filters and Reports grouping remain local-only as documented.

Alternative rejected: hiding loading indicators without changing subtree conditions, or applying `KeepAlive` globally. Neither addresses duplicate reads or scope safety, and a global route-state policy is unnecessary here.

### 2. Use feature-specific finite freshness policies

Keep global defaults unchanged. Initial implementation values below are deliberate conservative choices, not measured optimal thresholds. Use named app-local constants with fake-clock tests; tune later using measured behavior rather than adding a settings UI.

| Resource | Freshness | Inactive retention | Exceptions |
| --- | --- | --- | --- |
| User Time Entries lists and project task collections | 30 seconds | 5 minutes | Mutations, explicit refresh, and access/scope changes override freshness |
| User visible-project/access metadata | Existing immediate-stale and focus behavior | Existing bounded cache | Authoritative visibility checks must not automatically refetch every child task list |
| Current timer and conflict recovery | Existing authoritative policy | Existing policy | No relaxation of current-timer focus/recovery checks |
| Admin Reports row results and non-authoritative member display data | 30 seconds | 5 minutes | Explicit refresh, invalidation, and changed effective report scope force revalidation |
| Admin Reports project visibility/role scope | Existing authoritative policy | Existing bounded cache | Validate the effective allowed project set before exposing retained report rows |
| Saved-report presets | Page-entry/explicit collection reconciliation; local confirmed-write updates | Existing component lifetime | No unconditional collection read following an authoritative write |

Remove Reports' zero retention. Distinguish cache retention from freshness: retained stale rows can render while being refreshed; a fresh result avoids a remount-only fetch. Preserve role and workspace query-key scope, and include the effective allowed-project/access signature in report-row identity or invalidate rows before exposing a changed set. A first/cold report load waits for required scope metadata. A same-session return can retain rows only while that authorization context remains valid; a returned scope change discards incompatible rows before reuse.

Alternative rejected: raising `staleTime` globally or disabling all focus refresh. Those changes would silently affect auth, timer, and unrelated features and could conceal changes from other clients.

### 3. Make Projects refresh reasons explicit

Remove the generic fetching-completed watcher as a second owner of child refetches. The data owner handles:

- Initial/new project scopes: enable required child queries through their keys.
- Focus revalidation: refresh visibility; reconcile changed/new access scopes; refresh only stale or invalidated task collections, once each.
- Explicit refresh/retry: refresh the visible project list and each required visible child collection once in that wave, including fresh collections when a full manual refresh was requested.
- Mutation reconciliation: update returned records or target only the affected query keys.

Use existing QueryClient coordination for identical reads rather than inventing a separate request-cache layer. Share a running read only if it can satisfy the current state; an in-flight read started before a successful write cannot prevent post-write revalidation. Cancel or disregard older responses when the newer generation must win. Retain request scopes throughout async continuations so a late callback cannot write into a newly selected workspace.

Alternative rejected: deleting only the explicit task loop from `loadPage()` and keeping unconditional watcher fan-out. It removes one duplicate but still refreshes every child collection after unrelated project checks.

### 4. Define mutation effects before narrowing invalidation

Pass mutation variables, authoritative results, and any available previous cached entity to feature-owned reconciliation. Separate visible-project metadata, per-project task collections, time-entry lists/aggregates, and current-timer/options keys.

| Operation | Required reconciliation | Work to avoid |
| --- | --- | --- |
| Task create/edit/delete | Returned task or affected project's list; dependent timer labels/options and project metadata when actually changed | Task lists in unrelated projects |
| Time-entry create/update/delete | Affected lists and summaries; source/destination project/task visibility; any affected running entry | Every unrelated project-task collection |
| Timer start/stop/change | Authoritative current state, affected time-entry results and summaries, source/destination own-time visibility; materialized external task/project when returned | A blanket invalidation followed by another all-task refresh wave |
| Preset create/save/rename/delete | Authoritative returned preset or confirmed local deletion | Immediate list read and unrelated report/project/member reads |

Do not optimistically reconstruct paginated lists or aggregates when the result is insufficient. A targeted authoritative read is correct in that case. If the previous/source entry is unavailable, conservatively revalidate the potentially affected own-time collections in the current scope rather than inventing source ownership; document and test that fallback. This exception must not become the default for known managed-project edits.

Own-time first-entry starts can add a visible task/project; deleting or moving the last entry can remove them. Authoritative responses update capabilities, evict old access-scope task keys, and clear hidden selections, search suggestions, and invalid dialogs. The current project/task option cache sharing must survive these changes.

Alternative rejected: treating all project-related requests after a time-entry change as redundant. Visibility is data-dependent even when task metadata itself did not change.

### 5. Reconcile saved presets without reloading report data

Use the existing client response to insert/replace a preset, preserving list ordering, active id, and dirty-baseline semantics. A confirmed delete removes it and clears the active id without resetting report filters. Failed writes keep committed state. Keep page-entry and explicit collection refresh to discover concurrent edits/deletions by other users. Opening a preset remains a separate action that applies its configuration and refreshes only changed server-side report inputs.

Alternative rejected: adding an unconditional refetch after patching local presets. That defeats the request reduction and is unnecessary when the write response is authoritative.

### 6. Measure requests and visible continuity together

Capture an initial network/request-count baseline for the named scenarios before implementation, with revision, fixtures, and active queries recorded. Count unique resource plus scope/filter/page inputs per refresh wave; report pagination is legitimate distinct work. Do not claim a fixed percentage reduction without comparable before/after runs.

Acceptance budgets:

- Overlapping same-generation Projects triggers: at most one read per required project/task query input, no cancel-and-restart duplicate wave.
- Managed task edit in project A with B mounted: zero task-list reads for B solely from the edit.
- Fresh same-key list/report return within 30 seconds: zero remount-only reads for that fresh resource; independent authoritative scope/timer checks are counted separately.
- Stale retained return: one refresh sequence and no full-page skeleton; all report pages remain required.
- Preset create/save/rename/delete: one write, zero immediate preset-list reads, zero unrelated report-row/project/member reads when active report inputs are unchanged.
- Same-key background refresh: existing rows/controls remain mounted under delayed success and transient failure, with no reset caused solely by fetching.

Delayed-response tests also cover filter A-to-B-to-C races, a mutation during an older read, visibility loss, workspace switching during a pending request, and unchanged notification behavior. Browser acceptance covers actual consuming pages at desktop and below 640px, with evidence for scroll/focus/expansion and network budgets. Run both frontend test suites plus root typecheck/lint/test; backend e2e is required only if implementation scope later legitimately reaches API/integration code.

## Planned File Areas

- **user-web:** `src/composables/time-entries/useTimeEntriesData.ts`, `src/views/TimeEntriesView.vue`, `src/composables/projects/useProjectsData.ts`, `src/views/ProjectView.vue`, `src/composables/query/index.ts`, `src/lib/query-keys.ts`, existing time-entry cache reconciliation and timer/options consumers, corresponding composable/query/view specs. Keep route composition app-local.
- **admin-web:** `src/composables/reports/useReportRowsData.ts`, `useReportsData.ts`, `useSavedReports.ts`, report query keys and `ReportsView.vue` where needed, corresponding specs. Preserve `ReportsTable` populated refresh behavior and report export/full-scope calculations.
- **shared:** No mandatory production change. If an existing neutral test/helper leaf needs extension, keep its contract narrow and verify both apps; do not create a general refresh framework or move app-specific stores/routes into shared code.
- **docs/specs:** Update the loading and refresh guidance in `docs/ui/components.md`, `pages-user.md`, and `pages-admin.md`; synchronize this capability delta through the normal completion workflow. Notification rules in `patterns.md` remain unchanged.
- **API:** No code, contract, or database changes. Consume existing mutation responses and authoritative reads; do not omit paginated data to reduce request counts.

## Risks / Trade-offs

- Short-lived data can be stale after another user's edits -> retain finite freshness, explicit refresh, and authoritative visibility/timer checks; do not promise realtime synchronization.
- Cached data can outlive authorization -> session/workspace scoping, existing auth cleanup, access-signature invalidation, and visibility-loss tests override visual retention.
- A response patch can break filtering, pagination, or totals -> patch only provable results and revalidate affected derived datasets otherwise.
- Deduplication can accidentally reuse a pre-mutation read -> distinguish refresh generations and test delayed old responses.
- Long reports retain more memory -> five-minute inactive retention, no persistent browser cache, and scope-complete keys; future memory tuning is separate.
- Current tests expect skeletons during repeat fetch -> deliberately replace those expectations with continuity and request-budget tests while retaining first-load/error coverage.
- Other active changes touch Reports/invoice-adjacent shared code -> keep invoices out of scope and review current checkout before implementation; do not revert unrelated work.

## Migration Plan

1. Record baseline request counts and add targeted regression coverage for the approved behavior before changing request ownership.
2. Implement user content continuity and single-owner Projects refresh, then narrow mutation effects with own-time guards.
3. Apply the bounded feature policies and Reports cache identity/retention changes; reconcile saved presets locally.
4. Update documentation and run automated checks plus real-page acceptance. Preserve existing toast assertions.
5. Deploy through the existing frontend release process; no data migration is needed. Roll back app-local policies/refresh changes together if required, preserving auth cleanup and API contracts. No deployment is part of proposal creation.
