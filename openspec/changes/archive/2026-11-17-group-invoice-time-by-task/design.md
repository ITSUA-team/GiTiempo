# Invoice time display modes

## Context

The editor keeps individually selected `timeEntryIds`, and the API already rounds each entry before calculating the invoice total. Saved entry snapshots carry the task ID and name, the worker and the rounded duration. The PDF currently allocates the invoice subtotal across these entries in their saved order. This design uses the same inputs for the task view. It builds on the saved-document behavior in `extend-invoice-management` (#527).

## Goals and scope

Give the issuer a choice of detail level per invoice. Preserve exact billing, per-entry exclusions, historical labels and current authorization in either format. The invoice list, personal invoice groups, pricing rules and workspace defaults are outside this change.

## Decisions

### Shared contracts and document storage

In `packages/shared/src/contracts/invoices.ts`, define a single `timeDisplayMode` enum with values `entries` and `tasks`. Create and billing preview accept the optional field. When the mode is omitted, a new-invoice preview defaults to `entries`. A revision preview uses the saved preference of the accessible invoice it identifies. The detail and billing preview responses expose the effective mode alongside the existing entries. Keep mode resolution separate from PATCH parsing: an omitted PATCH field preserves the existing preference. Keep the eligible-entries endpoint and the invoice list independent of display mode.

Store the choice in `invoices.document.timeDisplayMode` alongside the document fields. Resolve a missing value to `entries` when reading a historical document. This avoids a SQL migration and lets existing clients keep sending their current requests. Persist a changed mode through the existing authorized, revision-checked write in `apps/api` (see [API guidance](../../../apps/api/AGENTS.md)). A mode-only update advances the revision while preserving snapshot rows, links and totals. A copied draft starts with the source mode and uses the normal reviewed selection for its destination period.

### Task rows and rounding

Use one backend-safe grouping function in `packages/shared` for the Admin editor, saved detail and PDF. Group by task ID across days and contributors. Keep the source indices or entry IDs of members so selection and allocated amounts still refer to the original entries. For saved documents, order groups by the first included entry in saved order. Use the first nonblank saved name in that group, falling back to **Unnamed task**. Tasks with equal names keep separate rows. Use the existing historical detail fallback for legacy invoices without saved entry snapshots.

In the editor, group the full eligible list so even a fully excluded task can be expanded to restore entries. Derive the included count and hours from the selected IDs. Sum `roundedDurationSeconds` before formatting hours. Two six-minute entries at a 15-minute step contribute 30 minutes together and 15 minutes if one is excluded. Switching format keeps the current set of selected entry IDs.

For PDF, allocate cents in original saved entry order using the existing cumulative allocation in `apps/api/src/invoices/services/invoice-pdf.ts`. **Then** sum the allocated cents by task. Example: if three equally long entries A/B/A share a one-cent subtotal, the existing allocation is 0¢/1¢/0¢. Task A shows 0¢ and task B shows 1¢. Regrouping first would move the cent to A. Show the saved invoice rate on each task row and retain the existing invoice-level discount and total.

### Admin editor, details and PDF

In `apps/admin-web` (see [Admin SPA guidance](../../../apps/admin-web/AGENTS.md)), keep the choice in the existing create/edit dialog state. Place the labeled **Show time by** selector immediately above the time section's rows. **Time entry** selects the existing table. **Task** shows one expandable group per eligible task with included/available counts and included hours. Individual inclusion stays available on each expanded entry. The desktop child table’s header checkbox reflects and changes only that task’s entries. Use the established PrimeVue controls, accessible labels, keyboard operation and visible expansion and selection states. Switching modes needs no eligibility refresh. Editing restores the saved choice; canceling discards pending changes.

Saved details and the A4 PDF render the saved format. In Task mode details show the task title and total billed duration. The PDF adds the saved rate and allocated line amount. Both omit tasks with no included entries and omit individual work dates, contributor names and entry descriptions from task rows. The invoice-level service description, billing period and payment sections remain visible.

### Design references

The entry and task variants in the repository's [GITiempo.pen](../../../GITiempo.pen) use the same billing example so the rows can be compared directly. Create shows a December draft. Edit, detail and PDF show the November invoice INV-2026-042.

| Surface | Time entry frame | Task frame |
| --- | --- | --- |
| Create, desktop / mobile | `i527_0633` / `i527_1142` | `task_create_desktop` / `task_create_mobile` |
| Edit, desktop / mobile | `i527_0457` / `i527_0970` | `task_edit_desktop` / `task_edit_mobile` |
| Detail, desktop / mobile | `i527_0281` / `i527_1217` | `task_detail_desktop` / `task_detail_mobile` |
| A4 PDF | `i527_0712` | `task_pdf_a4` |

The example bills Dashboard UX for 17h (10h + 7h, with a 2h entry excluded) and Invoice editing for 8h. Both formats show 25h, a $2,500.00 subtotal at $100/h, a $250.00 discount and a $2,250.00 total.

## Risks and verification

- Mixing task identity with its displayed name can merge distinct work or change old documents after a rename. Exercise duplicate, blank and changed names against saved snapshots.
- Rounding grouped durations or amounts again can change the bill. Test both the small rounding examples above and a zero-subtotal invoice.
- A grouped editor can hide exclusions or reselect entries during a mode change. Verify partial selection, a fully excluded task, a copied draft and a stale revision in addition to the two saved document layouts.
- Check grouped rows, wrapping, disclosure controls and reachable actions at desktop and mobile widths. Verify multi-page PDF output and compare the same saved invoice across both formats.
