# Manual acceptance: extension workspace selector

Planning artifact for [#455](https://github.com/ITSUA-team/GiTiempo/issues/455). **Status: manual acceptance complete. On 2026-10-16 the user explicitly confirmed tasks 6.2 and 6.3 are verified, closing the remaining M04 and Projects M06 gates. Final review (6.5) also passed; all 21 tasks are complete. See `qa.md` for agent-run evidence, user-reported acceptance and final review.**

## Setup

- Build and load the changed extension in both supported browsers, Chrome and Firefox, against a local/test API. Run the matrix in each browser and record extension commit/build, browser version, environment and date. Use Chrome's service-worker lifecycle and Firefox's background event-page lifecycle for restart checks.
- Confirm the API database has the migrations required by its runtime schema. A timer insert mentioning missing invoice linkage is an environment failure to investigate, not a passed tracking case. See the 2026-10-16 local diagnosis in `qa.md`.
- Use a test member with active memberships in A and B, plus an account with only one membership. Include a no-display-name account and long workspace names for layout checks.
- Have a direct GitHub issue and a GitHub Projects issue pane open, including a second tab with an injected control. Use test issues and test time entries.
- Keep a user/admin web-app session open to verify independence. Have test admin access to revoke a membership and a test workspace/project capability-denial fixture.
- Use browser developer tools or a local test harness for delayed/failed requests and expired access tokens. Record which failure was induced without recording credentials or tokens.

## Cases

| ID | Procedure | Expected result |
| --- | --- | --- |
| M01 | Sign in with one membership; open the account menu. Repeat with multiple memberships and select the current workspace. | Single membership remains visible and disabled; multiple memberships are selectable; selecting the current one sends no switch request. Signed-out popup has no account selector. |
| M02 | With A selected and no timer, choose B, wait for reconciliation, then start/stop from the popup. Inspect the resulting time entry in the app/API. | Workspace B is shown only after switch success; entry belongs to B; no duplicate timer or request. |
| M03 | After selecting B, close/reopen the popup, restart the Chrome service worker or Firefox background event page as appropriate, then exercise access-token refresh. | B remains selected after each step; no silent fallback to login's default workspace. |
| M04 | Open both normal menu variants and compare screenshots with `.pen`. Expand options; use a long name and keyboard Tab/arrows/Enter/Escape, and click outside. Keep the menu open over timer ticks. | Selector is above Open profile; correct identity/timer notice, tokens, spacing and 320 × 480 layout; no clipping. Focus/selection survive ticks; accessible label/status; first Escape dismisses native options, and a later Escape dismisses the menu when delivered to the document. A browser host intercepting that later Escape may close the entire popup; the user accepted this behavior on 2026-10-16. |
| M05 | Start a timer in A, switch to B, observe it, stop it, then start a new timer. Inspect both entries. | Original timer and elapsed time remain visible, entry stays in A, second Start is unavailable while running, Stop succeeds from B, new entry belongs to B. |
| M06 | Switch with direct issue and Projects issue-pane controls open in multiple tabs. Start from each surface separately, stopping between cases. | Every surface refreshes its destination/capability; each new entry belongs to the selected workspace. Old controls cannot dispatch a stale Start. |
| M07 | Select A in the web app and B in the extension, then change the web-app workspace. Open profile from the extension. | Neither switch changes the other client's session. Profile opens at the configured origin and respects the web app's own session. |
| M08 | Delay membership loading, fail it, and retry. Then delay a switch and attempt repeat selections. | Loading/error states are clear, selector is disabled as appropriate, retry recovers, profile/sign-out remain usable, repeated input does not cause competing rotations. |
| M09 | Revoke target B after listing it and attempt selection. Separately invalidate the current session and try switching. | Target denial retains the valid current workspace, refreshes options and reports failure; invalid current authentication enters recovery/sign-in without falsely selecting B. |
| M10 | Fail a switch before dispatch, then simulate a response lost after server acceptance. Recover connectivity. | No optimistic success or blind replay of the old refresh token; authentication is reconciled or sign-in is requested; tracking remains unavailable until context is valid. |
| M11 | Trigger refresh while switching; repeat with sign-out during a delayed switch and with a new login before the old response arrives. Observe best-effort revocation of any late successful switch pair; repeat with revocation failing. | Valid rotations complete in order; sign-out stays signed out; late pairs receive bounded best-effort revocation without delaying local cleanup; revocation failure cannot restore the session; a late response cannot replace or revoke a newer login. |
| M12 | Delay a Start/Stop and request a switch; try a stale control during switching. Then switch into a workspace where starting is denied. | Accepted mutation settles in its original workspace; no new mutation dispatches during transition; old preflight is rejected; fresh denial is shown without reusing old permission. |

## Evidence and completion

Browser follow-ups on 2026-10-15 passed M01–M03, M05 and M07–M12 in Chrome and Firefox, plus static `.pen` parity, trusted DevTools Tab order, document Escape and direct-issue M06 cross-tab mutations. Native interaction M04 and Projects M06 were then closed by the user’s explicit task 6.2/6.3 confirmation on 2026-10-16. That latest acceptance is user-reported; exact browser/build versions and new screenshots were not supplied. The chronological feedback below records earlier gaps and their resolution.

For every case record Pass/Fail/Blocked, date, exact reproduction, observed result and evidence reference in `qa.md`. Include popup screenshots for both approved frames and safe entry identifiers/workspace names for tracking assertions. Record visual differences explicitly and resolve unintended ones. Stop any test timer at the end and restore test fixtures. A blocked case is an outstanding acceptance item, not a pass.


## User feedback — 2026-10-16 (historical; superseded below)

First native-options Escape closed the options; second Escape closed the entire extension popup. Browser/version was not supplied. Recheck menu-only dismissal in Chrome with the new cancel-default handler. Firefox can consume Escape at its browser-action host before the document receives it ([Mozilla bug 1443758](https://bugzilla.mozilla.org/show_bug.cgi?id=1443758)); keep this requirement unresolved rather than calling logical DevTools input a physical-browser pass. The avatar toggle/outside dismissal remain available.

A real external-issue Start failed with a database insert error. The local database is missing migration 0022's invoice objects while 0023 is already recorded. The user approved migration 0022; it was applied and all 8 external-GitHub API e2e tests passed with successful Start/Stop. Physical extension retry remains to confirm the user-facing result; inspect the entry workspace and end the test timer. Projects acceptance remains outstanding.


## User acceptance update — 2026-10-16

The user confirmed the extension works after the timer repair and explicitly accepted the second Escape closing the entire popup as non-critical. This supersedes the earlier unresolved menu-only Escape expectation and confirms the reported physical timer retry. No additional workaround is required. Exact browser/version, Projects-pane Start/Stop and the other per-browser native-selection/visual subcases were not separately reported; their evidence requirements remain open.


## Final manual acceptance — 2026-10-16

The user explicitly confirmed: “6.2 та 6.3 перевірено. Зроби фінальний перегляд”. This closes both tasks and their remaining M04 native-interaction and M06 Projects acceptance gates. [Recorded confirmation](evidence/final-manual-acceptance-20261016.json) distinguishes this user report from agent-run checks. It supersedes the earlier outstanding-gate statements above. Second-Escape host popup closure remains an accepted non-critical behavior. Main-spec synchronization and archiving are reserved for the user.
