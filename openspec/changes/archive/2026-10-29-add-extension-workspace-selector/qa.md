# Workspace selector verification

Initial verification: 2026-10-15; latest follow-up: 2026-10-16. Issue: [#455](https://github.com/ITSUA-team/GiTiempo/issues/455).
Branch: `feat/455-extension-workspace-selector`, implementation working tree based on `1d84a1a7`.

Final review passed on 2026-10-16; all 21 tasks are complete. The user explicitly confirmed tasks 6.2 and 6.3 are verified, closing the remaining manual acceptance gates. Second-Escape host popup closure is accepted as non-critical. The latest section below records this user-reported acceptance separately from agent-run evidence. Earlier outstanding-gate statements below are historical and superseded by the final confirmation/review. Synchronization and archiving remain assigned to the user.

## Environment and scope

- Chrome for Testing 149.0.7827.55, unpacked Manifest V3 extension, headless browser controlled through CDP. Tests exercised the real popup, background worker, content script and Nest API, not mocked runtime responses.
- Disposable PostgreSQL database with all repository migrations, separate API/gateway on localhost ports 3036/3035, synthetic members with one or two memberships. No development or production account was used. Fixture setup supplied real API-issued extension sessions without exercising Firebase sign-in.
- Public issue: `ITSUA-team/GiTiempo#455`. Workspaces: A = Acme workspace, B = QA workspace B.
- Initial and follow-up QA builds used `EXT_TARGET=chrome`, `VITE_EXTENSION_API_BASE_URL=http://127.0.0.1:3035`, Vite dev mode. The original chrome-running/chrome-idle-no-name captures precede the final storage-queue hardening; the chrome-parity-* captures use the final implementation, except for the long-name prefix-only difference noted below. Final regular Chrome/Firefox builds were regenerated, with no QA port left in `apps/chrome-ext/dist`.
- Firefox 158.0 (BuildID `20261007201254`), isolated fresh profile and unpacked Firefox build, controlled through Firefox DevTools RDP on localhost. Real browser-action popups were opened with `browser.action.openPopup()` and captured by the DevTools screenshot actor. Popup targets were verified absent from the normal tab list and measured 320 × 480. The Firefox QA build used the same local API override and real Nest/PostgreSQL fixture as Chrome.
- Native Computer Use was unavailable; the follow-up also rejected access to the Codex app. Firefox and native dropdown capture were unavailable through that surface; the later RDP follow-up below supplied actual Firefox popup evidence. The browser helper also failed to launch; isolated CDP Chrome supplied the browser evidence below.

## Automated results

| Command | Result |
| --- | --- |
| `pnpm --filter chrome-ext typecheck` | Pass |
| `pnpm --filter chrome-ext test` | Pass: 12 files, 222 tests after the final session-isolation regression |
| `pnpm --filter chrome-ext build` | Pass: Chrome and Firefox |
| `pnpm typecheck` | Pass: 11 tasks |
| `pnpm lint` | Pass: 11 tasks; existing web-shared/user-web/admin-web warnings remain, no errors |
| `pnpm test` | Pass: 11 Turbo tasks plus 5 CI-target checks |
| `pnpm exec openspec validate add-extension-workspace-selector --strict` | Pass |
| `git diff --check` | Pass |

The first root test run timed out in two unchanged `user-web/src/views/ProjectView.spec.ts` cases under concurrent load. That file passed independently (14 tests), and both subsequent root runs passed. Final root results include API 576, shared 530, web-shared 228, web-config 18, user-web 569, admin-web 570 and extension 222 tests (after the final session-isolation regression). No backend source/contracts changed; the real API smoke checks below supplement existing API tests.

Builds warned that `json.schemastore.org` was unreachable, so online manifest schema validation was skipped. Package commands also report the existing node_modules/lockfile synchronization warning. No dependencies were installed or changed.

Independent review found and resolved: delayed session writes overwriting a newer login, logout skipping cleanup when a later login fails, and an initial storage failure leaving switching permanently locked. Regression tests defer actual storage application/reads and verify retry after snapshot failure. Other coverage includes serialized rotations, late revocation failure, stale action rejection, accepted Start before switch, denied capability, membership reconciliation, focus, Escape handling and timer workspace attribution.

## Design comparison — follow-up on 2026-10-15

Chrome comparison and design-source reconciliation are complete. The subsequent Firefox RDP follow-up supplies both approved popup variants, single-membership and long-name captures. Native expanded options and keyboard acceptance remain separate M04 checks.

Approved frames `cvEiV` and `V6FKLq`, reusable menu `w6xWc` and selector `A9XLx`/`eKwXu` were inspected through Pencil. Reference exports: [running](evidence/cvEiV.png), [email-only idle](evidence/V6FKLq.png). Pencil exports include the outer shadow around the 320 × 480 frame; browser captures contain exactly the viewport, so image pixel dimensions differ by the shadow bounds.

The final Chrome QA build exercises the real extension and API with synthetic accounts. Actual issue #455 has a longer title and different repository/project data from the design fixture; extra task-title lines follow the content. These are content differences, not pixel-identical fixture screenshots.

| Check | Pencil target | Chrome result |
| --- | --- | --- |
| Viewport / document overflow | 320 × 480 | 320 × 480; scroll width/height also 320/480 |
| Header logo | 28 × 28 at (20,20), GT | Match; product name 15/18px, no subtitle |
| Menu | x=80, y=56, width=220 | Match |
| Named running menu height | 242px | 242px |
| Email-only idle menu height | 193px | 193px |
| Selector | 188 × 34; running y=176, idle y=127 | Match; 13px/500 text, platform arrow |
| Menu padding / gaps / action height | 6px / 2px / 34px | Match |
| Running notice | 11px/600, one line, 29px row | Match |
| Timer / tag / task type | 36/44px, 12/15px, 14/17px | Match; task includes #issue number |
| Main button | x=20, y=418, 280 × 42 | Match in idle/running states |
| Workspace row / following card | Row (20,68), 280 × 16; card y=104 | Match; running row names the original timer workspace |
| Destructive token | #C62828 | Match; shared token used for Stop and Sign out |
| Font | Inter | Bundled Inter v4.1 variable WOFF2; loaded from extension storage, computed body font Inter |
| Long workspace name | No overflow | Select and destination remain within width; destination truncates with full escaped title |

Evidence: [named running](evidence/chrome-parity-running.png), [email-only single membership](evidence/chrome-parity-idle.png), [running with panel closed](evidence/chrome-parity-running-closed.png), [long name](evidence/chrome-parity-long-name.png). Matching JSON files contain safe DOM text, geometry, font status and viewport measurements; no credentials. The long-name capture precedes the final issue-number prefix only; its layout, select and workspace styles are final.

Corrections: fixed footer placement, restored approved GT header, supplied local Inter with its SIL OFL license, forced body font inheritance against Chrome's extension default font, corrected type/spacing/divider/shadow metrics, constrained long names and removed ARIA menu/menuitem roles around native form controls. Font-face CSS is popup-only, avoiding a GitHub-origin font request from the injected shadow UI. Independent review confirmed both overflow and ARIA findings resolved. A focused long-name/escaping regression was added; extension total is now 220 passing tests. Final root typecheck/lint/test and Chrome/Firefox production builds also pass. Inter asset comes from the pinned [upstream v4.1 font](https://raw.githubusercontent.com/rsms/inter/v4.1/docs/font-files/InterVariable.woff2), distributed with its [SIL OFL license](../../../apps/chrome-ext/public/fonts/LICENSE.txt); no package dependency was added.

Design-source reconciliation completed on 2026-10-15:

- Added the visible workspace row to both `cvEiV` (running) and `V6FKLq` (email-only idle): 12px/16px at (20,68), width 280; following cards start at y=104. The running row represents the timer's original workspace, independent of the menu's selected destination. Both primary actions remain at (20,418), 280 × 42.
- Updated the design's `color-destructive` variable from #D32F2F to canonical #C62828 and bound Stop to it; Sign out uses that variable too. Runtime/shared token definitions are unchanged.
- Recreated the two card/footer subtrees to resolve stale Pencil layout bounds while retaining the approved screen IDs and flex layouts. Final Pencil inspection reports no clipped descendants; screenshots verify the result. Updated reference exports linked above were written after correction. `git status` confirms `GITiempo.pen` is modified on disk. These two design-source deltas are closed.

The native select was focused through trusted CDP input; [capture](evidence/chrome-parity-native-options.png) shows focus only. Headless screenshot capture did not expose the platform options window, so expanded-options layout and first-Escape dismissal are not claimed verified. Unit keyboard/focus tests pass.

The earlier [Nightly/BiDi blocker report](evidence/firefox-parity-blocker.md) is historical. The later stable-Firefox RDP run below supersedes its lack of popup evidence. The user owns the remaining manual Firefox checks; browser acceptance remains incomplete.

## Firefox DevTools RDP follow-up — 2026-10-15

RDP access succeeded with stable Firefox 158.0; MCP setup was not needed. The fresh QA profile used a loopback-only debugger server with connection prompting disabled. No personal Firefox profile or account was accessed. The public issue was navigated through the active tab target; an automatically opened translation panel initially prevented `browser.action.openPopup()`, so it was dismissed and its automatic prompt disabled in this test profile.

Evidence: [email-only idle](evidence/firefox-rdp-idle-menu.png), [named running](evidence/firefox-rdp-running-menu.png), [single membership](evidence/firefox-rdp-single-membership.png), [long name](evidence/firefox-rdp-long-name.png). Matching JSON files record viewport, text, font state, selector options and geometry. The screenshot actor captured the actual browser-action browsing context at CSS-pixel scale 1, rather than an ordinary extension tab. Saved assertions: [Firefox scenarios](evidence/firefox-rdp-scenarios.json).

Both menu variants match the approved reference geometry: 220px wide at (80,56), heights 193/242px; selector 188 × 34 at (96,127)/(96,176). Inter is loaded. Workspace row is (20,68), 280 × 16; Start/Stop is (20,418), 280 × 42; Stop and Sign out compute to #C62828. All four Firefox captures have document scroll dimensions of exactly 320 × 480. The long name truncates within the native select; the platform arrow differs from the drawn design arrow. Fixture identity, task title, repository/project, timer value and the idle avatar differ from the design content. These are expected data/platform differences; the reference exports also include the outer shadow bounds.

RDP-driven DOM actions exercised the real popup/background/API and verified: single/multiple memberships, current-selection no-op (POST count unchanged), signed-out selector absence, membership failure + Retry, disabled Start/selector during delayed switching, one POST despite duplicate selection, popup close/reopen retaining B, and revoked B retaining A while reconciling the list. They also verified timer A keeps its original entry/workspace across switching to B, Stop from B ends A, and the next Start creates a B entry. These actions do not prove trusted native keyboard or expanded-options behavior.

Timer A `c70f9b27-6513-4c39-8c1b-d9aaa4229fa1` belongs to workspace `6dad9e26-5210-4ef1-97e3-d7384cdcece0`; subsequent B entry `50e5b765-d77f-4de9-af30-503593e41b42` belongs to `78843824-93f5-4d53-869f-dbe69912b0af`. Both entries were confirmed ended. The owned QA Firefox process, API and gateway were stopped and the disposable database dropped. The regular production Firefox build was regenerated successfully; no QA port 3035 remains in `apps/chrome-ext/dist`.

Independent evidence review passed the scoped Firefox static comparison against both updated reference exports, with no unintended layout delta identified. The overall parity/manual gate remains open for native interaction acceptance.

The subsequent browser follow-up below additionally verifies background reload/token refresh, direct-issue multi-tab mutations, independent web sessions and auth/mutation races. Native keyboard/options/Escape acceptance and Projects remain tracked in the matrix.

## Browser-assisted manual matrix

Results combine agent-run browser evidence with the user’s explicit completion report for tasks 6.2/6.3 on 2026-10-16. M04 and Projects M06 were closed by that user report; no additional per-browser versions or screenshots were supplied. Historical partial outcomes remain in the chronological follow-ups below. Saved safe UI observations: [chrome-observations.json](evidence/chrome-observations.json).

| Case | Chrome outcome | Firefox |
| --- | --- | --- |
| M01 | Pass for one membership (disabled), multiple memberships, current-selection no-op (unchanged switch request count), and absent selector after authentication recovery signs out. | Pass: single disabled, multiple selectable, current no-op, selector absent after sign-out. |
| M02 | Pass: selected B, started/stopped through popup; API/database entry belonged to B. | Pass: Start/Stop after selecting B created an entry in B; entry inspected in the test database. |
| M03 | Pass for popup reload, full QA browser/background restart and access-token recovery with Retry; each retained B. An intentionally invalid access token forced real refresh; no workspace fallback. | Pass: actual popup close/reopen retained B. Background event-page reload changed performance.timeOrigin, reconstructed B, and invalid-access refresh retained B after Retry (one real refresh POST). |
| M04 | Pass: prior static parity, trusted Tab and document Escape evidence plus the user’s explicit task 6.2 confirmation on 2026-10-16. Host-intercepted second Escape is accepted. | Pass: prior static parity, trusted Tab, outside dismissal and focus-over-ticks evidence plus the user’s explicit task 6.2 confirmation. Latest manual acceptance is user-reported; exact browser/build and new screenshots were not supplied. |
| M05 | Pass: timer A survived switch to B with the same entry ID; Stop from B ended A; next Start created entry B. Original-label correction is additionally covered by popup/content tests. | Pass: same A entry survived switch to B; row still named A; Stop ended A and next Start belonged to B. |
| M06 | Pass: prior real direct-issue cross-tab Start/Stop and destination refresh plus the user’s explicit task 6.3 confirmation on 2026-10-16, covering the remaining Projects pane acceptance. | Pass: prior real direct-issue cross-tab Start/Stop and destination refresh plus the user’s explicit task 6.3 confirmation. Projects acceptance is user-reported, not an additional agent-run browser test. |
| M07 | Pass: independent real SPA/extension switches; actual 320 × 480 action-popup Open profile opened the configured SPA profile and restored its own B session. | Pass: independent real SPA/extension switches; a native mouse click in the actual action popup opened profile and restored web B while extension stayed A. |
| M08 | Pass: failed list + Retry, delayed initial loading, available profile/sign-out, delayed switch, blocked Start, duplicate suppression and recovery. | Pass: same loading/failure/retry/pending-switch states, including delayed initial list. |
| M09 | Pass: earlier revoked-B rejection retained A and reconciled options; new invalid-access plus revoked-refresh case entered sign-in. | Pass: earlier revoked-B rejection retained A and reconciled options; new invalid-current-session case entered sign-in. |
| M10 | Pass: gateway failure before upstream dispatch required sign-in; fresh login recovered. Truncated response after real API acceptance required sign-in without optimistic success or immediate replay. | Pass: same gateway failure, recovery and accepted-response-body loss behavior. |
| M11 | Pass: delayed refresh then switch serialized; sign-out superseded a delayed accepted switch; late revoke failure could not restore auth; a newer fixture-backed login survived late switch cleanup. | Pass: the same four real-runtime/API cases. External OAuth-provider validation is outside this fixture. |
| M12 | Pass: Start blocked during switching; stale runtime Start rejected without an API POST; accepted Start/Stop settled in order with entry attribution preserved; real inactive-project denial in B disabled Start. | Pass: the same transition, stale-action, mutation-ordering and real API capability-denial checks. |

Entry evidence: A `9b69824b-0c0c-409b-a69c-1069f476abfb`, workspace `7b2de91e-be32-4260-ab15-3d91815f44b8`; B `42e4bcde-055d-45b3-8ac0-c1647e947043`, workspace `54d2def7-e0d6-4782-aed0-659f771182f8`. Both timers were confirmed ended before cleanup.

Cleanup confirmed for both runs: the owned Chrome/Firefox QA processes, API and gateway were closed, and the disposable databases were dropped. Follow-up entry `8e7d5104-814f-455b-84e7-f00560e233aa` was confirmed ended before cleanup.

## Documentation and remaining gates

`docs/ui/chrome-ext.md` now describes selector order/states, focus/dismissal, independent session persistence and global timer semantics. `docs/TECHNICAL-REQUIREMENTS.md` describes the same ownership/API behavior and corrects the outdated extension placeholder. `docs/API-ENDPOINTS.md` already documents both reused endpoints accurately; no contract edit was needed. Historical change artifacts were left intact.

The user’s 2026-10-16 explicit confirmation of tasks 6.2/6.3 closes the remaining M04 native interaction and M06 Projects acceptance. The earlier browser runs and their limitations are retained below for traceability. OpenSpec synchronization and archiving are outside these tasks; the user will handle them afterward. Repository reindexing could not run because codebase-memory tools are unavailable in this session.

The design reconciliation changed only the design, reference exports and documentation. The RDP follow-up added Firefox evidence and updated acceptance status; it made no implementation changes. Independent Pencil review confirmed both workspace rows, card/menu/button geometry, destructive bindings and absence of clipping. The automated results above belong to the preceding implementation verification; they were not rerun for the design/evidence-only follow-ups. The production Firefox build was rerun successfully after RDP QA. Strict change validation and whitespace checks passed after the documentation update. OpenSpec reported a telemetry DNS failure for `edge.openspec.dev` after successful validation (exit 0).

## Additional browser follow-up — 2026-10-15

The follow-up used a new isolated Firefox profile and headful Chrome for Testing profile against another disposable real Nest/PostgreSQL fixture. No personal browser profile was accessed.

- [Firefox lifecycle](evidence/firefox-lifecycle.json): after selecting B, reloaded the actual background page and verified its new performance time origin plus reconstructed B. An invalid access token caused one real refresh POST; the guarded first snapshot required Retry and the next retained B.
- [Firefox direct issue surfaces](evidence/firefox-direct-surfaces.json): injected Start in one actual GitHub issue tab created a B entry; injected Stop in another ended that entry. Switching back to A refreshed both destinations and enabled Start. The public organization Projects page exposed no project links; this does not establish access to a Projects issue pane, which remains unverified.
- [Chrome direct issue surfaces](evidence/chrome-direct-surfaces.json): the same cross-tab Start/Stop and destination refresh passed on actual issue #455; entry `dd52af96-2d21-4f48-9095-2a3cf764f407` belonged to B and was stopped. Public Projects discovery returned 200 without project links, so Projects acceptance remains outstanding in both browsers.
- [Firefox native input attempt](evidence/firefox-native-input.json): trusted ArrowDown and native mouse click opened the native selector (`:open` and `ContentSelectDropdownPopup`); a trusted outside click at (20,20) closed the account menu. Later key injection did not commit selection, and native Escape closed the host popup without reaching the content event log. This automation path does not establish physical-keyboard behavior or an implementation defect; M04 remains partial. No source workaround was introduced from this inconclusive result.

Both-browser error/auth/mutation evidence: [Chrome matrix](evidence/chrome-remaining-matrix.json), [Firefox matrix](evidence/firefox-remaining-matrix.json), [Chrome auth races](evidence/chrome-auth-races.json), [Firefox auth races](evidence/firefox-auth-races.json), and [lost-response audit](evidence/lost-response-audit.json). The final loss fixture forwards real API status/CORS headers, then truncates the response body; preflights bypass injected failures. The audit records accepted 200 switch POSTs and no immediate same-workspace replay. A gateway-injected 503 means failure before forwarding to the upstream API, not absence of an extension HTTP request. Earlier fixture attempts with preflight interference and an invalid cleanup statement were discarded and rerun on the corrected fixture.

M11 uses real API-issued pairs and real extension generation/rotation handlers. New login uses the local fixture's sentinel exchange to return an actual single-member session; it does not exercise a Firebase provider. Failed best-effort late logout is an injected 503. M12 denial comes from the actual API for an inactive external-reference project in B, with no provider request or mocked capability response; the fixture is restored afterward. [Firefox focus over ticks](evidence/firefox-focus-ticks.json) additionally verifies the same select node, focus and selection survive changed timer text, then stops the timer.

Independent read-only evidence review confirmed Firefox lifecycle, both auth-race suites and both final M08–M12 matrices, and found no credentials in those artifacts.

Session independence and profile navigation now pass in both browsers: [Chrome M07](evidence/chrome-m07.json) and [Firefox M07](evidence/firefox-m07.json). Both used a real QA user SPA on localhost:5185 backed by the disposable API. Web A→B left extension B unchanged; extension B→A left web B unchanged. Actual browser-action Open profile controls opened a new configured `/profile` tab and restored web B. Firefox used the native mouse completion-callback sequence; Chrome used the real action-popup DOM with a user-gesture CDP evaluation. Independent evidence review confirmed both M07 passes and found no credentials in either artifact. No external OAuth provider or personal account was involved.

OpenSpec progress is 18/21: 6.1 and 6.4 are complete; 6.2 awaits M04, 6.3 awaits Projects acceptance in M06, and 6.5 awaits those gates. Synchronization and archiving remain assigned to the user and are not tasks in this change. No implementation source was changed during this follow-up.

Final [cleanup record](evidence/followup-cleanup.json): no owned timers remained running; the isolated browsers, SPA, API and gateway were stopped, their five ports were confirmed closed, and the three known disposable databases were confirmed absent. Fresh production Chrome and Firefox builds passed, and neither QA origin remains in the generated extension output. The full automated suites were not rerun for this evidence/documentation-only follow-up; their preceding implementation results remain recorded above.

## Authenticated Projects access follow-up — 2026-10-15

The user supplied [GiTimpo project #7](https://github.com/orgs/ITSUA-team/projects/7). The authenticated in-app browser opened its board and issue #455 in the real side panel: [exact pane URL](https://github.com/orgs/ITSUA-team/projects/7/views/1?filterQuery=455&pane=issue&itemId=272232489&issue=ITSUA-team%7CGiTiempo%7C455). The board filter was temporary and was not saved; no issue/project data was edited.

[DOM observations](evidence/projects-pane-access.json) and [panel screenshot](evidence/projects-pane-access.jpg) establish that the current GitHub panel has `id="issue-viewer-sticky-header"`, a parent suitable for insertion, and the canonical issue link/title expected by `github-context.ts`. The identifier is an element ID, not a `data-testid`; the absent test ID is not a compatibility failure.

The in-app browser has no loaded test extension or injected timer control, so this is access/anchor evidence only. It does not complete M06, and it does not transfer authenticated GitHub access to the isolated Chrome/Firefox QA profiles. Completing M06 requires an authenticated supported browser with the changed extension loaded against the test API. Native Firefox access was also retried and returned `Computer Use permissions are not granted`; physical keyboard/options acceptance remains outstanding. Progress remains 18/21, with no implementation change, synchronization or archiving.

## DevTools keyboard follow-up — 2026-10-15

At the user's request, another isolated Firefox 158.0 profile was connected through loopback-only DevTools RDP and loaded with the unchanged Firefox QA build against a fresh disposable real API/database. [Firefox keyboard evidence](evidence/firefox-devtools-keyboard.json) records a privileged `nsITextInputProcessor` transaction in the browser window, rather than untrusted DOM `dispatchEvent` keys. Trusted Tab reached Workspace, then Open profile, then Sign out. Escape dismissed the account menu when native options were already closed. The starting trigger focus and later native-list closure were supplied by the harness and are explicitly distinguished from tested key outcomes.

ArrowDown opened the native selector (`:open` became true), but logical Enter did not close or commit its native options. This is an incomplete automation path, not a product failure. It does not complete M04's native selection/Enter or first-Escape acceptance, and it supplies no native expanded-list screenshot. Mozilla's [popup-input limitation](https://bugzilla.mozilla.org/show_bug.cgi?id=1891165#c6) and [Browser Toolbox scope](https://firefox-source-docs.mozilla.org/devtools-user/browser_toolbox/) explain why privileged document input does not establish all native-popup behavior.

The same follow-up used Chrome for Testing 152.0.7977.54 with an isolated profile and the current QA extension. [Chrome keyboard evidence](evidence/chrome-devtools-keyboard.json) confirms trusted [CDP Input](https://chromedevtools.github.io/devtools-protocol/tot/Input/) events in the actual 320 × 480 browser-action popup: Tab reached Workspace, Open profile and Sign out; Escape dismissed the menu with options already closed. The harness established the starting avatar/select focus. An initial unseeded focus assumption and a later popup-loading race were corrected before the recorded logical focus checks.

Space did not open this platform's native selector; Alt+Down did (`:open` true). Subsequent ArrowDown/Enter reached the popup document but did not commit/close the native options, so native selection remains unverified in Chrome too. The [CDP page capture](evidence/chrome-devtools-open-options.png) shows only the popup and focused control, despite the open native state; it is not expanded-options visual evidence. Neither browser result proves first-Escape dismissal of the open native list. No implementation change was made from these tooling outcomes.

The in-app browser's authenticated Projects panel remains separate from the isolated test profiles, which have no GitHub sign-in. No credentials or cookies were transferred. The real panel's mount anchor is confirmed above, but Projects Start/Stop acceptance remains outstanding. Progress stays 18/21.

[DevTools cleanup](evidence/devtools-cleanup.json) confirms no test timers required stopping, both owned browsers and the API/gateway were closed, all four test ports are closed, and the disposable database is absent. Fresh production Chrome/Firefox builds passed after QA; generated output contains neither local QA origin. Strict change validation, whitespace checks, evidence JSON parsing and evidence-link checks passed. Full tests were not rerun for this documentation/evidence-only follow-up.


## User manual feedback and targeted fixes — 2026-10-16

The user reported: first Escape closes the native Workspace options, second Escape closes the entire extension popup rather than only its account menu. The exact browser/build was not supplied in this report. This is newer physical-interaction evidence; the earlier logical DevTools Escape results did not establish native host-popup behavior.

The popup document handler now calls `preventDefault()` when it handles Escape for an open account menu. It preserves an already-consumed native-selector event and leaves Escape unconsumed when the account menu is closed. Cancelable regression tests verify these boundaries; account-menu test instances are destroyed between tests to remove document listeners. This fixes the missing cancellation for hosts that deliver the event. It is not evidence of a physical Chrome/Firefox retest.

Firefox has a documented host limitation, [Mozilla bug 1443758](https://bugzilla.mozilla.org/show_bug.cgi?id=1443758): browser-action Escape can close the popup without letting extension content intercept it. Chromium explicitly tests cancellation by JavaScript in its [popup interactive tests](https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/browser/ui/views/extensions/extension_popup_interactive_uitest.cc). Replacing the native select would not itself remove Firefox's host-level popup behavior. No custom control or silent spec exception was introduced. M04/6.2 and final acceptance remain unresolved for the specified menu-only Escape behavior on Firefox, alongside the outstanding keyboard/visual subcases.

The user also reported a failed external-issue timer insert: [screenshot](evidence/user-timer-start-failure-20261016.png). A read-only inspection of the local database confirmed the reported workspace exists, there is no running timer for the reported member, `invoices` and `time_entries.invoice_id` are absent, `0023_external_reference_project_policy` is recorded, and `0022_tricky_black_panther` is not. The current runtime schema includes `invoice_id`, and that exact column appears in the failed SQL. Existing migration 0022 recreates the missing invoice table/column, foreign keys and indexes. The installed Drizzle migrator only applies migrations newer than the greatest recorded timestamp, so an ordinary migrate command would skip this older missing migration. No backend schema or contract change is needed to repair this local state.

[Read-only preflight](evidence/local-invoice-migration-preflight.json) and a [prepared repair script](evidence/repair-local-invoice-migration.mjs) record the focused remedy. The script checks local-only connection, the exact reported workspace, the expected migration gaps and missing objects, then requires `--apply` to execute the exact existing 0022 SQL plus its journal record in one locked transaction. It verifies the table, column, foreign key and index before commit. Running without `--apply` performs no writes. The older missing 0010 journal entry and hash drift in recorded 0011/0017 are pre-existing; they are not rewritten or repaired by this script.

The user explicitly approved applying migration 0022 and verifying the timer on 2026-10-16. The [applied transaction record](evidence/local-invoice-migration-applied.json) confirms the table, column, foreign key and index exist and the journal insert committed. Independent review first found a journal-integrity guard gap; it was fixed before application. The script now pins the approved SQL SHA-256, rejects unknown/duplicate/missing history rows, and permits only the documented older hash drift. Re-review passed. Historical 0010/0011/0017 state was preserved.

[Post-repair timer API verification](evidence/post-repair-timer-api.json) passed all 8 external-GitHub e2e cases using the API package's Vitest 4.1.4 against the repaired local database. Real reference Start requests returned 201 and Stop returned 200; tests also checked task reuse, time-entry fields, member-specific visibility and capability/authorization paths. Synthetic fixture users/workspaces/entries were cleaned by the suite. The initial invocation accidentally used root Vitest 3.2.4: 7 cases passed, but one project-detail GET returned HTML; rerunning with the API package's correct runner passed all 8. This was a runner discrepancy, not a remaining timer failure.

Existing user timers and entries were not created, modified or deleted. The local database cause is repaired; physical extension retry and GitHub Projects Start/Stop remain browser acceptance items. This incident does not invalidate earlier tests against disposable databases with all migrations applied.

Fresh verification: root `pnpm typecheck`, `pnpm lint` and `pnpm test` passed (11 Turbo tasks; existing lint warnings remain). Extension tests passed: 12 files / 221 tests, including 51 focused popup tests. Production Chrome and Firefox builds passed; online manifest-schema validation was unavailable, as in earlier builds. Strict OpenSpec validation and `git diff --check` passed; all 30 evidence JSON files parse and evidence links resolve. Generated output has no QA API/SPA origin. No backend source was changed; the 8-case API e2e run above passed after the approved local repair. Codebase-memory indexing tools are unavailable in this session.

Progress remains 18/21; no synchronization or archiving was performed.

Final independent review passed the repair-script guards and Escape fix. The native Firefox host limitation and remaining browser acceptance gates are still explicit.


## User confirmation and accepted Escape behavior — 2026-10-16

The user confirmed: “так, все працює. Другий Escape закриває попап, але це не критично”. [Recorded feedback](evidence/user-manual-confirmation-20261016.json) closes the reported timer-start incident after the migration repair and accepts host-level popup dismissal on the second Escape as non-critical. No further Escape workaround is requested. The first Escape closes native options; where the host delivers a later Escape to the document, the handler still cancels popup closure and dismisses only the account menu.

The change's design, delta-spec, UI guidance and manual expectations now explicitly permit the accepted host-interception behavior; main-spec synchronization and archiving remain assigned to the user. Earlier references above to unresolved menu-only Firefox Escape acceptance are historical and superseded by this approval.

This confirmation does not name a browser/version or separately report GitHub Projects Start/Stop, native options screenshots or keyboard selection in both browsers. Those unreported checks are not converted into per-browser passes. Task 6.2 remains open for the other M04 evidence, 6.3 for Projects M06, and 6.5 for final review after those gates. Progress remains 18/21. No implementation source or database changes were needed for this documentation follow-up.

## Final manual acceptance and review — 2026-10-16

The user explicitly confirmed: “6.2 та 6.3 перевірено. Зроби фінальний перегляд”. [Recorded confirmation](evidence/final-manual-acceptance-20261016.json) closes tasks 6.2 and 6.3, including the remaining M04 native interaction and M06 Projects checks. This is direct user-reported acceptance; no new browser/build versions, screenshots or individual case observations were supplied. The previous second-Escape exception remains accepted. Earlier statements that these gates remain open are superseded by this report.

Final independent popup/design review passed. Runtime review found one medium-severity concurrency gap: a new login’s first 401 recovery could share a superseded session’s pending refresh and incorrectly report expiry. The fix associates each shared refresh with both its session epoch and refresh token, keeps rotations serialized, and guards cleanup by request identity. A deferred regression reproduces A refresh → B login → B 401 → B’s own queued refresh, asserting success and B’s persisted pair. The test uses distinct access tokens so the B request actually takes the 401 path. Targeted independent re-review approved the corrected code and regression; no findings remain.

Fresh post-fix root `pnpm typecheck`, `pnpm lint` and `pnpm test` passed (11/11 Turbo tasks; the changed extension checks ran fresh, 10 unrelated tasks used valid caches; 5 CI-target tests also passed). Extension: 12 files / 222 tests. Existing repository lint warnings remain with no errors. Chrome and Firefox production builds passed after the production fix; online manifest schema validation remains unavailable. Neither local QA API/SPA origin remains in the output. The earlier 8-case post-repair API e2e run passed; this final fix changes only extension refresh coordination and its unit regression, with no backend or database edits.

Documentation review confirms selector placement/states, independent extension sessions, global timer behavior and the accepted Escape exception agree across the UI guidance, technical requirements and delta-spec. The saved Chrome/Firefox parity evidence matches the approved `.pen` frames; latest native/Projects manual acceptance is user-reported as described above. A broken relative font-license link in this report was corrected. Strict OpenSpec validation, `git diff --check`, all 33 evidence JSON parses and local evidence-link checks passed. Codebase-memory reindexing remains unavailable because no indexing tools are exposed in this session.

[Final review record](evidence/final-review-20261016.json). Progress: **21/21 complete**, including task 6.5. No blocking findings remain. Main-spec synchronization and archiving remain assigned to the user; neither was performed. No commit was created during this final review.


## Quality-review follow-up — 2026-10-16

A subsequent branch review found one HIGH popup lifecycle defect and two MEDIUM gaps; this supersedes the earlier statement that no findings remained. The user requested a fix for HIGH and regression tests only for MEDIUM.

The HIGH fix separates membership-load and workspace-switch request ownership, clears transient workspace state on sign-out, and guards delayed workspace snapshot refreshes. Regression coverage exercises reopening the account menu during a pending switch and signing out/signing in while the old switch completes. Approved account-menu frames `cvEiV` and `V6FKLq` were inspected; this follow-up changes request coordination only, with no markup, styling, or design-file changes. Existing manual acceptance and the accepted Firefox Escape behavior remain applicable.

Two executable `it.fails` regressions document the still-open MEDIUM defects: a generic snapshot received while the account menu is open can leave page capability unavailable after dismissal, and a storage-read failure during final workspace-switch reconciliation rejects instead of returning a structured failure result. These are expected failures, not successful acceptance checks or skipped tests. Remove the respective `fails` modifier when implementing each fix. The background handler is exported solely to exercise the latter contract directly without an unhandled message-listener rejection or timeout.

Fresh verification: root `pnpm typecheck`, `pnpm lint`, and `pnpm test` passed (11/11 Turbo tasks; 10 unrelated tasks reused valid caches). The extension ran freshly: **12 files, 224 passed and 2 expected failures (226 total)**; the 5 CI-target checks also passed. Both HIGH regressions failed before the fix and pass afterwards. Each MEDIUM test was also run without `fails` to verify that it fails on the intended contract assertion, not a harness error. Chrome and Firefox production builds passed; online manifest-schema validation was skipped because the schema host was unreachable. Strict OpenSpec validation passed; its optional telemetry could not reach the network. Existing repository lint warnings remain, with no new errors. Codebase-memory indexing tools are not exposed in this session, so reindexing could not run. No backend/database behavior changed and no new physical-browser acceptance run was performed. Main-spec synchronization and archiving remain assigned to the user.

Independent review passed after strengthening the popup MEDIUM test to require a new page-context snapshot request after the broadcast (prior setup calls are cleared). The ordinary-test reproduction then failed specifically because that new request is absent. After this test-only adjustment, both changed suites passed again (78 passed, 2 expected failures), and extension typecheck/lint passed. No additional HIGH/MEDIUM issue was found in the scoped fix; the two documented MEDIUM product defects remain open by request.


## MEDIUM remediation — 2026-10-16

The user subsequently authorized fixing both MEDIUM defects. The earlier expected-failure status above is historical; the regression tests are being converted to ordinary acceptance checks as part of this follow-up. Scope remains popup state reconciliation and background error handling; no main-spec synchronization or archiving is included.

Both MEDIUM defects are fixed. A generic broadcast received while the account menu is open now triggers a contextual snapshot refresh without the loading screen or menu dismissal. A dedicated refresh generation and captured user/workspace identity reject stale responses; switch, load, sign-out and destruction invalidate outstanding refreshes. Regression coverage verifies selector focus/menu preservation, a newer authenticated snapshot superseding an older response, and safe failure followed by Retry recovery.

Final workspace-switch reconciliation now catches storage errors, clears the switch flag, broadcasts a conservative error snapshot and returns a structured failure without deleting tokens or rotating again. The normal callback-level regression verifies response delivery, broadcast and recovery on the next snapshot request. A separate deferred regression completes a newer login before rejecting the old switch's final read. The snapshot cache records its session generation, so the old request returns and broadcasts the verified newer snapshot with the switch flag cleared. If no current-generation cache can be established, the old fallback is not broadcast.

Fresh final verification: root `pnpm typecheck`, `pnpm lint`, and `pnpm test` passed (11/11 Turbo tasks; 10 unrelated tasks reused valid caches). The extension suite ran freshly: **12 files, 230 passed, zero expected failures**; the 5 CI-target checks also passed. Chrome and Firefox production builds passed. Online manifest-schema validation was unavailable because its host was unreachable; strict OpenSpec validation passed, with only optional telemetry network errors. Independent review approved both fixes and the newer-login race regression. `git diff --check` passed. Codebase-memory reindexing remains unavailable because those tools are not exposed. No markup, CSS, design-file, backend or database changes were made, and no additional physical-browser acceptance run was performed. Existing approved design parity/manual acceptance remains applicable. Main-spec synchronization and archiving remain assigned to the user.

## Accepted review remediation — 2026-10-16

The user accepted the seven justified follow-up items from the review of `f9fe5822`; the bounded [follow-up plan](review-followup.md) records the implementation and verification scope.

Popup reconciliation failures now have a separate error field and reuse the existing workspace Retry action. Successful reconciliation clears only that error; a rejected switch remains visible through automatic membership reload. A newer membership-load failure takes precedence over an older reconciliation failure. Authentication loss resets workspace state and invalidates pending membership/switch responses, preventing stale menu state from returning after login.

Background membership loading now uses a stored-session check before its membership request, retaining the real unauthenticated/provider-cleanup snapshot and the final membership-versus-workspace validation. The discarded membership GET in the switch catch is removed; final authoritative snapshot reconciliation and popup-owned membership reload remain intact. A successful ordinary menu open now avoids the two requests from the redundant initial snapshot (approximately five API requests instead of seven, excluding token refresh).

Fourteen new ordinary regressions cover initial/post-refresh switch transport failures, session cleanup and no replay; injected Start/Stop disabling and click guards; background rejection/re-entry/final-workspace mismatch and unauthenticated membership state; popup reopening/retry recovery, latest-error priority, authentication loss/restoration, switch-error retention, and accessible loading. Existing membership coverage locks the reduced request count, and the accepted Start-before-switch test now explicitly checks its successful response. Before the fixes, regression runs exposed the missing reconciliation Retry, the discarded catch GET, and the extra initial snapshot requests. Recovery assertions wait for completed reconciliation and verify the authoritative Workspace Beta selection, rather than passing while loading temporarily hides an error.

Fresh final checks passed: root `pnpm typecheck`, `pnpm lint`, and `pnpm test` each completed **11/11 Turbo tasks**, with the changed extension executing freshly and 10 unrelated tasks using valid caches. Extension results: **12 files / 244 passed, no expected failures**; all 5 CI-target checks passed. `pnpm --filter chrome-ext build` produced both Chrome and Firefox builds. Independent code/spec/security review returned **APPROVE**; independent architectural review returned **CLEAR**, including the final error-priority adjustment. Static diagnostics and `git diff --check` are clean. `pnpm exec openspec validate add-extension-workspace-selector --strict` passed.

Scoped design parity review re-read and visually inspected approved `.pen` frames `cvEiV` and `V6FKLq` through Pencil. The native Workspace selector remains above Open profile and Sign out, with the same normal-state markup, dimensions, typography and styling. The only rendering change extends existing error/status priority and the existing Retry action to reconciliation failures, an undrawn error state already permitted by the design defaults. No normal-state visual delta was identified in this source/reference review; no new live-browser screenshot or physical-browser acceptance run is claimed. Existing manual acceptance remains historical evidence.

Limitations: the online manifest schema host was unreachable, so the build skipped that optional validation; existing unrelated lint warnings and the node_modules/lockfile warning remain. Codebase-memory indexing tools are not exposed, so reindexing could not run. No backend/schema source changed. Main-spec synchronization and archiving remain assigned to the user.
