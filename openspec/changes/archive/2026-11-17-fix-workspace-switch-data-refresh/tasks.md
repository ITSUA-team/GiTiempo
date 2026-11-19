# Tasks

## 1. Admin Projects

- [x] 1.1 Scope project rows, counters, member options and open actions to the current visit. In a mounted Projects view, switch between two populated workspaces and verify the displayed values and available actions before and after the destination resolves.
- [x] 1.2 Guard asynchronous completions. Cover a rapid A → B → A, an empty destination, a failed destination load, a rejected switch and same-workspace token renewal. Verify obsolete results cannot replace current data or load status and the initial mount loads each resource once.

## 2. Admin Members

- [x] 2.1 Reload members, project assignment choices and invitations on switch. In the mounted Members view, verify distinct rows and counters in both workspaces and independent handling of a delayed or failed invitation response.
- [x] 2.2 Reset open edits, dialogs and pending action targets. Exercise a switch during an assignment or invitation action and verify no action against an A identity can be submitted from B.

## 3. Admin Add Project

- [x] 3.1 Reload manager choices and reset the selected manager in the actual form state. Verify the submitted payload after switching cannot contain A's manager ID.
- [x] 3.2 Reset GitHub selection and reload import metadata for the active workspace while preserving the source mode. Cover distinct installations, already-imported boards or repositories, a late scan and a disconnected destination. Verify only a valid destination board can be submitted.

## 4. Admin Reports

- [x] 4.1 Reset the saved preset collection, active selection, saved baseline and dialogs on switch. Verify the mounted Reports view shows B's tabs and clears A's dirty indicator and actions, including when B has no presets.
- [x] 4.2 Isolate in-flight preset reads and writes by visit. Resolve an A mutation after B's list arrives and fail B's preset load in a separate test. Verify B's bar reflects only B's results and the report rows remain available within the existing request budget.

## 5. Integration verification

- [x] 5.1 Prepare manual QA in a local or test environment. Sign in as an admin with access to workspaces A and B. Record their distinct project totals, members, managers, invitations and saved report names. Use GitHub installations with distinct boards and import history for the import checks, or user-approved isolated GitHub metadata fixtures through the temporary local proxy while workspace switching and other API requests remain real. Verify the fixtures can distinguish the source data from the destination data.
- [x] 5.2 Manually reproduce [#522](https://github.com/ITSUA-team/GiTiempo/issues/522). Open Projects in A, select a member filter and expand a project edit, then switch to B through the header without reloading. Verify the route stays open, A's rows, counters, member selection and edit disappear immediately, and B's rows, counters and member options load automatically. Switch back and verify A's values return. Repeat with an empty destination and verify its empty state and counters.
- [x] 5.3 Manually check Members. In A, open a member edit or assignment and an invitation action where available, then switch to B. Verify the old actions close and the members, counters, assignment choices and pending invitations all belong to B. Open a fresh action and verify it offers only B's identities.
- [x] 5.4 Manually check manual project creation. On Add Project in A, select an eligible manager, then switch to B. Verify the source mode stays selected, the old manager clears and the dropdown contains B's eligible managers. Submit a disposable test project and inspect its request payload to verify it contains only B's selected manager ID. Remove the test project after checking the result.
- [x] 5.5 Manually check GitHub import using real metadata or the user-approved isolated GitHub fixtures through the temporary local proxy; explicitly record the method. In A, select an organization and board, start a repository scan and switch to B. Verify import mode stays open, A's selection and scan summary clear, and connection status, organizations, boards and import eligibility reflect B. Try a destination with no GitHub connection and verify its unavailable state prevents submission. Verify the late scan from A cannot restore its board or enable import.
- [x] 5.6 Manually check Reports. Load a saved report in A, change its configuration and open a preset action, then switch to B. Verify A's tabs, active selection, dirty indicator and action disappear, B's presets load with none selected, and B's report rows remain usable. Repeat with a destination that has no presets. Verify A's preset cannot be overwritten, renamed or deleted from B.
- [x] 5.7 Manually check delayed and failed requests using browser network throttling/request blocking or the user-approved temporary local API proxy. On each affected page, switch A → B → A while reads are pending and verify late responses cannot restore a previous visit's data or change the current loading state. Block a destination request and verify the relevant error state keeps source data unavailable. On Members and Reports, fail invitations and preset loading separately and verify the remaining destination content stays usable. Restore normal networking afterward.
- [x] 5.8 Record manual QA results for each scenario with workspace names, expected and actual results, and screenshots or request evidence for any failure. Verify every scenario above has a pass result or a documented blocker before marking manual QA complete.
- [x] 5.9 Run `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm exec openspec validate fix-workspace-switch-data-refresh --strict`. Record the results with the implementation.

## Initial verification record — 2026-11-10

Environment: local Admin SPA at `http://localhost:5174`, API at `http://localhost:3000`, branch `fix/522-workspace-switch-refresh`, implementation working tree based on `9eb23e66`. Signed in as Admin gitempo. Checks used the header workspace switcher without a page reload, at mobile and desktop widths.

Workspace A is **GI Tiempo**: Projects counters active/private/public **6/6/0**; Members active/pending/PM-assigned **37/170/1**; eligible manager **Alice (seed)**; saved report **SPA refresh QA 2026-10-29**. Workspace B is **GitHub OAuth acceptance 2026-10-09**: Projects **2/2/0**; Members **2/0/0**; no eligible manager choices; no saved reports. A includes Internal Platform and Demo Client; B includes My-test-org-for-clock projects. These distinguish the displayed source and destination data.

| Scenario | Expected | Actual result / remaining blocker |
| --- | --- | --- |
| 5.1 Fixtures | Distinct projects, members, managers, invites, presets and GitHub import history | Basic fixtures verified above. **Blocked in part:** current account requires GitHub personal-data authorization before import; distinct usable installations/boards were unavailable. |
| 5.2 Projects | Replace rows, counters and member choices; close old edit; preserve route; handle an empty destination | **Passed in part:** switching A → B on `/projects` with an expanded edit changed counters 6/6/0 → 2/2/0, showed only B projects and closed A's edit without reload. **Unverified:** selected-member filter reset, switch-back and empty destination; no empty admin workspace fixture was available. Automated mounted tests cover these cases. |
| 5.3 Members | Replace members, invites and assignment options; retire source actions | **Passed in part:** A → B changed 37/170/1 → 2/0/0; Alice's expanded edit closed, pending invitations disappeared. A fresh Oleksii edit offered B's GitHub project assignment, with no Internal Platform or Demo Client selection. Reverse switching also restored A's lists. Opened A's cancel-invite confirmation and dismissed it without mutation. **Unverified:** switch with that confirmation still open; the modal blocks the header. Stale confirmation and in-flight invitation cases are covered by mounted tests. |
| 5.4 Manual creation | Retain mode, clear A manager and submit only a B manager | **Passed in part:** selected Alice in A, switched to B, Manual mode remained and manager became Unassigned; B's dropdown had no options. **Blocked:** B has no eligible PM for the specified disposable-project payload check. Real PrimeVue form regression tests verify no source manager reaches submission. No project was created. |
| 5.5 GitHub import | Retain import mode, clear source selections/scan and use destination metadata | **Passed in part:** B's Import from GitHub mode showed authorization-required state and disabled submission. **Blocked:** the account lacks the GitHub personal-data authorization needed to choose a source board and start a real scan. No new OAuth grant was made. Component tests cover distinct installations, stale scans, retired child emissions and unavailable destinations. |
| 5.6 Reports | Retire source preset/dirty state/actions, reload presets and retain usable report rows | **Passed:** loaded A's preset, changed search to produce Unsaved changes, opened desktop Report options (Rename/Delete), then switched to B. A's tab and dirty state disappeared, Save was disabled and old Rename/Delete actions were unavailable. Clearing search showed B's two project rows and 2m total. Switching back restored A's preset tab with no active selection and disabled Save; A's report rows remained usable (46m for the selected October range). B provides the no-presets destination case. |
| 5.7 Network failures/races | Real browser throttling/blocking proves visit isolation and independent errors | **Blocked for manual execution:** the connected browser exposes no network throttling or request-blocking control. Network settings were not changed. Automated deferred-promise tests exercise A → B → A, failed destination reads, independent invitation/preset failures, stale mutations and same-claim renewal. These do not replace this manual task. |

No functional failure was observed in the executed manual cases. Browser accessibility snapshots supplied the recorded values; screenshots were inspected during the run but were not saved as repository artifacts. Blocked and unexecuted portions remain unchecked above.

Design review: compared the approved Projects, Members and Add Project frames before implementation. The fix changes state lifecycle and request handling; it adds no layout or styling changes and introduces no PrimeVue design compromise. Both mobile card and desktop table/action variants were exercised during acceptance checks.

Independent review rechecked synchronous GitHub-child retirement and destination permission gates after the initial findings were fixed; no remaining actionable findings in that scope.

Automated evidence:

- Final `pnpm test`: passed, 11/11 tasks plus 5 CI target-detection checks; Admin SPA 912 tests and User SPA 660 tests passed (`/tmp/gitiempo-522-final-test.log`).
- `pnpm typecheck`: passed, 11/11 tasks (`/tmp/gitiempo-522-typecheck.log`).
- `pnpm lint`: passed, 11/11 tasks; existing repository warnings remain (`/tmp/gitiempo-522-lint.log`).
- Final affected-file suite: passed, 133 tests in 8 files, including real Add Project form tests (`/tmp/gitiempo-522-focused.log`).
- `pnpm exec openspec validate fix-workspace-switch-data-refresh --strict`: passed.
- `git diff --check`: passed.

## Follow-up manual verification — 2026-11-10

This record supersedes the partial results for 5.2, 5.3, 5.4 and 5.7 above. The user approved replacing browser network controls with a temporary local API proxy. The proxy forwarded real authenticated API requests and applied only the specified delays or HTTP 503 responses; no GitHub metadata was simulated in this run. It logged paths, workspace IDs, response status and the disposable project's assignment payload, without tokens or authentication bodies.

An isolated local fixture workspace, **QA522 disposable 28ec7595-def3-4b9d-9db7-52a18bf69246**, supplied the empty destination and **QA522 destination PM**. Its counters were Projects **0/0/0**, Members **2/0/1**, with no invitations or presets. Fixture creation inserted only this workspace, its settings, one synthetic PM and the two required memberships in a transaction; existing workspaces were unchanged.

| Task | Result | Evidence |
| --- | --- | --- |
| 5.2 Projects | **Passed.** Selected Alice and expanded Internal Platform in GI Tiempo, switched to the existing GitHub acceptance workspace: filter became All members, edit closed, counters became 2/2/0 and member choices were only its two users. Switching back restored 6/6/0 and A's projects. Switching to the disposable empty workspace showed 0/0/0 and No projects have been created yet. All switches preserved `/projects`. | Browser DOM snapshots showed the selected filter before switching, All items unselected and two destination options afterward, then the empty table. |
| 5.3 Members | **Passed.** With Alice's edit open, delayed the switch response and opened Cancel invite before it completed. At successful destination switch the confirmation and old edit disappeared. The disposable workspace showed 2/0/1 and no invitations; opening its synthetic PM's edit offered no active project choices and no source assignments. | `members-switch-dialog-race`: real switch response HTTP 200 after 10 seconds. Browser snapshots captured the open source alertdialog before completion and its absence plus the fresh destination edit afterward. No invitation was canceled or resent. |
| 5.4 Manual creation | **Passed.** Selected Alice in A, switched to the disposable workspace: Manual mode remained, manager reset to Unassigned and the only eligible manager was QA522 destination PM. Selected it and created QA522 disposable manager switch. Only that PM was assigned; the project was then removed. | Real `POST /projects` returned 201 in destination scope. The subsequent `POST /projects/c5a7171c-9cde-4117-83e2-020a8da59f8a/assignments` returned 201 with `userId=c39ec626-6103-45a8-a6a9-375b8051318a`, the fixture PM. The create contract sends manager assignment in this separate request. A DB check confirmed exactly that one assignment before removal. |
| 5.7 Projects | **Passed.** Switched A → disposable destination → A while project reads were pending. Source data stayed unavailable during loading; final A counters were 6/6/0 with its correct rows. A separately failed destination read showed Failed to load projects and Try again, with no A rows. | `projects-single-old-A`: HTTP 200 after 20 seconds; `projects-destination-failure`: HTTP 503. |
| 5.7 Members | **Passed.** Switched A → destination → A with members pending; final A counters were 37/170/1. Separately failing destination invitations showed their inline error and retry while destination members and counters remained usable (2/0/1). | `members-second-old-A`: HTTP 200 after 20 seconds; `members-invites-independent-failure`: HTTP 503. |
| 5.7 Add Project | **Passed.** Switched A → destination → A with manager loading pending; selectors stayed unavailable during loading, then offered only Alice in final A. A separate destination manager-read failure left Unassigned, no Alice option and the request error. | `add-project-managers-old-A`: HTTP 200 after 20 seconds; `add-project-managers-confirmed-failure`: HTTP 503. |
| 5.7 Reports | **Passed.** Switched A → destination → A with preset loading pending. Final A had its one preset tab with no active selection and disabled Save. Separately failed destination presets displayed the preset error, while report summaries, Results and the destination empty table remained usable and A's tab stayed absent. | `reports-presets-old-A`: HTTP 200 after 20 seconds; `reports-presets-independent-failure`: HTTP 503. |

Request evidence: `/tmp/gitiempo-522-proxy-evidence.jsonl`. Intentional 503s above are expected fault-injection results, not product failures. Browser serialization of identical request URLs can queue subsequent reads; deterministic component tests separately prove arbitrary response ordering. No unexpected functional failure was observed.

The proxy was stopped, ordinary Admin SPA API configuration restored without editing environment files, and Reports checked again through the real API: the intentional error disappeared and A's preset and report content loaded normally. The API remains running on port 3000 and Admin SPA on port 5174.

Cleanup completed: the disposable project, its assignments, the temporary workspace/settings/memberships and the synthetic PM were removed. The active browser session was returned to GI Tiempo before cleanup. No fixture data remains in the local database.

## GitHub fixture verification — 2026-11-10

The user explicitly approved isolated GitHub metadata fixtures through the same temporary local API proxy for tasks 5.1 and 5.5. This method checks frontend workspace isolation; it does not certify live GitHub provider access or OAuth. Authentication, header workspace switching, membership/manager reads and ordinary API requests remained real. No GitHub authorization or installation was created or changed.

Task 5.1 **passed** with the distinct real workspace data recorded above and these additional contract-validated GitHub fixtures:

- Source **GI Tiempo**: organization `QA522-source`, 13 boards, `A already imported` marked Already added, repository `QA522-source/already` already tracked, and `A pending scan` outside the initial 12-board scan budget. Selecting the last board starts an independently delayed 30-second scan.
- Destination **QA522 disposable 6d2ca0ee-819d-4503-adfa-48bca846c3aa**: real Projects 0/0/0, Members 2/0/1, manager QA522 destination PM, no invitations or saved reports. Its GitHub fixture has organization `QA522-destination`, two distinct boards (`B already imported`, `B valid destination`) and separate imported-board/repository history. The valid board scans to `QA522-destination/valid-repo`.
- Disconnected destination **GitHub OAuth acceptance 2026-10-09**: real workspace membership with an explicitly disconnected GitHub fixture response.

All fixture response bodies were parsed against the shared production Zod contracts before the proxy started. GitHub fixtures were read-only, and no import was submitted or persisted. Request evidence is in `/tmp/gitiempo-522-github-evidence.jsonl`; tokens and authentication bodies were not logged. An initial proxy setup error blocked OPTIONS preflights for the import-history endpoints; the temporary proxy was corrected before the acceptance scenarios began.

Task 5.5 **passed** using those approved fixtures, superseding its original blocker:

| Scenario | Expected | Actual |
| --- | --- | --- |
| Source selection and pending scan | Imported board is blocked; another selection can start a scan | A already imported showed Already added and disabled Add project. Selecting A pending scan started `GET /github/projects/PVT_QA522_A_13/issues` at 10:53:37.994 UTC with a 30-second response delay; its derived name appeared and Add project remained disabled while scanning. |
| Switch during scan | Keep import mode, clear source selection/name/summary and reload destination metadata | Header switch to the disposable workspace completed without reloading `/projects/new`. Import from GitHub stayed selected; board and derived name cleared, summary disappeared, manager was Unassigned, and organization became QA522-destination. Only B's two board options appeared with its own 1-of-2 Already added count and repository data. |
| Late source response | Cannot restore A's selection or enable import | B's scans completed at 10:53:44.249 UTC. A's delayed scan returned HTTP 200 at 10:54:07.998 UTC, after the switch and B's metadata. The page still showed only B; with no board selected its derived name remained blank and Add project disabled. A's board and repository were absent. |
| Destination eligibility | Already-imported board blocked; valid B board can enable import | B already imported displayed its own QA522-destination/already summary and kept Add project disabled. B valid destination displayed QA522-destination/valid-repo and enabled Add project. No import was submitted. |
| Disconnected destination | Retain import mode and prevent submission | Switched to GitHub OAuth acceptance 2026-10-09. The authorization-required message replaced the board fields, derived name and summary cleared, and Add project was disabled. |

No unexpected product failure was observed. Cleanup completed: switched back to GI Tiempo, stopped the proxy, restored the normal Admin SPA API connection without changing environment files, and removed the temporary workspace/settings/memberships and synthetic PM. Database verification found zero remaining rows for both fixture IDs. After restoring the real API, Add Project showed the account's actual authorization-required state again, with no fixture organization or board. The real API remains running on port 3000 and Admin SPA on port 5174.

## Code review corrections — 2026-11-10

Follow-up to the review of implementation commit `606c4873`, still linked to [#522](https://github.com/ITSUA-team/GiTiempo/issues/522):

- Members identifies the current user from token scope while profile reload is pending. Unknown identity disables management actions. Members reads and invitation entry/submission require complete workspace/user claims and the admin role.
- Reports clears workspace-owned project/member filter IDs on a scope change, including IDs loaded from a saved preset. Same-scope token renewal preserves those filters. Report/options and preset reads and preset actions require complete workspace/user claims and an admin or PM role.
- GitHub browsing receives the retired child's abort signal and checks it before every owner/page request. Deferred pagination tests prove a source request cannot start a continuation after retirement.
- Project creation, project editing and member assignment keep necessary subsequent writes eligible after ordinary same-workspace navigation, without refreshing retired views, navigating or opening dialogs. Each in-flight operation owns a detached scope watcher that permanently retires remaining writes after an actual workspace, user, role or authentication change, including A → B → A after unmount. The watcher is stopped when the operation finishes.
- Projects and Add Project load rounding settings only for a complete admin scope. Tests use representative token claims instead of opaque access-token placeholders, including the real PrimeVue form suite.

Additional manual check through the real local API: on Reports in **GI Tiempo**, selected **Internal Platform**, then switched through the header to **GitHub OAuth acceptance 2026-10-09** without reloading. The project filter cleared and the source preset disappeared. Returned to GI Tiempo and opened Members: the **Admin gitempo** row had no Edit member button, while other members remained editable. This check used no proxy or simulated metadata and performed no data mutation. Delayed-profile, unauthorized-scope, retired-pagination and multi-write navigation cases are covered by deterministic regression tests; the full earlier manual matrix was not repeated for this correction pass.

The corrections change lifecycle and access behavior without layout/styling changes or a PrimeVue design compromise. The approved scope still excludes rewriting the existing report-row pagination implementation.

Final correction-pass verification:

- `pnpm test`: passed, 11/11 Turbo tasks plus 5 CI target-detection checks. Admin SPA freshly ran **947 tests in 89 files**; the other 10 tasks reused valid cache results (`/tmp/gitiempo-522-review-final-test.log`).
- `pnpm typecheck` and `pnpm lint`: passed, 11/11 tasks each, including fresh Admin SPA checks (`/tmp/gitiempo-522-review-final-typecheck.log`, `/tmp/gitiempo-522-review-final-lint.log`).
- Independent reviewer: **APPROVE**, no remaining findings in #522 scope; independently ran 173 tests in 11 affected suites and changed-file ESLint.
- Independent architecture review: **CLEAR** for the reviewed findings. Existing report-row pagination remains outside the approved scope and can continue an already-started paginated read across a switch; no global cancellation guarantee is claimed for that flow.
- `pnpm exec openspec validate fix-workspace-switch-data-refresh --strict` and `git diff --check`: passed.
