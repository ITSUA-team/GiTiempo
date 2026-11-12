# Component acceptance — group-invoice-time-by-task

The approved `GITiempo.pen` was read directly as JSON, as requested. Its SHA-256 is `ba5dff1e63be0fec49f91d1e7f85cbef624d6b7367ca9f8f0e25651c1151c223`; the design file is unchanged. The [reference extraction](evidence/pen-reference.json) preserves the 14 frames, their 2,146 nodes, variables, IDs and attributes. This supersedes the earlier Pencil access blocker.

Comparison uses the actual local Admin application in Chrome for Testing at **1280×900** and **375×812**, computed styles/geometry and screenshots, and physically rendered A4 PDFs. JSON flex coordinates that require layout inference are identified as inference; this is a component comparison, not a claimed pixel-diff against a Pencil screenshot.

## Frame and viewport coverage

Each editor frame was checked against E1–E12 below, each detail frame against D1–D8. The linked screenshot and adjacent `.json` contain the corresponding final rendered state. Full measurements, reference nodes and interaction results are in the [UI observations](evidence/ui-parity-observations.md).

| Approved frame | Screen / mode / viewport | Result / final capture |
| --- | --- | --- |
| `i527_0633` | Create / Time entry / 1280×900 | PASS — [capture](evidence/parity-ui-create-entries-1280.png) |
| `i527_1142` | Create / Time entry / 375×812 | PASS — [capture](evidence/parity-ui-create-entries-375.png) |
| `task_create_desktop` | Create / Task / 1280×900 | PASS — [capture](evidence/parity-ui-create-tasks-1280.png) |
| `task_create_mobile` | Create / Task / 375×812 | PASS — [capture](evidence/parity-ui-create-tasks-375.png) |
| `i527_0457` | Edit / Time entry / 1280×900 | PASS — [capture](evidence/parity-ui-edit-entries-1280.png) |
| `i527_0970` | Edit / Time entry / 375×812 | PASS — [capture](evidence/parity-ui-edit-entries-375.png) |
| `task_edit_desktop` | Edit / Task / 1280×900 | PASS — [capture](evidence/parity-ui-edit-tasks-1280.png) |
| `task_edit_mobile` | Edit / Task / 375×812 | PASS — [capture](evidence/parity-ui-edit-tasks-375.png) |
| `i527_0281` | Detail / Time entry / 1280×900 | PASS — [capture](evidence/parity-ui-detail-entries-1280.png) |
| `i527_1217` | Detail / Time entry / 375×812 | PASS — [capture](evidence/parity-ui-detail-entries-375.png) |
| `task_detail_desktop` | Detail / Task / 1280×900 | PASS — [capture](evidence/parity-ui-detail-tasks-1280.png) |
| `task_detail_mobile` | Detail / Task / 375×812 | PASS — [capture](evidence/parity-ui-detail-tasks-375.png) |
| `i527_0712` | A4 / Time entry / 595.28×841.89pt | PASS — [PDF](evidence/parity-pdf-entries.pdf), [render](evidence/parity-pdf-entries.png) |
| `task_pdf_a4` | A4 / Task / 595.28×841.89pt | PASS — [PDF](evidence/parity-pdf-tasks.pdf), [render](evidence/parity-pdf-tasks.png) |

## Editor component checklist — all eight create/edit frames

| ID / component | Reference and final result |
| --- | --- |
| E1 Modal, header, close, footer | PASS. 1000px desktop modal, 24px padding; mobile width375px and16px padding; 10px radius,1px border. Correct Create/Edit heading and Create invoice/Save changes actions; scrolling retains reachable fields/actions. Close target and shadows follow documented shared UI rules below. |
| E2 Personal group and project | PASS. Personal group precedes project; existing selection/filter integration retained. Destination period reloads eligible work on copy. Field values13px/400, dark,38px controls. |
| E3 Billing period, issue and due dates | PASS. All fields and order retained. Correct desktop grouping/mobile stacking and saved dates. Editor date labels13px/500, values13px; no invented combined issue/due field. |
| E4 Parties | PASS. From/Bill to, legal names, address/email/tax fields and saved-sender context present in the correct section/order. Party labels13px/500 dark; address minimum38px can grow with wrapped text. |
| E5 Service, rate, rounding, discount | PASS. Service and supporting fields retained in order. Rate100USD,15-minute rounding,10% discount. Textareas70px; values13px/400 dark. |
| E6 Section header/count/helper | PASS. Task mode says Tasks. Inclusion count12px/500 brand; helper12px; wording explains that exclusion preserves tracked time. Time entry mode retains its corresponding heading. |
| E7 Show time by | PASS after correction. PrimeVue SelectButton provides the two segments, not a dropdown:32px buttons,3px container padding,8px outer/6px inner radii,13px labels, selected600 brand/inactive500 muted. Exactly one value stays selected. Accessible group label and native pressed states retained. |
| E8 Task group header | PASS after correction. App background,6px radius,8×12px padding,10px gap; title/count stacked with3px gap; count includes “entries”. Dashboard2/3 and17h; Invoice editing1/1 and8h. Disclosure remains reachable with an excluded group. |
| E9 Desktop rows and child states | PASS. Checkbox18px; date12px, description13px. Selection, dates, contributor, description and duration retained. Only excluded description is muted; task headers aggregate selected rounded time. |
| E10 Mobile child cards | PASS after correction. App-background cards without an extra border,6px radius; title13px/500 dark; metadata11px/400 muted; description12px/400 muted; Included12px/500 brand, Excluded muted. Checkbox and disclosure independently reachable. |
| E11 Totals | PASS.25h, subtotal2,500.00USD, discount−250.00USD and total2,250.00USD. Body13px dark; total18px mobile/24px desktop,600 brand. Switching format does not change selection or totals. |
| E12 Payment, notes and actions | PASS after correction. All method-dependent payment fields, terms, beneficiary, bank, account, SWIFT and instructions retained in order;12px field gaps; instructions/notes70px. Action labels13px/500,38px button height. Cancel discards pending changes; save/reopen preserves them. |

## Saved detail checklist — all four detail frames

| ID / component | Reference and final result |
| --- | --- |
| D1 Shell, reference and actions | PASS. Reference/status/group, back, Download PDF, Create from this invoice and Edit invoice present with desktop/mobile action layout. Generated reference and updated date are fixture values. |
| D2 From / Bill to cards | PASS. Names, addresses, email/tax and sender context retained. Desktop addresses/email dark; mobile muted. Existing1px card borders match the JSON; shared shadow policy is documented below. |
| D3 Service and dates | PASS after correction. Service heading dark; issue/due dates form their own two-column desktop row and stack on mobile. Project, billing period, rate and rounding remain in the following scope grid. |
| D4 Billing totals | PASS.25h,2,500.00USD,10%/−250.00USD and2,250.00USD in both modes. Correct dark body typography and brand total. |
| D5 Included section heading/count | PASS after correction. Desktop Task mode says Included tasks with2tasks·25h, not3entries; mobile heading includes count/time. Entry mode retains3entries·25h. |
| D6 Rows/cards | PASS. Task mode has two task rows/cards, Dashboard UX17h and Invoice editing8h, durations400 desktop/600 mobile; no contributor, date or child description leaks. Entry mode has three historical entries with their full metadata. Excluded2h absent in both. |
| D7 How to pay / payment instructions | PASS after correction. Correct heading by viewport; method/terms and all saved instructions visible. Desktop beneficiary·bank and account·SWIFT combined as drawn; mobile wraps/stacking follows its frame. |
| D8 Notes, history and responsive flow | PASS. Notes and history follow payment. Long title wraps at375px, no horizontal page overflow. Full-page captures include scrollable content; they do not imply every section fits into one812px viewport. |

## PDF component checklist — both A4 frames

The [PDF observations](evidence/pdf-parity-observations.md) contain a section-by-section matrix with exact node IDs for sheet/margins, logo/heading/divider, four metadata columns, From/Bill to and each text role, services/project, table/header/columns/every row, subtotal/discount/grand total, payment/account/instructions, notes and closing divider/footer. The [machine-readable matrix](evidence/parity-pdf-component-matrix.json) covers every text node: **53/53 Entries and49/49 Tasks rendered text styles match** Inter family, weight, size and color. The optional logo glyph is explicitly accounted for as omitted when no saved logo exists.

PASS after correction: embedded Inter400/500/600; Issue date and Task labels; compact17/8h;36pt margins; exact numeric column widths/gaps/alignment;31.5pt header band;40.5pt normal row rhythm; all amounts and footer sections. Single-page footers flow after Notes with18pt/divider/18pt spacing. Multipage headers/footers repeat and the grand total occurs once. Actual glyph bounds come from physical PDF extraction, not pdfmake logical parent coordinates.

The [five-page stress PDF](evidence/parity-pdf-long.pdf) retains45 tasks, including a250-character unbroken title. All glyphs remain within x36–559.280001pt, numeric columns remain visible and the final total is unique. This stress fixture has11.25h/1,012.50USD and is separate from the25h/2,250.00USD design fixture.

Actual Chrome Download PDF exports also pass in [both modes](evidence/parity-chrome-pdf-check.json), with [unchanged saved snapshots](evidence/parity-chrome-export-proof.json).

## Recorded differences and governing rules

- The dialog close button keeps a44×44px touch target rather than the38px illustrated box: `docs/ui/components.md`, Buttons, explicitly requires a44×44px minimum. Shared cards/dialogs retain `shadow-card`/`shadow-modal` required by the same document and `docs/ui/INDEX.md`. These are existing product UI requirements, not newly invented visual exceptions.
- Existing shared shell: the mobile authenticated top bar is64px with workspace identity rather than the48px sample header; navigation uses the documented shared treatment. Editor H2 uses the documented28px line height rather than a26px fixed reference text box. Dialog bodies scroll within the viewport instead of displaying the expanded design canvas at once. The exact governing layout/typography/dialog rules and measured deltas are recorded in [UI observations](evidence/ui-parity-observations.md). Shared shell components were not changed by this proposal.
- Generated invoice references (INV-4/INV-5), contributor names, updated date and saved address/instruction text differ from sample copy in the drawing. The recorded fixture identifies these substitutions. Optional logo omission is expressly allowed by the PDF frame context. These affect content/flow, not the implemented component contract.
- The supplied design JSON is the comparison source; inferred flex positions are labeled and no screenshot-level pixel-perfect claim is made. No unresolved component defect or PrimeVue-forced compromise remains.

All discovered implementation discrepancies were corrected and the affected browser/PDF checks repeated. See the [verification report](verification.md) for interaction, regression and independent review evidence.
