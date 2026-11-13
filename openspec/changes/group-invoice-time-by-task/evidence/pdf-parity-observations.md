# PDF component comparison — entries and tasks

Compared `i527_0712` (Entries) and `task_pdf_a4` (Tasks) directly from the approved `GITiempo.pen` JSON. The user explicitly authorized this read. The `.pen` file was not edited. This evidence records the comparison; the parent integration review owns acceptance.

## Evidence and measurement

- Original actual exports `invoice-entries.pdf` / `invoice-tasks.pdf` were inspected with pdfplumber and rendered PNGs. `parity-pdf-before-metrics.json` preserves their observed text, coordinates and embedded Roboto font. They exposed the corrected discrepancies below.
- Final `parity-pdf-entries.pdf` and `parity-pdf-tasks.pdf` render the same saved invoice response in `parity-pdf-invoice-source.json`, changing only the renderer's display-mode input. Neither operation changes the database, saved selection, snapshots or invoice mode. Each is one physical A4 page, 25h, subtotal 2,500.00 USD, discount −250.00 USD, due 2,250.00 USD.
- `parity-pdf-component-matrix.json` identifies **every text node**: 53 Entries text nodes and 49 Tasks text nodes match their reference family, weight, scaled font size and exact RGB color. The additional `A` logo text is omitted in each fixture because no logo is saved; the frame context explicitly permits this. This is not a missing product element.
- Actual positions in that matrix are **physical PDF glyph bounding boxes from pdfplumber**, not pdfmake parent/table `positions` metadata. `parity-pdf-metrics.json` contains page dimensions, glyph extents, lines, fonts/colors, table header rectangles and PDF SHA-256 values. All final pages' glyphs stay between x=36 and x=559.280001pt.
- `parity-pdf-reference-geometry.json` records every reference frame/text component and explicit dimensions. Reference x/y inferred from flex layout use Inter's actual ascent/descent for unspecified text heights; this is labeled inference, not a captured Pencil rendering. A glyph bounding box is not a flex text box, so no misleading y-delta or pixel-perfect claim is made between those different measurements.
- Reference frame size is 794×1123px, physical PDF 595.28×841.89pt. Exact conversion is x×595.28/794 and y×841.89/1123. Typography and spacing use nominal 0.75pt/px: 48px→36pt, 24px→18pt. The exact physical A4 conversion differs by less than 0.03pt across the content width and 0.4pt across a full sheet.
- Rendered `parity-pdf-entries.png`, `parity-pdf-tasks.png`, `parity-pdf-heading.png`, `parity-pdf-long-4.png` and `parity-pdf-long-5.png` were visually inspected. No clipping, numeric-column overlap, text omission or footer collision was observed.

## Component matrix

Entries and Tasks ID pairs refer to the respective approved frame. Full individual node IDs, source labels, styles and physical bounding boxes are in the JSON matrix.

| Component / reference nodes | Reference | Final physical output / result |
| --- | --- | --- |
| Sheet `i527_0712` / `task_pdf_a4` | White A4, 794×1123px, padding48px | 595.28×841.89pt; x margin36pt; content width523.28pt. One page for both saved normal selections. |
| Heading `i527_0639` / `itm_1073` | Height56px; gap12px; centered; wordmark20px/600; INVOICE28px/600 brand | Height42pt; gap9pt; embedded Inter SemiBold15/21pt, dark/brand. Sender and INVOICE remain aligned; heading crop independently inspected. |
| Optional logo `i527_0635` / `itm_1075`; glyph `i527_0634` / `itm_1076` | 48px square, 10px radius; A22px/600; omission allowed | Saved fixture has no logo: no synthetic brand mark is substituted. Existing PNG/SVG logo validation/render tests remain green. |
| Heading divider `i527_0640` / `itm_1079` | 1px divider; 24px surrounding gaps | 0.75pt physical divider, full523.28pt width; 18pt gaps. Divider consumes its own layout height. |
| Identification `i527_0650` / `itm_1080` | 4 equal columns; gap12px | Columns begin x36,169.07,302.14,435.21pt; gap9pt. Reference raw/inferred columns are retained in geometry JSON. |
| Labels `i527_0641,0644,i527_dates_74,0647` / `itm_1082,1085,1088,1091` | Invoice number / **Issue date** / Due date / Billing period; Inter12px muted | Exact labels, Inter Regular9pt, #666666. **Issued** was corrected. |
| Metadata values `i527_0642,0645,i527_dates_75,0648` / `itm_1083,1086,1089,1092` | Ref16px/600; dates14px/500; label/value gap12px | Ref12pt SemiBold, dates10.5pt Medium; gap9pt. 11 Nov 2026 / 11 Dec 2026 / **01–30 Nov 2026**. Generated reference INV-4 is a fixture value. |
| Parties `i527_0663` / `itm_1093` | 2 columns, gap32px, internal gaps10px | x36 /309.64pt; gap24pt, internal7.5pt gaps. Address minimum40px→30pt retained; long addresses can expand. |
| FROM/BILL TO `i527_0651,0657` / `itm_1095,1101` | 12px/600 brand | Inter SemiBold9pt, #5D2B85. |
| Legal names `i527_0652,0658` / `itm_1096,1102` | 16px/600 dark | Inter SemiBold12pt, #1A1A1A. |
| Addresses/email `i527_0653,0654,0659,0660` / `itm_1097,1098,1103,1104` | 13px normal dark; address40px height | Inter Regular9.75pt dark; reserved30pt address height. Comma-separated one-line addresses are saved fixture data; source design has explicit newlines. |
| Tax IDs `i527_0655,0661` / `itm_1099,1105` | 12px normal muted | Inter Regular9pt, #666666; corrected from inherited dark10pt. |
| Services `i527_0666` / `itm_1106` | Title18px/600 dark, project13px muted; gap8px | SemiBold13.5pt / Regular9.75pt muted; gap6pt. Exact saved Product design & development and Project Orion · November 2026. |
| Table header `i527_0671` / `itm_1110` | Height42px; fill #E8E1F5; padding12px; gap12px; labels12px/600 | Actual background rectangles each **31.5pt high**; fill exact; edge padding9pt, column gaps9pt; Inter SemiBold9pt. The physical-height regression caught and corrected an earlier38.25pt band. |
| Description header `i527_0667` / `itm_1111` | Entries: Service / work description; Tasks: **Task** | Exact mode-specific labels. Tasks formerly inherited Entries label. |
| Numeric headings `i527_0668–0670` / `itm_1112–1114` | Hours / Rate / Amount; widths54/76/90px; left alignment | Content widths40.5/57/67.5pt; physical left x367.28/416.78/482.78pt; exact headings and left alignment. |
| Entry rows `i527_0676,0681,0686` | 54px height; descriptions10/8/7h; rate100; amounts1000/800/700 | Minimum40.5pt row rhythm, 0.75pt bottom divider; all three saved descriptions in original order; hours **10/8/7**, rate100.00, amounts1,000.00/800.00/700.00. |
| Task rows `itm_1115,itm_1120` | Dashboard UX17h; Invoice editing8h; no dates/workers/descriptions | Exact two rows in first-encounter task order; hours **17/8**, rate100.00, amounts1,700.00/800.00. Inter Regular9.75pt dark. |
| Text wrapping / pagination | Frame context: long descriptions wrap, repeated item headers, page numbers/footer, final grand total once | Fixed description width in **both modes**, no truncation. 250 unbroken W characters preserved; all numeric columns inside page. Headers repeat on item pages; no personal groups/editor controls. |
| Totals `i527_0698` / `itm_1130` | Gap12px; 19px subtotal/discount rows; labels13px, amounts14px; divider1px | Gaps9pt; minimum14.25pt rows; Regular9.75pt labels, Medium10.5pt subtotal, Regular10.5pt discount; divider0.75pt. Saved25h and unchanged2,500.00/−250.00 USD. |
| Grand total `i527_0695,0696` / `itm_1139,1140` | TOTAL DUE14px/600; amount24px/600 brand, vertically centered | Inter SemiBold10.5/18pt; #1A1A1A / #5D2B85; 2,250.00 USD. Only one grand total, on final page. |
| Payment `i527_0704` / `itm_1141` | HOW TO PAY12px/600 brand; first line14px/500; other lines13px; gaps10px | SemiBold9pt heading, Medium10.5pt Bank transfer · Net 30, Regular9.75pt body; gaps7.5pt. |
| Account `i527_0702` / `itm_1145` | Account: DEMO-ACCOUNT-001 · SWIFT: DEMOBANK | Exact single line. Prior separate Account and SWIFT / BIC lines corrected. Long payment content still wraps/paginates. |
| Payment instruction `i527_0703` / `itm_1146` | Please include payment reference INV-2026-042. | Saved fixture says Please include the invoice reference. Renderer uses saved instruction verbatim; layout/font match. |
| Notes `i527_0707` / `itm_1147` | Notes12px/600 dark; body13px muted; gap8px | SemiBold9pt dark / Regular9.75pt muted; gap6pt; exact saved Thank you for your partnership. |
| Closing divider `i527_0708` / `itm_1150` | Notes→gap24px→divider1px→gap24px→footer | Single-page flow now exact18pt→0.75pt→18pt. Previous fixed-bottom one-page footer corrected. |
| Footer `i527_0711` / `itm_1151` | Sender·email; Page1of1; Inter11px muted | Inter Regular8.25pt, #666666; same baseline. Actual glyph top **786.580pt Entries /746.080pt Tasks**, right edge559.280pt. Repeated bottom footer and correct page count retained for multipage output. |

## Long / hostile export

`parity-pdf-long.pdf` is a separate deterministic stress case derived from the same saved response: 45 distinct tasks of15 minutes,44 long spaced titles and one250-character unbroken title. It intentionally has different billing data:11.25h, subtotal1,125.00 USD,10% discount112.50 USD, due1,012.50 USD. It is **not** the25h normal invoice fixture.

Observed five physical A4 pages. All44 numbered tasks and all250 W characters are present. Final row displays0.25h /100.00 /25.00. Page4 PNG shows the wrapped unbroken title with numeric columns intact and no footer overlap; page5 PNG shows the unique final total and Page5of5. The test suite independently exercises80 spaced titles,40 unbroken-title entries/tasks, a single160-line description, long payment/notes and long sender/footer names. The root integration lane owns re-export of the separate existing API45-task fixture.

## Changes, documentation and verification

Corrected original renderer differences: Roboto→Inter400/500/600; Issue date; Task header; compact hours; metadata date range; table widths/gaps/alignment/vertical centering; body/font scale; party spacing and muted Tax ID; totals type/gaps/minimum rows; Unicode minus; combined account·SWIFT line; actual-height dividers; single-page flow footer; fixed width/wrapping in both modes. Cumulative saved-entry cent allocation still occurs **before** grouping; grouping sums those cents and cannot alter subtotal/discount/total.

Official sources checked through Context7: [pdfmake0.2.20 table examples](https://github.com/bpampuch/pdfmake/blob/0.2.20/examples/pdfs/tables.pdf) establish fixed-width cells wrap and retain their width; [PDFKit font documentation](https://github.com/foliojs/pdfkit/blob/master/docs/text.md) documents custom font embedding. The installed fork failed a trial WOFF2 subset with a buffer-bounds error; those trial assets were removed. Final unmodified static TTFs come from the official [Inter4.1 release](https://github.com/rsms/inter/releases/tag/v4.1), extras/ttf/Inter-Regular.ttf, Inter-Medium.ttf and Inter-SemiBold.ttf. Release OFL is retained as `apps/api/src/reports/assets/Inter-LICENSE.txt`. Existing Nest assets copying includes those fonts; existing report PDF font choice is unchanged. No dependencies added.

Fresh focused check: `pnpm --filter @gitiempo/api exec vitest run src/invoices/services/invoice-pdf.spec.ts` → **21/21 PASS**. The physical header-height test failed at38.25pt before the callback correction and passes at31.5pt. Both-mode unbroken-title tests inspect actual glyph coordinates and complete title preservation, not just document-definition strings. API typecheck, changed-file ESLint and `git diff --check` pass. Broader suites and API export integration are owned by the parent lane.

Follow-up final verification: the saved-mode invoice e2e assertion now finds the items table by its exact Task|Hours|Rate|Amount heading (the heading is also a table), and expects compact0.5 hours. Full isolated API e2e completed **37/37 files,470/470 tests PASS**, exit0,41.12s; see `parity-pdf-final-e2e-verification.json`. Final long-page4/5 PNGs were regenerated from the final PDF and visually checked, including Bank transfer · Net30.
