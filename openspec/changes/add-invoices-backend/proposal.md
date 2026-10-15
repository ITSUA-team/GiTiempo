# Proposal

## Why

The data model already describes an `invoices` table and a `time_entries.invoice_id` link, and the MVP proposal lists invoice creation from time-report data as a core Admin/PM capability, but the backend has no invoice endpoints, no Drizzle schema, and no shared contracts — the tables were previously dropped by migration `0021_drop_invoice_tables.sql`. Without this, Admins and PMs cannot bill completed work, and nothing prevents the same time entry from being billed on two different invoices. GitHub issue #439 asks for the complete backend flow plus atomic duplicate-billing prevention.

## What Changes

- Re-introduce the `invoices` Drizzle schema and the `time_entries.invoice_id` foreign key (SET NULL on invoice delete), backed by a new forward migration, mirroring the documented `DATA-MODEL.md` Invoice and TimeEntry entities.
- Add shared Zod invoice contracts (`packages/shared`): invoice status enum (`draft`/`sent`/`paid`), create request, list query, update request, and list/detail responses, including snapshot fields (`hourlyRate`, `currency`, `totalHours`, `totalAmount`) and a time-entry billing-state field on the existing time-entry response contract.
- Implement a NestJS `InvoicesModule` with seven endpoints: `GET /invoices`, `POST /invoices`, `GET /invoices/eligible-entries`, `GET /invoices/stats`, `GET /invoices/:id`, `PATCH /invoices/:id`, `DELETE /invoices/:id`.
- Authorization: Admins and PMs manage invoices; PMs are limited to active public projects plus private projects assigned to them (reusing the reports-style scope); only Admins delete.
- Invoice creation selects only eligible time entries: completed, billable, not running, not already linked to another invoice, within the requested workspace/project/date range. Selection, invoice insert, and `time_entries.invoice_id` association happen atomically in one transaction so concurrent requests cannot bill the same entry twice.
- A `GET /invoices/eligible-entries` endpoint previews the time entries that would be billed for a given project scope and date range, returning entry summaries with user and task names plus computed total hours, without creating an invoice or modifying any data. PMs must scope the preview to an assigned project.
- A `GET /invoices/stats` endpoint returns aggregate invoice counts by status and a summary of invoices created in the current calendar month, scoped to the caller's visibility (admins see all workspace invoices; PMs see only visible-project invoices).
- Totals are computed from selected entries (tracked hours × hourly rate − optional percentage discount) and stored as snapshots; later rate/entry changes never silently recalculate an existing invoice.
- Deleting an invoice unlinks its time entries (`invoice_id` SET NULL), making them eligible again; deletion is Admin-only.
- Regenerate `packages/shared/openapi.json` and update `docs/API-ENDPOINTS.md` Invoices section with the request/response contracts and eligibility rules.
- Add unit and e2e coverage for authorization, validation, totals calculation, eligibility filtering, atomic duplicate-billing prevention under concurrency, and deletion unlinking.

## Capabilities

### New Capabilities

- `invoices-api`: Protected invoice endpoints for Admins and PMs — listing, creation from eligible time entries, eligible-entry preview, stats, details, updates, and Admin-only deletion, with workspace isolation, PM assigned-project visibility, atomic time-entry association, and snapshot totals.

### Modified Capabilities

- `data-model`: Add the `invoices` table and the `time_entries.invoice_id` foreign key with `SET NULL` on delete, and require that a completed time entry can be linked to at most one invoice at the data level so duplicate billing is prevented even under concurrent invoice creation.
- `contracts`: Add invoice request/response contracts (status enum, create, list query, update, list/detail responses with snapshot fields, eligible-entries query and response, stats response) and extend the shared time-entry response contract with the invoice link so clients can surface billed state.

## Impact

- **Layers:** backend, shared. No frontend change in this change (Admin SPA invoice UI is a separate effort).
- **API:** new `/invoices` endpoints under `apps/api`; contract and OpenAPI artifact changes in `packages/shared`.
- **Backend:** new `apps/api/src/invoices` module (controller, service, DTOs, schema), `time-entries.schema.ts` gains `invoice_id`, `db/schema.ts` re-exports the invoice schema, `app.module.ts` registers `InvoicesModule`, new Drizzle migration under `apps/api/drizzle`.
- **Shared:** new `packages/shared/src/contracts/invoices.ts`, updated `packages/shared/src/index.ts`, regenerated `packages/shared/openapi.json`, and an extended time-entry response contract.
- **Authentication:** unchanged; invoice endpoints reuse JWT workspace claims and `MembersService.requireRole(['admin','pm'])` plus PM project-assignment visibility, matching `reports-api`.
- **Database:** forward migration re-creates `invoices` and adds `time_entries.invoice_id` with the partial index `time_entries_invoice_id_idx` (where not null) and the `invoices_workspace_id_idx` index, reversing the state left by `0021_drop_invoice_tables.sql`.
- **Related issue:** GitHub issue #439 (ITSUA-team/GiTiempo).