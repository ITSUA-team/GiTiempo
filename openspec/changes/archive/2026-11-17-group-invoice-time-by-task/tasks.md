# Implementation and acceptance

All 12 tasks are complete. The approved frames were read directly from `GITiempo.pen` JSON; all 14 frames passed component review with governing UI-rule differences explicitly recorded. Final evidence: [verification report](verification.md) and [component acceptance matrix](component-parity.md). Independent review approved the implementation and acceptance evidence with no findings.

## 1. Shared contracts and grouping

- [x] 1.1 Extend invoice inputs and responses in `packages/shared` with the mode. Cover both valid values, missing values on create/read, omission on PATCH and invalid values. Update the API DTOs, exported OpenAPI document and Bruno create, preview and revise examples together.
- [x] 1.2 Implement a backend-safe task projection over the existing entry shape. Test interleaved IDs, equal names on distinct tasks, multiple workers, missing or differing snapshot names, zero selected entries and per-entry rounding before aggregation.

## 2. API and PDF

- [x] 2.1 Persist and resolve the mode from the invoice document on create, preview, revision and historical reads. Add API integration coverage for an older document, partial updates, a stale revision, PM project access and a format-only save after a task rename. Verify that linked entry IDs, snapshots and billed values are preserved.
- [x] 2.2 Render task rows in the saved PDF. Allocate each entry its share of the subtotal before grouping. Test interleaved entries with a fractional-cent split, an excluded entry, zero time, a discount and an unsaved edit. Compare subtotal, discount, total and the sum of the line amounts with the Time entry export.

## 3. Admin SPA

- [x] 3.1 Wire **Show time by** into create, edit and create-from-invoice. Restore the saved format on edit, inherit it on copy, and review eligibility for the new period. Cover submit, cancel and copy through the dialog with a test that the source invoice stays intact.
- [x] 3.2 Implement the expandable task view on desktop and mobile using the existing entry selection. Test partial and fully excluded tasks, selection across repeated mode changes, a rounding-step change and recovery from an unavailable entry. Verify keyboard access and selection/expansion announcements.
- [x] 3.3 Show the saved format in invoice details, including the empty state. Test desktop and mobile rendering of a task shared by multiple people and the historical default entry layout.

## 4. Documentation and acceptance

- [x] 4.1 Update the invoice sections of `docs/PROPOSAL.md`, `docs/API-ENDPOINTS.md`, `docs/DATA-MODEL.md` and `docs/ui/pages-admin.md` to match the implemented contract and the frame map in [design.md](design.md).
- [x] 4.2 Manually compare create, edit and saved details against both sets of frames in Chrome for Testing at desktop and mobile widths (including 375 px). Use the 25h design example; switch formats, exclude and restore a child, save, reopen and copy to another period. Record viewport, result and any remaining differences.
- [x] 4.3 Export both formats from the same saved selections and inspect the rendered A4 pages against the PDF frames. Verify the 17h and 8h task lines, $2,250.00 total, wrapping for a long title, pagination with many tasks, and absence of excluded entries and individual work details from task rows.
- [x] 4.4 Run the affected unit and integration suites, repository typecheck, lint and tests, API end-to-end tests and strict OpenSpec validation. Reconcile this delta against the completed #527 specification before archiving.
- [x] 4.5 Perform and record a component-by-component comparison of the implemented create, edit and detail screens against each corresponding desktop and mobile `GITiempo.pen` frame, in both Time entry and Task modes. Check every visible section and control, including field presence and order, labels, selection and expansion states, rows, counts, hours, amounts, actions, layout, spacing, typography and responsive behavior. Compare each section and table element of both generated PDFs against their A4 frames, including headers, rows, amounts, totals, payment details and wrapping. Record the frame, viewport or PDF page, component, result and any discrepancy. Fix discrepancies and repeat the affected checks before acceptance; document any approved exception.
