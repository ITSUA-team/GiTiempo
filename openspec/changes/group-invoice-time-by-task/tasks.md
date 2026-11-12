# Implementation and acceptance

## 1. Shared contracts and grouping

- [ ] 1.1 Extend invoice inputs and responses in `packages/shared` with the mode. Cover both valid values, missing values on create/read, omission on PATCH and invalid values. Update the API DTOs, exported OpenAPI document and Bruno create, preview and revise examples together.
- [ ] 1.2 Implement a backend-safe task projection over the existing entry shape. Test interleaved IDs, equal names on distinct tasks, multiple workers, missing or differing snapshot names, zero selected entries and per-entry rounding before aggregation.

## 2. API and PDF

- [ ] 2.1 Persist and resolve the mode from the invoice document on create, preview, revision and historical reads. Add API integration coverage for an older document, partial updates, a stale revision, PM project access and a format-only save after a task rename. Verify that linked entry IDs, snapshots and billed values are preserved.
- [ ] 2.2 Render task rows in the saved PDF. Allocate each entry its share of the subtotal before grouping. Test interleaved entries with a fractional-cent split, an excluded entry, zero time, a discount and an unsaved edit. Compare subtotal, discount, total and the sum of the line amounts with the Time entry export.

## 3. Admin SPA

- [ ] 3.1 Wire **Show time by** into create, edit and create-from-invoice. Restore the saved format on edit, inherit it on copy, and review eligibility for the new period. Cover submit, cancel and copy through the dialog with a test that the source invoice stays intact.
- [ ] 3.2 Implement the expandable task view on desktop and mobile using the existing entry selection. Test partial and fully excluded tasks, selection across repeated mode changes, a rounding-step change and recovery from an unavailable entry. Verify keyboard access and selection/expansion announcements.
- [ ] 3.3 Show the saved format in invoice details, including the empty state. Test desktop and mobile rendering of a task shared by multiple people and the historical default entry layout.

## 4. Documentation and acceptance

- [ ] 4.1 Update the invoice sections of `docs/PROPOSAL.md`, `docs/API-ENDPOINTS.md`, `docs/DATA-MODEL.md` and `docs/ui/pages-admin.md` to match the implemented contract and the frame map in [design.md](design.md).
- [ ] 4.2 Manually compare create, edit and saved details against both sets of frames in Chrome for Testing at desktop and mobile widths (including 375 px). Use the 25h design example; switch formats, exclude and restore a child, save, reopen and copy to another period. Record viewport, result and any remaining differences.
- [ ] 4.3 Export both formats from the same saved selections and inspect the rendered A4 pages against the PDF frames. Verify the 17h and 8h task lines, $2,250.00 total, wrapping for a long title, pagination with many tasks, and absence of excluded entries and individual work details from task rows.
- [ ] 4.4 Run the affected unit and integration suites, repository typecheck, lint and tests, API end-to-end tests and strict OpenSpec validation. Reconcile this delta against the completed #527 specification before archiving.
