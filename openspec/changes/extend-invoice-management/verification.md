# #527 implementation verification

## Review corrections verified on 2026-11-11

Reviewed and corrected all 13 P0/P1 findings against working changes above `3a5a7974` on `feat/527-invoice-enhancements`.

- PDF image validation fully decodes PNGs before embedding, rejects corrupt stored images with a controlled 422 and bounds decoded image size. The crash regression runs in a child process and asserts its successful exit and structured error. The existing locked sharp version is now an explicit API runtime dependency. OpenAPI covers PDF binary content, attachment headers, both validation errors, groups and preview responses.
- Business revisions preserve saved entry labels and durations. Preview, recalculation and list counts also retain historical rows after mutation or deletion of their source time entries. Explicit exclusion and period/project changes remain validated. Payment reference templates resolve during create and edit.
- Group moves authorize the complete batch through their transaction, including a regression using a one-connection database pool. Target groups remain locked until the operation completes. Group counts use scoped aggregation, rename returns its actual count, and invoice list queries avoid loading full documents and logos.
- The editor submits changed fields only and merges against the latest revision while showing conflicting saved/local values. Independent group moves survive unrelated business saves. Logical session identity controls reset behavior, so token rotation retains the draft.
- Defaults loading, explicit Use settings, logo uploads and calculation errors have independent state. Late defaults preserve user edits, failed uploads preserve untouched default logos, and both logo forms reuse the shared validator.

Final automated results

- `pnpm test` passed all 11 Turbo tasks, 3,746 tests plus 5 CI target-detector tests. Earlier concurrent runs encountered a router timeout and a test being edited during execution. The new subprocess regression also exceeded the default 5-second test deadline under concurrent load. Its test deadline now allows the existing bounded 15-second child timeout, and the final complete run passed.
- `pnpm test:e2e` passed in Docker, 36 files and 458 tests, including the final deleted-source regression. The preceding Docker run passed 457 tests. The disposable Docker database was removed by the runner.
- Root `pnpm typecheck` and `pnpm lint` passed all 11 tasks. Existing lint warnings remain. The final subprocess-test adjustment also passed targeted ESLint.
- OpenAPI export and strict validation of `extend-invoice-management` passed. All review-regression tasks are checked. `git diff --check` passed.
- Independent cross-review of the final API and UI corrections found no remaining P0/P1 in these scenarios.

Browser acceptance used headless Chrome 152 with the local Admin SPA on port 5184 and test-mode API on port 3011 against `gitiempo_manual_527`. The test session used the existing fake Firebase token exchange, then normal API authentication. Desktop was 1280 × 900 and mobile 375 × 812.

On desktop, refreshing the access token kept the open editor and typed note. A concurrent API update changed the payment account. Saving the stale editor produced a conflict, Refresh latest revision retained the local note and loaded the remote account, and retry saved both. On mobile, concurrent changes to the same note showed both values for review. The retry saved the local note and preserved the remote payment account. Document width remained 375 px. Original test payment and note values were restored afterward.

Checked editor/detail structure and responsive actions against the approved #527 frames and existing design parity checklist. Conflict feedback uses the existing Message component. No PrimeVue conflict required a design deviation. Browser evidence is available in `/private/tmp/527-review-conflict-mobile.png` and `/private/tmp/527-review-detail-desktop.png`. Browser acceptance covered the assembled conflict and token-refresh flows, while the defaults/upload failure permutations are covered by focused automated regressions.

## Tested source and environment

- Date: 2026-11-11.
- Branch: `feat/527-invoice-enhancements`.
- Base commit: `dbd0a4880be4d0c71e41e3748b891fb818330251`; implementation is an uncommitted working tree.
- Final changed-source SHA-256: `3e55d6e496788d9fbe5aeb30d61b2f9f4ab8dd1efcae0dbf63cf8039b952c592`. Calculated over sorted changed/new `apps/` and `packages/` paths and their contents, separated with NUL bytes.
- Design reference: `GITiempo.pen` at `c5180df6`, frames listed in `design.md`.
- Local Admin SPA on port 5174 and API on port 3000, Firebase Auth emulator on port 9099.
- Disposable manual database: `gitiempo_manual_527`; automated database: `gitiempo_e2e`. Production data was not used.
- Roles: Admin (`Admin (seed)`) and authorized PM (`Alice (seed)`) with access to Demo Client and Internal Platform.
- Viewports: 1280×900 and 1440×1000 desktop; 390×844 mobile, below the 640 px breakpoint.
- Final acceptance retest: headed Google Chrome for Testing 149.0.0.0, isolated `invoice527-chrome` session, 1280×900 Admin and 390×844 Admin/PM. The 52-file source fingerprint above is unchanged.

## Manual scenarios

| Scenario | Role / viewport | Result and observed evidence |
| --- | --- | --- |
| Save sender and payment defaults | Admin / desktop | PASS. Saved Ukrainian sender/address, email, bank account and payment instructions; a new invoice received these values. |
| Saved document survives defaults changes | Admin / desktop; PM / mobile | PASS. After changing defaults to a new company/account, INV-1 retained the original company and `TEST-527`; new PM creation received the changed defaults. |
| Create invoice and authoritative calculation | Admin / desktop | PASS after preview contract fix. Three entries, 4.75 h, subtotal 475.00 USD, 10% discount 47.50, total 427.50; saved detail matched. |
| Change status with Select | Admin / desktop; PM / mobile | PASS. Draft→Sent, Sent→Draft and subsequent Sent selection worked; list statistics reflected the selected state. |
| Edit Sent invoice and exclude an entry | PM / mobile | PASS after editor-prefill fix. Excluded the 2 h `Onboarding checklist draft` entry; preview and saved detail both showed two entries, 2.75 h, subtotal 275.00, discount 27.50, total 247.50. |
| Reuse released time | PM / mobile | PASS. A new November draft offered only the excluded 2 h entry. Cancelled without saving. |
| Create from existing invoice | PM / mobile | PASS. Reviewed December 1–31, retained reusable source fields, saved independent draft INV-2 with zero entries and zero total. INV-1 retained its November period and 247.50 total. |
| Admin personal group, single move and persistence | Admin / desktop | PASS. Created `Клієнти 527`, moved INV-1, observed All=1, Ungrouped=0, group=1; membership survived navigation and sign-out/sign-in. |
| Personal grouping is independent | Admin + PM / desktop/mobile | PASS. The same INV-1 appeared in PM Ungrouped while Admin had it in `Клієнти 527`. PM group creation/move/deletion did not change Admin membership or counts. |
| Mobile group CRUD and remove by deletion | PM / mobile | PASS. Created and renamed a group, moved INV-1 into it, deleted the group and found INV-1 in Ungrouped. |
| Bulk move, rename and delete | Admin / desktop | PASS. Selected INV-1 and INV-2, moved both into a second group (count 2, Ungrouped 0, former group 0), renamed it, then deleted it; both invoices remained and Ungrouped became 2. |
| Two-tab revision conflict and retry | PM / mobile editor + second tab | PASS after revision-rebase fix. Opened editor, typed a new title, changed status in another tab, received 409 on stale save; title and other fields remained. `Refresh latest revision` preserved inputs and subsequent save succeeded. |
| Mobile validation and keyboard/footer reachability | Admin / mobile | PASS. Invalid billing email displayed a field error; restoring the saved value removed the dirty state. Tab moved Title→Personal group and Cancel→Create invoice with visible focus. Footer actions remained visible while the long form scrolled. |
| Desktop table and mobile layout | Admin / desktop/mobile | PASS for observed final table. Compared combined reference/recipient column, groups, statistics, filters, cards and actions against the listed frames. Removed overlapping columns and excessive table width; all desktop columns fit at 1280 px. |
| Initial UI PDF download | PM / mobile | PASS. Downloaded INV-1 PDF with the original 4.75 h / 427.50 saved revision and inspected its text. |
| Repeat UI PDF download after editing | Admin / Chrome desktop; PM / Chrome mobile | PASS in final retest. Downloaded once, edited the Sent invoice notes, saved, then downloaded twice as Admin and twice as PM. All five PDF requests returned 200 and every action returned to enabled Download PDF. Downloaded files contain the new saved notes, original parties/account, two retained entries, 2.75 h and 247.50 USD; the excluded entry is absent. |
| Final group controls and mutation recovery | Admin / Chrome desktop/mobile | PASS. Compact create button and selected Ungrouped highlight match the intended controls; aria-pressed changes correctly. Duplicate-name 409 appears inside Create group and preserves the name. Correcting it saves successfully. At 390 px, an aborted local rename request shows Failed to fetch inside Rename group, preserves the edited name, and succeeds on retry after removing the interception. No horizontal overflow. Created, selected, renamed and deleted the QA group. |
| Group-list failure and retry | Admin / Chrome mobile | PASS. Aborted the local groups GET and reloaded: the error and Retry appeared beside the group picker while invoices remained usable. Removed interception and clicked Retry: error cleared and authoritative groups returned. |

## PDF evidence

The protected endpoint for the edited manual invoice was separately downloaded using native HTTP authentication. It returned HTTP 200, `application/pdf`, attachment `INV-1.pdf`, and all 25,160 bytes in 42 ms; the declared Content-Length matched the body. This established API output independently; the subsequent Chrome UI retest above also passed.

Rendered and inspected `/private/tmp/527-manual-excluded.pdf`: Ukrainian parties/services and original bank details are readable; only `Checklist review round` and `Client onboarding sync` appear. The excluded `Onboarding checklist draft` description is absent. The single total is 247.50 USD and matches the saved 2.75 h revision.

Rendered long fixtures with and without SVG logo: eight A4 pages, 120 saved lines, wrapped Ukrainian descriptions, repeated table headings/page numbers, subtotal 12000.00, 10% discount 1200.00 and exactly one total 10800.00. Totals and payment details stay together. Automated tests also verify unauthorized downloads expose no PDF bytes and incomplete historical documents identify missing fields.

## Defects found and retested

- Preview response incorrectly required discovery defaults: corrected the shared response contract and added real-payload contract/client/editor regressions; manual creation passed.
- Empty editor after opening/HMR: initialize an already-visible editor immediately; manual PM Sent edit passed.
- Stale revision could never retry: explicit latest-revision review preserves the draft and rebases its precondition; two-tab manual retry passed.
- Desktop table columns overlapped or hid amount/status: use the approved combined invoice/recipient column and compact aligned widths; manual 1280 px screenshot passed.
- Additional independently reviewed async and clearing-value defects were fixed with regression tests: route identity, delayed save/error isolation, clearing notes, cleared billing defaults, delayed initial defaults, calculation-error recovery and scoped cache invalidation.

## Automated checks

- Root lint and typecheck: pass, 11/11 tasks each; existing lint warnings only.
- Repository tests: 3,720 tests passed across 11 Turbo tasks, plus 5/5 CI target-detector tests. The last groups-only patch then passed its full 12-test suite; root lint/typecheck were rerun after that patch. Counts are reported separately to avoid counting reruns twice.
- API e2e: 36 files / 457 tests passed; final invoice-specific run 81/81 passed after the final preview guards/header assertions.
- `pnpm test:e2e`: Docker runner could not connect to the local Docker daemon. Ran the API e2e suite against the isolated local PostgreSQL database instead; no production database was used.
- OpenAPI export: pass; shared OpenAPI regenerated.
- Strict validation: both `extend-invoice-management` and overlapping `reduce-redundant-spa-notifications` pass. Reconciled invoice requirements and preserved original modified-scenario names required by validation.
- `git diff --check`: pass.

The final groups-only patch also places mutation failures inside the modal, rejects stale group-list responses, highlights the selected built-in view, and matches the design's compact create-group header. Its automated regression tests pass. Its final visual/error-state manual retest passed in Chrome as recorded above. No additional application-code changes were needed: the earlier embedded-browser PDF stall was not reproduced in Chrome.

## Acceptance status

Implementation and manual acceptance are complete (21/21 tasks). The remaining PDF and group scenarios passed in Chrome on the unchanged implementation source. The change has not been archived, committed, pushed or deployed. No PrimeVue conflict required a design deviation in this final retest.

The initial verification report was posted to [issue #527](https://github.com/ITSUA-team/GiTiempo/issues/527#issuecomment-6795334347). The [final Chrome acceptance report](https://github.com/ITSUA-team/GiTiempo/issues/527#issuecomment-6795569872) records the completed retest.

Local visual evidence: `/private/tmp/527-acceptance/invoices-desktop.jpg`, `invoices-mobile.jpg`, `invoice-editor-mobile.jpg`, and `/private/tmp/527-manual-excluded-1.png`. These are local QA artifacts, not repository assets.

## Final Chrome evidence

- `chrome-invoice-detail.png`, `chrome-pm-pdf-mobile.png`: saved invoice and enabled download action.
- `chrome-admin-edited-invoice.pdf`, `chrome-pm-edited-invoice.pdf`: actual browser downloads, 25,739 bytes each; extracted business text is identical for Admin and PM. PDF metadata may differ.
- `chrome-pdf.png`: rendered downloaded PDF, visually inspected for readable Ukrainian, complete payment instructions and a single matching total.
- `chrome-groups-desktop.png`, `chrome-group-error-desktop.png`: selected built-in group, create action, actual duplicate-name response inside the modal.
- `chrome-groups-mobile.png`, `chrome-group-error-mobile.png`, `chrome-groups-load-error-mobile.png`: mobile controls, preserved rename after network failure and separate list retry.

All final Chrome artifacts are under `/private/tmp/527-acceptance/`. Temporary QA group was removed. All request interceptions were removed. No production data was accessed. Existing automated checks remain applicable because no implementation source changed during this retest; final strict OpenSpec validation and whitespace checks were rerun.

The subsequent [component audit](design-parity.md) and [post-fix Chrome retest](design-retest.md) cover visual discrepancies and fractional-cent billing identified after this acceptance run.
