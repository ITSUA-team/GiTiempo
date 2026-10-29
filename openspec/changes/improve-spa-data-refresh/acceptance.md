# SPA refresh acceptance

## Revision, environment, and evidence

- Baseline: exact commit `4a035c61a6386aacf0a059e2b6d85c349e6d2436`.
- Candidate: current uncommitted working tree on `improve-spa-data-refresh`.
- Local API: `http://localhost:3000`; User SPA: `http://localhost:5173`; Admin SPA: `http://localhost:5174`.
- Stable acceptance uses Chrome for Testing 152 through the user-requested `agent-browser` / Chrome DevTools Protocol path. Normal User and Admin sign-in succeeded; no Computer Use permission or authentication bypass was used.
- Baseline frontends ran sequentially from an exact Git archive on the same origins, using ordinary browser sessions without copying credentials. Interrupted HMR/authentication/service-restart runs are excluded. The archive's font allow-list warnings do not affect data request counts; its visuals are not candidate parity evidence.
- [Sanitized CDP events](evidence/cdp-network-counts.json) record methods, paths, statuses, timestamps, and report project/page inputs, without headers, tokens, cookies, or credential payloads.

Evidence index: [network comparisons](cdp-evidence.md), [request budgets](baseline-evidence.md), [User continuity](user-continuity-evidence.md), [User mutations](user-mutation-evidence.md), [own-time browser acceptance](own-time-evidence.md), [Reports/presets](admin-evidence.md), [tasks](tasks.md).

## Approved design checklist

Inspected `GITiempo.pen` frames `yAu6B` Projects List, `FRM1d` Projects List Mobile — Timer States, `R2FI0` Time Entries, `Y2cJH` Admin Reports V2, and `RTWsH` Admin Reports Mobile. Read `docs/ui/INDEX.md` and relevant components, page, layout, and pattern guidance.

- Preserve shell/navigation ownership, field/action order, skeleton shapes, typography, spacing, tokens, and responsive table/card branches.
- Time Entries: date → project → task filters, day groups, committed totals, edit/timer controls, paginator, valid dialog drafts and focus.
- Projects: search → status → updated filters, grouped project/task content, capability controls, External tags, and expansion.
- Reports: presets → summaries → results, grouping, hierarchical rows, complete totals, naming/management dialogs, and export scope.
- Distinguish first load, successful empty data, populated refresh, previous-filter updating results, and retained-data failure. Authorization loss overrides retention.
- No separate approved Time Entries mobile frame was found; review the existing documented responsive branch. No redesign or new PrimeVue exception was introduced.

## Stable real-page results

Desktop checks use 1280×900; mobile checks use an actual 390×844 viewport. Earlier IAB observations are superseded by stable CDP evidence where applicable.

| Scenario | Result | Observations / evidence |
| --- | --- | --- |
| Time Entries initial empty and populated states | PASS | Successful empty state observed before local timers; populated day groups, totals and paginator afterward. [Desktop](evidence/user-time-entries-desktop.png), [mobile](evidence/user-time-entries-mobile.png). |
| Time Entries delayed filter transition | PASS | Previous rows, filter focus and updating text remained; stale timer controls disabled and edit openers inert. Completion produced true empty data; clearing the filter restored rows. [Desktop](evidence/cdp-user-filter-updating-desktop.png), [mobile](evidence/cdp-user-filter-updating-mobile.png). |
| Time Entries same-key failure | PASS | Actual groups remained connected; paginator, open dialog, unsaved description and focus survived at both widths. [Desktop](evidence/cdp-time-entries-failure-desktop.png), [mobile](evidence/cdp-time-entries-failure-mobile.png). Draft was not saved. |
| Time Entries delayed Retry | PASS | Both widths retained content during the delayed read. Completion preserved six rows and paginator, removed the error/updating state, and made exactly one list read. [Desktop](evidence/cdp-time-entries-retry-desktop.png), [mobile](evidence/cdp-time-entries-retry-mobile.png), `candidate-time-entries-retry-final`. |
| Projects local filters | PASS | Search/status/updated changes made zero requests. |
| Projects failure and overlapping Retry | PASS | Search `tst` and actual group DOM remained. Two same-tick Retry triggers made one project read and one read per each of six task inputs. [Failure](evidence/cdp-projects-failure-desktop.png), [desktop Retry](evidence/cdp-projects-retry-delayed-desktop.png), [mobile Retry](evidence/cdp-projects-retry-delayed-mobile.png). |
| Task A edit with six task inputs mounted | PASS | Baseline A3/B10 → candidate A1/B0. Title restored to `tst`. |
| Timer start/stop/recovery | PASS | Local starts paired with stops; task/project content remained. Candidate B task reads were zero. Independent current-timer/idle-eligibility reads remain authoritative. |
| Fresh Time Entries return | PASS | Baseline one list read → candidate zero. Scope/timer checks counted separately. |
| Reports fresh/stale return | PASS | Baseline fresh return made two distinct project/page POSTs; candidate fresh return made zero. Stale candidate made one full sequence of two distinct inputs and retained rows during delay. [Desktop](evidence/cdp-reports-stale-desktop.png), [mobile](evidence/cdp-reports-stale-mobile.png). |
| Reports failure/Retry | PASS | Rows remained with scoped Retry after an injected read failure; successful Retry restored the complete result. [Desktop](evidence/cdp-reports-failure-desktop.png), [mobile](evidence/cdp-reports-failure-mobile.png). |
| Preset create/save/rename/delete | PASS | Every baseline write added one saved-list GET; each candidate write window contained one write and zero immediate reads. Dirty/saved and local-empty states observed. Disposable CDP candidate/baseline presets deleted. |
| Workspace switch during pending response | PASS | Switched from GI Tiempo to the existing member workspace during a 24s-held list response. Old groups disappeared immediately and did not return after cancellation/release; new workspace showed its empty state. [Desktop](evidence/cdp-workspace-pending-desktop.png), [mobile](evidence/cdp-workspace-pending-mobile.png), `candidate-user-workspace-pending`. Old interception release failed because its read had been cancelled; this is expected controller cleanup. |
| Own-time first/last-entry permission transition | PASS | Created an isolated localhost fixture in the existing Member workspace. Before the first entry the private external-reference project was hidden; after local fixture materialization, normal focus revalidation showed only the task with the member's entry, with own-time capability help. UI deletion of the sole entry removed rows, project/task options, cached search suggestions, timer context, and the edit dialog. A second sole entry moved through the real edit form to the public fixture project; source visibility disappeared and destination rows remained. Desktop and mobile evidence and the exact setup boundary are in [own-time acceptance](own-time-evidence.md). |

Manual acceptance found and fixed additional regressions: task edits duplicated A reads through top-bar context; uncached timer stops used broad reconciliation; stale Time Entries actions looked enabled; refresh-error template chains hid retained groups. Regression tests now include active consumers, conservative unknown manual-move sources, disabled controls, and actual groups/paginator/dialog/focus through failure and retry.

## Scope and parity review

No shared production helper, backend/API/schema, dependency, invoice-rounding, auth protocol, global QueryClient default, or notification-policy file changed. Existing success/info/error feedback remains. Shared UI leaves remain reused; resource ownership and access policies stay app-local. Full report pagination is covered across multiple projects/pages.

Final parity review preserves existing field/action order, skeletons, tokens, and responsive branches. Only intended updating/error states and safe action gates changed. No new PrimeVue compromise was needed. The existing documented Reports mobile controls remain as implemented before this change.

## Final verification

- `pnpm typecheck`: 11/11 workspace tasks passed.
- `pnpm lint`: 11/11 passed, no errors; existing warnings remain (12 User SPA and 2 shared frontend).
- `pnpm test`: 11/11 workspace tasks plus five root tests passed. User: 57 files / 618 tests; Admin: 85 / 832; shared frontend: 40 / 300; API: 46 / 656; shared contracts: 28 / 630; extension: 12 / 261; web config: 2 / 18.
- Independent final review approved retained-content error rendering and rendered-container/focus regression tests.
- `pnpm exec openspec validate improve-spa-data-refresh --strict` and `git diff --check` passed.
- API/integration production code is untouched; backend e2e was not required. Code graph reindexing was unavailable because no codebase-memory tools are exposed in this session.

## Cleanup and completed acceptance

The old running `tst` timer was stopped; subsequent starts were paired with stops. Task titles were restored and the unsaved description discarded. Authorized local timer entries and the original earlier QA preset remain. Disposable CDP presets were removed. No production writes, deployment, final implementation commit, or archive occurred.

Admin was restored from the baseline server to the current repository on port 5174; API readiness returned `{"status":"ok","db":"connected"}`. Interrupted baseline runs were discarded after API recovery and normal sign-in. Seed passwords require the absent Firebase Auth Emulator and were not used.

The own-time fixture gap was resolved with two temporary projects and three tasks in the existing local Member workspace, without changing users, memberships, authentication, or application code. First-entry materialization was prepared directly in the localhost database to simulate an external client; normal browser reads and the actual UI DELETE/PATCH paths were exercised. No live GitHub integration claim is made. [Cleanup proof](evidence/own-time-cleanup-check.json) confirms zero remaining fixture projects, tasks, and entries. The original GI Tiempo workspace was restored.

The owned CDP controller and root QA dev session were stopped after verification. Ports 3000, 5173, 5174, and 4321 had no listening processes, leaving the normal `pnpm dev` launch available. Chrome and the signed-in browser session were left open.

All required browser acceptance scenarios now have evidence. Independent review approved the final own-time acceptance and all 28 task checkboxes are complete. The raw delete trace's HTTP 204 / `failed: true` discrepancy is documented in [own-time evidence](own-time-evidence.md); browser and database checks independently confirm deletion. No implementation commit or archive is implied by acceptance completion.
