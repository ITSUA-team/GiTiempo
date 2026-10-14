# External GitHub extension tracking — execution evidence

Date: 14 October 2026. Branch: `feat/external-github-time-tracking`. Current source: committed `e0714382` plus the documented local Admin report, User dialog and Projects parity corrections and approved Pen updates. Earlier sections describe their historical build bases; the final matrix and appended completion evidence supersede historical pending labels. No new commit, push, production migration/deployment, archive or Store submission was performed in this follow-up. Production privacy publication/verification is explicitly skipped by the user.

## Environment and safety boundary

A disposable PostgreSQL cluster on port 55481 was used for migration, collision/race probes, API e2e and controlled HTTP requests. The local Nest API listened on `127.0.0.1:3019`; frontend previews used 5183/5184. Synthetic GiTiempo members had no GitHub account link, organization allow-list or App installation. Test credentials/tokens were kept in restricted temporary files and are omitted here.

Chrome for Testing 152.0.7977.54 loaded the unpacked local **0.1.1** candidate. The user permitted local testing against `ITSUA-team/GiTiempo` and `My-test-org-for-clock/test-repo`. Public issue [GiTiempo#318](https://github.com/ITSUA-team/GiTiempo/issues/318) loaded with canonical issue identity and the issue-specific DOM title. The private test repository returned GitHub 404 in this isolated signed-out browser. Its absence cannot establish anything about its App-installation state. Public repository Projects listed no accessible projects. No GitHub issue/project data was modified.

Installed Firefox is 157.0.1; its native UI entry point returned **Computer Use permissions are not granted** during the initial run. Firefox packaging/build checks passed. The later user-attested private/direct/Projects injected/popup smoke passed in Firefox; that browser's version was not independently collected. The later user confirmations cover the requested Firefox transitions and errors; those runtime checks are user-attested, as recorded in the final matrix.

## Executed Chrome interactions

1. Opened the public issue in the isolated browser with no GiTiempo session. Injected control identified the issue and asked for GiTiempo sign-in; no Start was available.
2. Installed a synthetic, local-only GiTiempo session into extension storage without exposing tokens. Reloaded the issue. The control showed `QA External Tracking 20261013`, the exact issue title/repository/number, and one Start Timer action.
3. Clicked Start Timer in the actual injected control. It changed to Running with a live elapsed counter and matching Stop Timer. This used the external-reference route against the local API without GitHub setup.
4. Opened the actual browser-action popup over the active issue (not `popup.html` as a normal tab). It measured 320×480, version 0.1.1, displayed the same workspace and running timer. Clicked its Stop Timer using native mouse dispatch. The injected control returned to idle without reload.
5. Reopened the actual popup in idle state. It displayed the canonical issue context and one Start Timer action. Clicked that action; the running timer appeared with the expected issue title.
6. Opened the account menu and clicked Sign out. Popup and injected control switched to signed-out state. A controlled `GET /time-entries/current` using the separate QA test session returned 200 with the same owned timer still running, source `extension`, and the correct issue title. Stopped it through the ordinary conditional API stop endpoint, which returned 200. An earlier probe of the nonexistent `/time-entries/timer/current` route returned 404 and was corrected; it was not a product defect.

Screenshots were inspected: `/private/tmp/gitiempo-external-injected-running.png`, `/private/tmp/gitiempo-external-popup-repeat-running.png`, `/private/tmp/gitiempo-external-popup-logout.png`. They contain only synthetic QA identity and the public issue. Temporary filenames are evidence locations, not permanent release artifacts.

## Controlled input probes

Twelve separate HTTP requests to the local reference endpoint returned **400**: repository/number/URL mismatch; board URL; HTTP URL; foreign host; unsafe number; zero number; empty title; 501-character title; injected workspace ID; injected user ID; caller-selected tracking mode; caller-selected verification provenance. The supplied invalid host was never requested by the client. These are actual controlled requests; title rendering and write atomicity additionally have automated coverage.

See [API controlled-request evidence](qa-api.md) for own-only responses, private/provenance persistence, cross-workspace denial, shared identity and concurrency. That evidence does not substitute for unexecuted provider-lifecycle tests.

See [migration evidence](qa-migration.md) for the completed 0021→0022 preservation/collision scenario, [entry lifecycle evidence](qa-api-lifecycle.md) for controlled edit/move/delete/restoration requests, and [frontend evidence](qa-frontend.md) for actual desktop/mobile own-time rendering and timer interactions.

## Designs and privacy

The user approved current-view reuse with External tags and the own-time question-mark tooltip. Existing grouped `GITiempo.pen` screens remain the source: user Projects `yAu6B`/`FRM1d`, timer `LKDTn`, task dialog `OtPxH`, history `R2FI0`, Dashboard `obxTM`, admin Projects `6iAjf`; extension `xkeDn`, `bPI7N`, `iWQgl`, `F5nKsg`, `E65VJ`, `bTmp0`, `dGk0P`, `Qt8zW`; privacy `FX7lL`/`Y5pPJQ`. See [parity checklist](design-parity.md).

Local privacy browser verification passed with analytics both absent/configured at 390/768/1024/1440px, including real keyboard skip-link and contact focus, route variants, footer/canonical/sitemap, no scripts/hydration and no overflow. Mobile/desktop screenshots were inspected. The test identity/domain was intentionally invalid. The initial anonymous production retrieval returned **403**; the later check returned **200** with the old **22 September 2026** policy. Publication of the 13 October revision is confirmed outstanding and blocks distribution. See qa-extension-completion.md. See [candidate inventory](../../../docs/chrome-web-store-privacy.md#external-reference-candidate-inventory--13-october-2026) for local ZIP hashes/permissions and the distribution gate.

## Full manual QA matrix

The statuses below describe the complete requested scenario, not only its tested subset. **Partial** and **Pending** leave the corresponding task unchecked. **Pass** identifies a complete manually executed scenario. Unit/e2e automation is supporting evidence and does not convert a full manual scenario into a pass.

| Task | Status | Executed evidence / outstanding coverage |
| --- | --- | --- |
| 9.1 | Pass | Combined disposable fixtures cover two workspaces, two members, assigned/unassigned PMs, admin, removed membership, managed public/private repository and board mappings, external active/inactive/open/closed work, completed/running entries, and the user-attested private no-App customer issue. Revision e0714382 plus the documented report correction, version 0.1.1, local/production candidate hashes, Chrome 152.0.7977.54, installed Firefox 157.0.1 and approved Pen frames are recorded. Firefox runtime actions remain user-attested; no credentials are included. See qa-api-final.md, qa-api-roles.md, qa-web-final.md, qa-release-final.md and design-parity.md. |
| 9.2 | Pass | Controlled 0021→0022 fixture preserved IDs, assignments, billing defaults, history and sync timestamps; external storage/provenance checked; preflight identified both colliding refs and transactional migration preserved all records. Disposable QA databases removed. See qa-migration.md. |
| 9.3 | Pass | Chrome signed-out control exposed no Start; synthetic GiTiempo sessions without GitHub setup showed the correct workspace. Actual injected-control requests paused across account and distinct-workspace changes blocked stale Start/Stop; Retry refreshed to the new workspace, with no unintended timer. Expired synthetic sessions exposed only sign-in. Temporary identities, workspaces and extension storage were removed. See qa-extension-completion.md. |
| 9.4 | Pass | Actual Chrome direct/native popup and Projects context, navigation/rerender, delayed/missing title, malformed pane/unsupported page and matching-stop evidence is combined with user-attested Chrome/Firefox private direct/Projects injected/popup flows. The user confirmed Firefox navigation/PR/offline and, in the final follow-up, temporary missing/delayed title disables Start and recovers without reload, plus malformed `issue=invalid` rejects Start and returning to valid context recovers. No timer was required for the two final probes. See qa-extension-follow-up.md, qa-extension-completion.md and the final confirmation below. |
| 9.5 | Pass | Public ordinary-member first start and user-attested private customer start committed private/user-supplied mappings without assignments; exact-task isolation was checked through HTTP. Independent instrumentation of the actual API runtime allowed loopback requests and rejected/counted remote fetch/HTTPS calls: first start, repeat and stop succeeded with zero remote calls. See qa-rollout.md and the prior extension evidence. Private member repetition remains user-attested; a read-only local snapshot showed admin entries and does not independently identify that repeat session. |
| 9.6 | Pass | Controlled project/task list hiding, same-issue and different-issue reuse, casing variants, separate workspace IDs and cross-workspace denial passed. See qa-api-lifecycle.md. |
| 9.7 | Pass | Actual Nest HTTP/PostgreSQL evidence covers member/PM/admin assignment boundaries, public/private repository and board mappings, existing issue ownership, resource/state checks and denial without fallback or protected metadata. Live read-only ITSUA#439 start/stop supplements controlled provider fixtures. The task permits controlled HTTP/server evidence; a live browser for every role is not an additional requirement. See qa-api-final.md and preceding API/import reports. |
| 9.8 | Pass | Actual controlled HTTP proves external start/repeat/owned stop independent of personal links with zero provider calls; identity unlink preserves the session/timer. Managed installation and organization lifecycle failures remain denied. Fresh controlled provider outage and rate-limit each returned 503/github_provider_unavailable with unchanged project/task/entry counts. Provider errors were simulated at the transport boundary; no real provider outage or token revocation was caused. See qa-api-final.md and qa-extension-completion.md. |
| 9.9 | Pass | Actual HTTP detail/list/task redaction, hidden identifiers, personal totals, exact owned-entry pagination/counts/search/activity and empty member metadata passed. Desktop/mobile Projects and existing-task pickers excluded the peer task; the final browser combined search showed only own #41 and history pagination exposed a second page of own entries. Dashboard displayed the owned task in activity summaries. Combined evidence covers every requested read surface. See qa-access-matrix.md and qa-web-completion.md. |
| 9.10 | Pass | Fourteen shared-mutation requests were denied with exact project/task/reference/assignment/history snapshot equality. Admin/assigned member retained edits, and grant removal restored restriction. Own-time UI omits shared management actions and, after the capability fix, the manual selector offers only the exact owned task without `New task` or peer tasks. A fresh browser save persisted an owned manual entry; late capability changes stop the save with a visible outcome message. See qa-access-matrix.md and qa-web-completion.md. |
| 9.11 | Pass | 36 actual HTTP/DB assertions covered cross-workspace global conflict with no orphan project, extension/web sources, false external task billing default, saved description, running visibility with zero completed total, positive integer duration and stale conditional stop preserving the original timer. See qa-timer-invariants.md and prior live-counter evidence. |
| 9.12 | Pass | Combined actual injected/native Chrome and controlled HTTP/DB evidence covers request failure/Retry, lost successful response, duplicate clicks, stale context, inactive/closed/managed denials, signed access expiry/refresh and revoked-refresh recovery. Failed requests create no running entry; authoritative reconciliation preserves the existing timer and avoids duplicates. Firefox offline recovery is user-attested. Each named failure is covered; the task does not require every failure in both controls. See qa-extension-follow-up.md, qa-extension-completion.md and qa-extension-final.md. |
| 9.13 | Pass | Actual Projects, global picker, Dashboard, History and Manual Entry interactions recorded authorized exact external tasks; HTTP/DB checks deny hidden siblings and stale/guessed IDs after last-entry loss. Fresh assigned PM managed saved-task Start/Stop supplements the managed API assignment matrix, which applies through the same saved-start endpoint on every surface. No GitHub link or own-time assignment was added. See qa-web-lifecycle.md, qa-web-completion.md, qa-web-final.md and API access/role reports. |
| 9.14 | Pass | Controlled own interval/description edits and authorized moves passed; hidden/foreign/inactive/closed targets and peer mutations denied without writes; running delete blocked while owned stop passed. See qa-api-lifecycle.md. |
| 9.15 | Pass | Controlled final-entry move/delete hid exact task/project while own sibling, peer history and explicit grants remained; running visibility and exact-ID restoration passed with unchanged shared-row snapshots. See qa-api-lifecycle.md. |
| 9.16 | Pass | Popup↔injected synchronization, two-tab final-entry disappearance, assignment widening/narrowing, role demotion and workspace/membership changes passed in combined execution. The final real tab-focus rerun clears a removed task from an open Manual Entry dialog while retaining its authorized project/task B, and History refreshes to only B. Exact-query invalidation, late-response guards, reconciliation Save blocking and inactive owned-entry editing pass focused regressions. See qa-web-completion.md and qa-web-final.md. |
| 9.17 | Pass | Combined real browser and HTTP role checks preserve admin full summaries, PM explicit report/project rights and member/unassigned-PM denial. The final browser found and fixed the inactive-project report filter; the rerun and inspected downloaded CSV contain active 2h + inactive 1h, total 3h. Scoped member summaries/redaction retain contract-compatible rendering; actual own-time UI uses personal help rather than a fabricated zero team size. See qa-web-final.md, qa-web-completion.md and API access/role reports. |
| 9.18 | Pass | Separate personal GitHub App authorization and actual provider-backed browsing/import passed. External repository reuse preserved identity/mode/provenance/history/no assignments; inactive external board takeover was rejected. Normal managed import, active managed conflict and allowed inactive-managed reassociation passed. Removing only QA org approval or personal credentials denied browsing/import without changing project/reference counts. My-test-org Projects returned provider 503; live ITSUA boards supplied the successful import fixtures. All disposable DBs were removed. See qa-api-completion.md. |
| 9.19 | Pass | The initial 23 controlled invalid inputs and a fresh 15-case independent signed-session matrix were denied without writes; the latter checked all six materialization/assignment table counts after every request. Actual User SPA and injected-control rendering treated markup literally; repeated starts preserved stored title/provenance. After the isolated CDP attempt was inconclusive and cleaned up, the user confirmed the native Chrome popup displays the requested img/onerror title as ordinary text. This final slice is user-attested; see qa-extension-completion.md and qa-popup-markup.md. |
| 9.20 | Pass | Fresh two-session HTTP/DB requests prove two members/case variants share one repository+issue mapping with independent entries, and same-user simultaneous starts across two workspaces return 201/409 with one global timer. Paused reference/import overlap and assignment/membership removal at the write boundary preserve identity and roll back denied materialization. All owned fixtures removed. See qa-api-final.md. |
| 9.21 | Pass | Prior extension/admin/privacy evidence is combined with the 14 October Projects visual correction. Desktop/mobile header, External badges, help, table and card differences are resolved in the existing renderer; geometry, long-title overflow, keyboard/help and timer states were inspected in an isolated real-component browser fixture. Source links and documented shell/filter behavior are retained. No tracked duration appears. See qa-projects-parity-final.md and design-parity.md. |
| 9.22 | Pass | Real extension logout/reload/fresh login and signed-session HTTP evidence prove credential clearing, refresh denial and retained server timer/history. Identity-only GitHub unlink preserves the GiTiempo session. A disposable extension copy forced only provider cleanup to fail: actual browser-action popup showed Sign-out incomplete/Retry with credential-free pending marker. Restoring the helper and clicking Retry after restart cleared the marker without stopping the same timer. Retry used the identical regular extension page because native popup reopen was unavailable; this checks cleanup recovery, not activeTab behavior. All owned fixture processes/files were removed. See qa-extension-final.md and qa-extension-completion.md. |
| 9.23 | Deferred by user | Local production-configured policy and Chrome/Firefox package inventory, version/hash, permissions and executable sources passed. The user explicitly requested keeping artifacts local and skipping production verification. Published-policy verification is skipped, not passed; it remains a future distribution prerequisite. See qa-release-final.md. |
| 9.24 | Pass | Disposable 0021→0022 upgrade and actual policy-aware API/gateway rehearsal passed 49 assertions. Withdrawal blocks only the new reference entry point; supported managed saved starts, owned stop/history and own-time restrictions stay available. Restoration keeps all identity/policy/history, legacy installation endpoint cannot bypass external policy, rename is distinct and conversion/public mutation denied. Old policy-unaware API downgrade is rejected as unsupported and was not executed. See qa-rollout.md. |
| 9.25 | Pass — local scope | Final scenario/browser/role/responsive evidence is linked in this matrix and the final reports. All identified local defects were fixed and affected checks rerun; synthetic fixtures/processes were cleaned. Final User verification: 551 tests / 52 files, lint/typecheck/build passed; independent review approved. Production privacy publication/verification remains explicitly user-skipped, not passed. |

## Rollout and rollback gate

Deploy the collision-free migration, access-safe API/contracts and compatible SPA consumers before distributing the new extension. The feature is default-on without a workspace setting. Retain external mode enforcement, records and owned stopping/history during rollback; an older API interpreting external projects as ordinary full-project access is unsafe. Use a compatible forward fix rather than dropping mode/provenance fields or resetting references. The local candidate API origin is a QA address and cannot be submitted as a production build.

The migration journal was updated for 0022. Migration generation encountered a pre-existing 0020/0021 parent-snapshot collision; the explicit reviewed SQL/journal was verified by application to the disposable DB. No snapshot was invented or existing migration rewritten. Future generation must resolve that baseline tooling issue separately.

## Automated verification

- Shared contracts: prior contract verification remains passed. Shared browser runtime: 228 tests in 35 files passed on the final source; lint/typecheck/build passed with three existing lint warnings.
- API: lint/typecheck/build; 514 unit tests passed, 27 focused data tests passed, isolated external-tracking e2e 2/2 passed.
- Extension: lint/typecheck, Chrome+Firefox builds; latest troubleshooting regressions brought the suite to 186 passing tests.
- Landing: lint/typecheck/build; 17 tests and the four-width privacy browser regression passed.
- User SPA: latest lint/typecheck/build passed; 542 tests in 52 files passed, including timer-summary, ordered task-refresh and manual task-capability regressions. Lint retains 11 pre-existing warnings; build retains its chunk-size warning.
- Admin SPA: final authorization-refresh suite passed 569 tests in 66 files; lint/typecheck and root Turbo build passed. Lint retains two pre-existing GithubCallback warnings and build retains its chunk-size warning. Actual browser evidence is in qa-web-completion.md; the earlier tooltip accessibility compromise is in qa-frontend.md.
- Supported OpenAPI export passed. Change-specific strict OpenSpec validation passed after 14 canonical deltas were reconciled. Full canonical validation has two existing failures: `user-activity-tracking` and `workspace-membership` lack Purpose sections. No unrelated spec rewrite was performed.

## Cleanup and final status

All owned QA browser sessions and SPA preview servers were closed. The API lane removed its disposable workspace/users and all four restricted token/session files, verified final fixture counts at zero, and stopped only its temporary port-3019 API. The migration lane dropped both databases it created. Root then stopped the owned port-55481 PostgreSQL cluster and removed its exact temporary data/socket directories and helper scripts. No development/shared database was modified. Non-secret screenshots and ignored local candidate ZIPs remain available for review.

## Local extension troubleshooting follow-up — 13 October 2026

The unpacked output had retained the stopped QA origin `127.0.0.1:3019`. Both targets were rebuilt with `--mode dev` for `localhost:3000`; their API permissions and bundled origins were inspected. Ordinary API, login, and refresh requests now carry a 15-second timeout. A read-only local member request to `/workspace` returned 200 and passed the shared response schema.

For the reported public [GiTiempo issue 439](https://github.com/ITSUA-team/GiTiempo/issues/439), a separate signed-out Chrome session with the unpacked extension found the matching canonical URL and issue heading, and rendered the injected control with the correct repository, number, and title. No timer was started. The user's browser was inaccessible because Computer Use authorization was unavailable; its missing-script versus DOM-error cause was not observed directly. The popup now preserves precise content-script detection errors, instructs an existing issue tab to refresh when its script cannot be reached, and labels page-context failures `Unable to read issue` instead of `Connection lost`. Regression tests cover both errors and recovery after reconnection. The test browser was closed; both local extension targets were rebuilt.

Implementation checklist after the follow-up: **41/67 tasks complete**, including extension cross-browser smoke and four fully executed manual scenarios (9.2, 9.6, 9.14, 9.15). Other manual scenarios remain partial/pending. User-attested private/Projects smoke passed as admin, then the requested member repeat passed in Chrome and Firefox. The repeat identity was not supplied for independent role corroboration. The GitHub navigation injection defect was reproduced and repaired for public issues; the subsequent authenticated private direct-issue header regression was fixed against the user-supplied DOM and user-confirmed successful in both browsers. Provider lifecycle, complete web/cache transitions and disposable rollback rehearsal remain incomplete. The revised public privacy policy returned 403 on the attempted anonymous retrieval and is not certified as deployed. No archival or distribution readiness is claimed.

## Continued manual pass — 13 October 2026

See [extension follow-up](qa-extension-follow-up.md), [role/report/input API pass](qa-api-roles.md), and [web lifecycle pass](qa-web-lifecycle.md). This pass used a separate disposable database on port 5432 and QA API 3019; the earlier port-55481 cluster was already removed. The user's new private issue was inspected read-only in the development DB solely to corroborate their explicit test report; those records were not edited or removed.

Root resumed the permitted final-entry UI deletion after the user's explicit approval. Four own QA entries were deleted through their real Edit → Delete entry → Delete dialogs. History became empty and the current tab's previous task/link cleared. Refocusing a second Projects tab hid the project/task without reload. Database postconditions: one shared project, three tasks, zero deleted member entries and two peer/PM entries preserved. The unrelated nonexistent `/projects/:id` URL produced the expected Page not found: this app reuses `/projects`, and no extra route was introduced.

This exposed a cache defect: the second tab's top-bar issue link remained stale after refocus even though its project card disappeared and its timer dialog had no selected project/task and Start was disabled. `useTopBarTimerSummary` now opts into focus refresh, matching Projects. The focused regression and all 535 User SPA tests passed; lint/typecheck and root Turbo User SPA build passed. A fresh actual browser rerun removed both the project and stale timer link on refocus. The complete cache task remains partial because other role/workspace transitions are still outstanding.

The rerun also exposed a race: child task queries refetched before the Projects parent reconciled visibility, producing a false `Could not load project tasks / Please try again` toast on normal own-time scope loss. `useProjectsData` now refreshes the parent first, then only still-visible task queries. Regressions cover both disappearing and retained projects. All 537 User SPA tests, typecheck, lint and the root Turbo build passed. A fresh two-tab mobile browser rerun after deleting the last owned QA entry showed an empty Projects view, zero stale issue links and no task-load toast (`member-refocus-fixed-mobile.png`, inspected).

Controlled title-rendering follow-up created a new disposable external task with an img/onerror and script-like plain-text title, then repeated its reference start with a replacement title. Both starts returned 201, owned stops succeeded, and the stored title/provenance stayed unchanged. Actual Projects/top-bar rendering displayed the original markup characters as text, with no injected image/script nodes and no execution sentinel. Only those two owned QA entries were then deleted through the normal API under the explicit test-deletion authorization. Extension literal-markup browser coverage remains pending.

Current-pass cleanup completed under explicit user authorization: only `gitiempo_qa_20261013_80578e6d` was dropped after verifying all four workspace names had the QA prefix. Exact owned API 3019 and User SPA 5183 processes stopped; ports 3019/5183/5184 have no listener. Protected credentials, sessions, helpers, logs and the temporary QA extension were removed; screenshots were retained. The development database and user-created time records were not modified.

## GitHub navigation injection follow-up

The member repeat reported successful private tracking in both browsers but revealed missing injection on same-document GitHub navigation. Two causes were independently reproduced on the real public repo: content registration omitted initial issue-list routes, and React issue navigation left the head canonical missing or pointing at a previous issue. Registration now covers GitHub navigation entry routes with explicit PR-path exclusions. Direct-issue extraction validates GitHub-rendered body-header repository/number together with the title and a separate issue-number node in the heading; mixed old/new context and title-only number substitution remain rejected. The observer also handles href and text updates. The browser kept a same-document marker through issue-list → 439 and full-load 439 → list → 451. The latter retained canonical 439 while showing exactly one control for 451. No timer or GitHub data was written. Screenshots: `extension-spa-injection-fixed.png` and `extension-spa-stale-canonical-fixed.png`.

The user then reported direct private issue 1 rejected in Chrome, while its Projects pane still worked. The whole-heading number check was too strict for authenticated action text. It now checks a separate title sibling, tolerates heading actions, and retains stale-number denial. All 186 extension tests, typecheck/lint and both localhost:3000 dev builds passed. The user supplied exact private-page header HTML after that first compatibility fix still failed: the number, edit button and aria-hidden tooltip share one sibling wrapper. Its text is `#1 Edit issue title`, so whole-sibling text also rejected valid identity. A regression using that captured nested structure and a number-only descendant fix now pass with all 186 extension tests, typecheck/lint and both rebuilt localhost targets; the user then confirmed the final direct-page/popup/issue-list repeat works in both Chrome and Firefox. This closes the reported navigation/private-heading defect by user-attested browser evidence.

Final compiled-bundle check replayed the nested number/edit-button/hidden-tooltip structure on the isolated public issue DOM, removed its canonical link, and observed exactly one correct control. Changing only the displayed number to a stale value removed the control; restoring it remounted one control. This is a controlled DOM replay, not authenticated access to the private repo. Screenshot `extension-authenticated-header-fixture.png` was inspected. The user separately confirmed the final real private-page repeat works in both browsers. All owned QA browser sessions are closed; QA server ports remain unbound.

## Completion pass — 13 October 2026

The new [API completion report](qa-api-completion.md) records 306 passing tests in 29 isolated e2e files, including deterministic repository import preservation, inactive external board refusal and reference/import overlap. The obsolete test that inserted case-duplicate repository holders was replaced with a regression proving the new constraint and canonical resolution. API typecheck and full lint passed. Controlled provider fixtures do not certify a live GitHub integration.

The [extension edge-case report](qa-extension-completion.md) adds actual Chrome delayed-title, stale identity/route, malformed-pane/PR exclusion and literal-markup checks. The local Chrome dev output was restored to localhost:3000 after a verification command accidentally selected the tunnel environment; the corrected explicit mode and current candidate hash are recorded. Firefox's user-attested direct/Projects smoke plus repeated issue navigation, pane mount/removal and PR exclusion passed; independent delayed/error lifecycle coverage is pending.

The [rollback report](qa-rollout.md) records 49 successful actual HTTP/DB assertions, including the independent remote-call audit. The completed operational rehearsal and first external-start coverage close tasks 8.5, 9.5 and 9.24. The QA database and root-owned API/gateway were removed/closed; development records were not changed.

The revised policy is locally built and reviewed, but the public page still describes the older payload. Distribution remains blocked until that page is updated and anonymously verified. The user offered to restore the test ITSUA-team integration; a subsequent read-only query confirmed its association is now verified. Real provider-backed QA continues using isolated records.

Current checklist at this checkpoint: **44/67 complete**. Full manual QA and release readiness remain unclaimed.

## Final frontend capability and session follow-up — 13 October 2026

The manual time-entry selector now uses server task-management capabilities. Own-time projects list only accessible existing tasks. Permission/project changes clear stale creation selections; a successful create that finishes after access changes cannot save a time entry or restore the hidden selection and displays a visible request error stating the outcome. A real synthetic-member browser rerun saved one existing-task entry with 3600 seconds. The earlier failed fetch was traced to QA API origin/CORS configuration and repaired only through temporary QA server overrides; product environment files were unchanged.

Shared session handling now rejects late refresh/bootstrap/profile responses after logout, login or a workspace switch. Local logout clears immediately, and its late API completion cannot sign out a newer identity-provider session. Authenticated HTTP requests reject changed context without retrying the previous request as the new account or invoking logout for the new session. Deferred regressions cover success and failure, the initial 401 boundary, token refresh and the retry response. Independent final code review reported zero remaining actionable findings.

Mutation-isolation task 9.10 is now complete. Read-isolation task 9.9 is also complete through combined browser and direct-API evidence. At that checkpoint the checklist was **49/67 complete**; provider import task 9.18 was complete and the explicitly pending full manual/browser matrices remained tracked separately. Neither archival nor release readiness was claimed.

The final User/Admin pass used a fresh disposable QA database on API 3042 and SPAs 5292/5293. It verified own/peer combined search, own-entry pagination, History Start/Stop and report/export-action role boundaries. Its browser sessions and exact QA servers were closed; `gitiempo_qa_web_final_20261013` was removed. Root also closed the owned `qa-manual-capability` browser session after the earlier pass. Development/user records and the unrelated `gitiempo-web-member` session were left intact.

Live import completion used the permitted freshly authorized personal GitHub App connection and actual read-only GitHub calls in a new disposable database. Active managed conflicts returned `repository-taken`; inactive managed reassociation returned `imported` with the expected reference move; external inactive mappings remained protected. Org and credential removal denied browsing/import without materialization. The final helper lint/API typecheck passed, its QA namespace preflight blocks development targets, and its database was dropped and verified absent. No user/development records or GitHub resources were changed.

## Native popup confirmation — 13 October 2026

The user confirmed that the requested img/onerror title appears as ordinary
text in the native Chrome popup. Combined with the executed input-validation,
User SPA/injected rendering and stored-title/provenance checks, this closes
task 9.19. Current progress is **50/67 complete**, with 17 tasks still pending.
No production code or extension build changed for this confirmation. Full
manual QA, public privacy publication and archival/release readiness remain
pending. See [popup evidence](qa-popup-markup.md).

## Final API and Firefox context follow-up — 13 October 2026

The source revision is now committed as `e0714382`. Earlier baseline and
uncommitted-build descriptions above identify historical runs. This follow-up
changes evidence/checklists and canonical documentation only; it does not
claim a production release.

The user confirmed both requested Firefox edge checks passed: an empty title
prevents Start and restoring it after eight seconds recovers context without
reload; a Projects pane with `issue=invalid` prevents Start and a correct URL
restores it. This is user-attested, using the already reviewed local build.
Together with the earlier direct/pane, popup/injected, navigation, PR and
Chrome controlled-context evidence, task 9.4 is complete.

Fresh API evidence in [qa-api-final.md](qa-api-final.md) closes tasks 9.7,
9.8 and 9.20. It uses the permitted controlled transport/HTTP/DB method,
including actual provider-outage/rate-limit responses and coordinated starts.
It does not claim a live provider outage or permission for production changes.
Both isolated database clusters and temporary helpers were removed.

[Release inspection](qa-release-final.md) records separate production-configured
Chrome/Firefox ZIP hashes, exact files/permissions, and a static production
privacy artifact. The anonymous published privacy page still serves the old
revision. Tasks 8.2 and 9.23 therefore remain pending for publication and
verification, even though their artifact/inventory preparation is complete.
Current checklist at this checkpoint: **54/67 complete**.

## User-approved local-only release scope — 13 October 2026

The user chose to keep the revised privacy page local and explicitly skip its
production verification. No push, production configuration change or deployment
will be performed in this pass. Tasks 8.2 and 9.23 are resolved by completed
local preparation plus this deferral; the production clause is **skipped by
user**, not a passing check. Future extension distribution still requires the
published policy to match. Current checklist: **56/67 resolved**.

Canonical reconciliation is already present in commit e0714382: all 51 added
or modified requirement bodies match, and the obsolete member-count capability
is absent. A fresh strict check passed for the 13 affected extant specifications
and the change. See [spec audit](qa-spec-sync-final.md). Task 8.6 will be closed
when the remaining required local manual evidence is complete.

## Admin inactive-report defect — 13 October 2026

The final disposable browser fixture found that Admin Projects included an
inactive external project with 1h, but default Reports omitted it. The report
project selector filtered inactive projects for every role. It now receives
the existing admin scope and includes inactive projects for admins, preserving
PM filtering. A regression locks both role outcomes.

The browser rerun shows active 2h plus inactive 1h. The actual downloaded CSV
contains both rows and Total 3h; see [web evidence](qa-web-final.md). Fresh full
Admin verification passed **570 tests / 66 files**, typecheck and lint (zero
errors, two existing callback warnings), plus a root Turbo Admin build with
its workspace dependencies. The build retains its existing chunk-size warning.
Only three Admin report source/test files changed. No layout change was needed
against Admin Reports V2. Codebase-memory reindex tools are unavailable in this
session, so no graph-index freshness is claimed.

The combined fixture-preparation audit closes 9.1. Current checklist is
**57/67 resolved**, including the user-deferred production publication clause.

## Combined web acceptance evidence

Tasks 6.4, 7.2, 9.13 and 9.17 are complete through the combined reports, not a
claim that the final lane repeated every earlier interaction. Earlier browser
runs proved final-entry disappearance on desktop/mobile and two-tab refocus,
scoped repeat controls, manual selector behavior, peer/control exclusion,
admin/PM role boundaries and full metadata. Controlled HTTP proves stale IDs
and unchanged managed assignment checks; the real read-only import run proves
managed/external conflicts. The final run adds workspace/membership changes,
managed PM saved starts, responsive admin reports and actual CSV contents after
the inactive-project fix. Current checklist: **61/67 resolved**.

## Combined extension recovery acceptance — 13 October 2026

Tasks 9.12 and 9.22 are complete using the named combined execution evidence.
The provider-cleanup failure is a controlled temporary helper seam, with the
production logout/retry flow unchanged. Its initial error was inspected in the
actual Chrome browser-action popup; the post-restart Retry used the same popup
UI in a regular extension page and makes no activeTab claim. Local credentials
and the pending marker cleared, while the same owned server timer stayed active.
All fixture processes and temporary credentials/helpers were cleaned up.
Current checklist: **63/67 resolved**, including the user-deferred publication
clause. Remaining local work is the open-dialog access fix/rerun, final runtime
visual evidence, and completion/spec rollup.

## User dialog correction verification — 13 October 2026

The open Manual Entry dialog retained a hidden task and enabled Save after
workspace membership was removed in an isolated fixture. The local correction
clears a previously visible project/task when authoritative scope narrows, guards
new-entry saving, and prevents late edit lookup success/fallback from restoring
a cleared or replaced dialog. The added revocation regression passes.
Fresh full User verification passed **543 tests / 52 files** and the root Turbo
User build; targeted tests, typecheck and lint passed with zero lint errors and
11 existing warnings. The build retains its existing chunk-size warning. The
actual browser rerun and final mobile tooltip evidence are tracked in
[qa-web-final.md](qa-web-final.md) before closing task 9.16.

## Final dialog regression review — 13 October 2026

The task-only scope-loss case exposed a second cache boundary: clearing the
dialog's local task map did not invalidate the five-minute TanStack task query.
The correction invalidates that exact query before reloading, guards late
responses by generation, and blocks Save during reconciliation. Existing owned
entry editing still retains an inactive project when the raw authorized project
response includes it. Visible-project and own-entry queries now refresh on window
focus so the actual Time Entries page receives authoritative scope changes in
both dialog targets and History.

Independent review found no remaining concrete issues in the narrowed patch.
Fresh full User verification passed **547 tests / 52 files** and the root Turbo
User build with workspace dependencies. The existing lockfile synchronization
and build chunk-size warnings remain non-failing. This supersedes the earlier
543-test checkpoint for the User source changed in this pass. The final actual
task-only browser rerun clears task A while retaining project/task B; History
refreshes to only task B and 1h after a real tab-focus transition. Evidence is
recorded in [qa-web-final.md](qa-web-final.md).

The mobile own-time tooltip now clamps its position to the viewport; direct
inspection of `qa-web-final-tooltip-mobile-fixed.png` at 390x844 confirms the
complete text fits with a 16px right margin. The desktop positioning retains
its existing transform. Full task 9.21 remains partial because the extension
Pen/documentation layout decision is awaiting the user's answer.

## Current local completion checkpoint — 13 October 2026

Task 9.16 is complete using the combined browser, API and regression evidence.
The final patch, including both focus-refresh overrides, passes **547 User tests
/ 52 files**, **80 focused tests / 3 files**, User lint/typecheck and the root
Turbo User build. Admin verification remains **570 tests / 66 files**, with its
lint/typecheck and root Turbo build passed. Both web lint runs have zero errors;
the previously recorded warnings remain. Independent final review approves the
patch with no remaining concrete findings. QA listeners on ports 3053, 3055,
3057, 5392, 5393 and 5395 are absent after cleanup.

Current checklist: **64/67 resolved**, including the user-skipped production
publication clause. The remaining tasks are **9.21** (resolve the existing
extension Pen/documentation layout discrepancy), then **8.6** and **9.25**
(final completion/spec/evidence rollup). Required layout clarification is
pending; no extension-layout or Pen edit is made while it awaits an answer.
No push, production configuration change, deployment, archival or new commit
was performed in this pass. Local preparation is not a production or
distribution-readiness claim.

## Final local acceptance and presentation resolution — 13 October 2026

The user approved preserving current popup UI/documentation and updating the
existing Pen states. The six popup frames are now saved locally, with the review
PDF refreshed. All six were visually inspected; the final live traversal found
no layout problems. Saved roots exactly match the final live Pencil roots, and
all other design nodes/grouping equal HEAD. No popup product source changed in
this presentation pass. See [design parity](design-parity.md) and
[extension evidence](qa-extension-final.md).

Task 9.21 is complete through the combined execution evidence. The canonical
reconciliation audit already proves all 51 added/modified bodies match, with the
removed capability absent. Final strict validation and whitespace checks are
recorded in [spec audit](qa-spec-sync-final.md). Tasks 8.6 and 9.25 close the local
completion/evidence rollup.

Final checklist: **67/67 resolved**, including the explicitly user-skipped
production publication/verification clause. Every required local scenario is
supported by the linked automated, executed browser/API or explicitly
user-attested evidence; earlier partial/pending checkpoints above are historical.
Owned QA fixtures and listeners were cleaned up. Previously verified product
source is unchanged by this Pen/documentation-only pass, so its recorded fresh
User/Admin and other package checks remain the applicable execution evidence.
No commit, push, production configuration/deployment, archive or Store submission
was performed. Publishing matching privacy remains required before distribution.

## Superseding Projects parity audit — 13 October 2026

The user confirmed that Projects must not show tracked-duration totals; Time
Entries is the existing duration surface. Missing project/task time in the
current implementation is therefore intentional. UI documentation, design
notes and both canonical/delta Projects specs were clarified. Desktop/mobile
canvas examples were corrected and the review PDF refreshed; the user confirmed
manually saving the latest `.pen` revision on 13 October.

This decision does not close the separately identified badge/header/help-size,
table-header or mobile-card visual differences. The earlier 67/67 and full
parity claim is superseded: **64/67 resolved**, with 9.21 and the dependent 8.6/
9.25 rollup open. Existing product checks remain applicable; no product source
was changed by this presentation/documentation pass.


## Final local completion — 14 October 2026

The remaining Projects differences are resolved in the existing component:
stacked header/count, purple External tags, 44px own-time help, visible desktop
headers and compact mobile cards. The page shows no project/task tracked duration.
The final browser fixture covers 1280, 640, 390 and 320px, long names, tooltip
bounds, full-scope versus own-time controls and timer state feedback. It renders
the real component/theme with synthetic props, without backend writes. Earlier
API-backed scope/visibility/start-stop checks remain the functional evidence.
See [final Projects review](qa-projects-parity-final.md) and screenshots.

Fresh full User checks passed **551 tests / 52 files**, lint with zero errors
(11 existing unrelated warnings), typecheck and root Turbo build. Independent
read-only review approved the two changed Projects files with no actionable
findings. No shared component or Admin source changed in this final visual pass;
previous Admin **570 tests / 66 files** and its lint/typecheck/build remain valid.
Other package evidence is unchanged. Final strict change/Projects validation and
51-body canonical reconciliation passed; `git diff --check` passed.

Current checklist: **67/67 resolved locally**. This supersedes the preceding
64/67 Projects audit. All required local scenarios have executed or explicitly
user-attested evidence; production privacy publication/verification alone stays
user-skipped, and remains necessary before distribution. No production Pass,
new cross-browser end-to-end claim, archival or distribution readiness is implied.
Temporary visual fixture files/process/browser were removed or closed, and port
5398 is not listening; prior QA cleanup remains recorded in the linked reports.
No commit, push, production configuration/deployment, archive or Store action was
performed in this continuation.
