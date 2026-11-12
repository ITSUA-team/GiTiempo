# Verification — group-invoice-time-by-task — 2026-11-12

## Acceptance

Direct JSON access to the approved `GITiempo.pen` resolved the earlier Pencil access blocker. All14 required frames have been compared, discrepancies corrected, and real-page/PDF checks repeated. The [component matrix](component-parity.md), [UI measurements](evidence/ui-parity-observations.md) and [PDF measurements](evidence/pdf-parity-observations.md) record the component results and the existing UI rules that govern the44px close target and shared shadows. The design file is unchanged; its hash and all2,146 extracted nodes are preserved in [pen-reference.json](evidence/pen-reference.json).

Acceptance is complete: **12/12 tasks**, including4.2,4.3 and4.5, and the proposal acceptance checkbox. Independent review approved all14 frames and39 changed source files with no findings. No spec sync or archive has been performed.

## Implementation and parity corrections

The shared contract resolves `entries`/`tasks`, defaults historical documents to `entries`, and preserves a saved mode when PATCH omits it. Grouping uses task ID, first-appearance order, historical names and individually rounded durations. PDF cents are allocated to saved entries before aggregation. Mode-only changes preserve entry links, snapshots and billing values; existing revision/access checks remain active. OpenAPI, Bruno examples and product documentation are updated. No database migration or package dependency was added.

Actual JSON comparison corrected the selector to a two-segment PrimeVue SelectButton; field typography, colors, order and spacing; task headers, counts and child states; mobile cards and details; date grouping, totals and payment lines. PDF corrections include official licensed Inter fonts, labels, table dimensions/alignment, compact hours, payment lines, normal-page flow footer and fixed-width wrapping in both formats. Font assets and OFL are retained with the API's existing report assets.

This delta was reconciled against completed `extend-invoice-management` (#527): issue/due dates, party/payment sections, personal groups, copy/eligibility rules, access, rounding and revisions remain part of that contract.

## Real-page acceptance

Chrome for Testing, actual Admin app at local port5186 with the API at3016 and an isolated PostgreSQL manual-test database. Desktop **1280×900**, mobile **375×812**. The application's test-only identity provider was used; no production account/data. Browser automation used `agent-browser` because native computer-control OS permissions were unavailable.

The final design-content fixture is [parity-fixture.json](evidence/parity-fixture.json), source INV-4. Dashboard UX has selected10h+7h and excluded2h; Invoice editing has8h. Rate100USD,15-minute rounding,10% discount: **25h /2,500.00−250.00=2,250.00USD**. December has independent eligible entries for copy. The exact saved API response used for reference-content PDFs is [parity-pdf-invoice-source.json](evidence/parity-pdf-invoice-source.json). Generated references, seed contributors and saved text substitutions are identified in the component report.

| Scenario | Result / evidence |
| --- | --- |
| Create/edit/detail, both modes, both viewports | PASS. All12 final screen captures and adjacent computed-style JSON files are linked in the [frame matrix](component-parity.md). Desktop tables and375px mobile cards/stacking were exercised separately. |
| Switch modes repeatedly | PASS. Same3/4 selection,25h and2,250.00USD; excluded2h stays excluded. |
| Exclude and restore a child | PASS. Mobile exclusion of10h produces15h/1,350.00USD; restoring returns25h/2,250.00USD. Earlier save/reopen exclusion of7h produced18h/1,620.00USD and persisted correctly. [Final child-state capture](evidence/parity-ui-mobile-child-excluded.png), [saved-state evidence](evidence/mobile-saved-exclusion.txt). |
| Mixed, all and excluded task selection | PASS. Dashboard2/3 mixed; keyboard bulk-select gives27h/2,430.00USD; clearing Dashboard retains Invoice editing8h/720.00USD; child restoration returns25h. Disclosure remains available for excluded groups. |
| Save, reopen, mode-only save and cancel | PASS. Saved Task restores its expansion/selection data; saved Time entry renders individual rows; restoring Task retains snapshots and amounts. Cancel leaves the saved mode intact. [Earlier persisted cancel proof](evidence/cancel-preserves-task-mode.txt), final UI observations contain the repeat checks. |
| Copy to another period | PASS. Task inherited; December eligibility reviewed; selected destination entries yield25h/2,250.00USD. Source response/revision unchanged and destination entry IDs disjoint. [Exact before/after proof](evidence/parity-ui-copy-independence.json). The disposable QA copy was deleted after verification to release December entries for a separate normal-create draft, which was discarded; source INV-4 and earlier INV-2 were retained. |
| Keyboard and accessible states | PASS. Native SelectButton Enter/Space switches modes; pressing the active segment cannot clear the mode. Labeled group, pressed states, disclosure expanded state, mixed checkbox and inclusion announcements inspected. [Keyboard proof](evidence/parity-ui-keyboard-proof.json). Actual assistive-technology speech was not tested. |
| Long task at375px | PASS. Title wraps without horizontal page overflow. [Capture](evidence/long-title-375.png); final mobile measurements are recorded beside frame captures. |
| Settings consumer of payment fields | PASS. Actual Settings Invoice defaults page: Bank/Card/Other branches on desktop and375px mobile; drafts discarded without saving defaults. [Six captures/measurements](evidence/ui-parity-observations.md). |

An earlier browser accessibility scan found existing contrast3.42:1 on the unchanged Delete invoice action. No whole-page WCAG conformance claim is made.

## PDF acceptance

| Scenario | Result / evidence |
| --- | --- |
| Both normal A4 references | PASS. Same saved25h fixture; physical A4595.28×841.89pt. [Entries PDF](evidence/parity-pdf-entries.pdf), [Task PDF](evidence/parity-pdf-tasks.pdf), corresponding PNG renders and [every-text-node matrix](evidence/parity-pdf-component-matrix.json). |
| Task lines and amounts | PASS. Dashboard UX17h/1,700.00 and Invoice editing8h/800.00; rate100.00; subtotal2,500.00, discount−250.00, total2,250.00USD. Entry mode10h/8h/7h retains the same totals. |
| Exclusions and private details | PASS. Excluded2h omitted in both modes. Task rows contain no entry dates, workers or individual work descriptions; invoice-level service/payment/notes retained. |
| Every visible section/style | PASS.53/53 Entries and49/49 Tasks rendered text nodes match Inter weight/size/color. Optional logo omission follows frame context. Headings, metadata, parties, services, table/rows, amounts/totals, payment, notes, divider/footer checked individually in [PDF observations](evidence/pdf-parity-observations.md). |
| Actual Download PDF action | PASS in both modes from the same three saved entries on INV-1. [Task download](evidence/parity-chrome-tasks.pdf), [Entry download](evidence/parity-chrome-entries.pdf), [independent physical checks](evidence/parity-chrome-pdf-check.json).25h/2,250.00USD in both; [snapshots preserved](evidence/parity-chrome-export-proof.json), final saved mode restored to Task. |
| Long title and pagination | PASS. [Final stress PDF](evidence/parity-pdf-long.pdf):45tasks/fiveA4pages;250 unbroken characters preserved, numeric columns visible, headers/footers repeated, total once on final page. Stress fixture11.25h/1,012.50USD is separate from the25h normal fixture. |
| Physical geometry | PASS. All normal/stress PDF glyphs within x36–559.280001pt. Actual PDF extraction is independent of pdfmake logical node positions. Exact reference geometry and inferred flex positions are distinguished in the evidence. |

Older `invoice-*.pdf`, `pdf-*.png` and non-`parity-ui-` captures preserve initial functional checks; the final acceptance artifacts above supersede them for typography, geometry and pagination.

## Automated checks and review

| Check | Final result |
| --- | --- |
| Repository `pnpm typecheck` | PASS —11/11 Turbo tasks |
| Repository `pnpm lint` | PASS —11/11 Turbo tasks; existing warnings only |
| Repository tests, serialized Turbo execution | PASS —11/11 Turbo tasks,3,872 package tests |
| CI-target script tests | PASS —5/5;3,877 tests combined with packages |
| API/Admin production build | PASS —5/5 Turbo tasks, including font assets; existing chunk-size warning only |
| Final color-class corrections: Admin build/typecheck/lint/tests | PASS —7/7 Turbo tasks,1,056 tests/92 files |
| Full API end-to-end, isolated guarded database | PASS —470/470 tests,37/37 files; [durable run record](evidence/parity-pdf-final-e2e-verification.json) |
| Focused PDF regression suite | PASS —21/21, including physical bounds, full title preservation, actual header height, pagination and cent allocation |
| OpenAPI export | PASS during implementation; generated mode contract checked |
| Strict OpenSpec validation, both this change and #527 | PASS |
| Independent final review | APPROVE —0 findings;39 source files,12 UI frames and2 PDF frames; source hashes and all evidence links verified |
| Whitespace and evidence links | PASS |

Package totals: web-config18, shared754, landing17, web-shared310, API796, Chrome extension261, Admin1,056, User660. Broad checks passed after the PDF source freeze; the final text-color corrections have a separate final Admin rerun. Full API e2e initially found an assertion that assumed the first PDF table was the item table; it now locates the actual item header and expects compact hours. The full suite then passed470/470.

Regression coverage includes historical defaults, invalid/missing modes, PATCH omission, access/stale revisions, snapshot preservation after live edits, multiple contributors, duplicate/missing names, interleaved fractional cents, rounding before grouping, empty selection, preview/copy/cancel and exclusions/mode changes.

Local execution logs: `/tmp/task-invoice-parity-final-{typecheck,lint,test,build}.log`; the final e2e run is recorded in the linked durable run record, `/tmp/task-invoice-parity-admin-final.log`. Durable artifacts contain no session tokens. The [source snapshot](evidence/source-snapshot.json) records the base commit and hashes of all39 changed application, contract, font, example and product-documentation files. Temporary browser/API/web-server sessions have been closed; isolated test databases are retained.
