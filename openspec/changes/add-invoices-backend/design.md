# Design

## Context

The data model already documents an `invoices` table and a `time_entries.invoice_id` link in `docs/DATA-MODEL.md`, and the MVP proposal lists invoice creation as a core Admin/PM capability. The tables were previously introduced and then reverted by migration `0021_drop_invoice_tables.sql`, so no `invoices` schema, contract, or module exists today. The backend already establishes the authorization and scoping pattern this work needs: `MembersService.requireRole(['admin','pm'])` plus PM project-assignment visibility, implemented identically in `ReportsService.buildQueryContext()` (reports module). The `time-entries` schema currently has no `invoice_id` column. Shared contracts live as Zod schemas in `packages/shared/src/contracts/*`, wrapped by `createZodDto` in the API, and OpenAPI is exported via `apps/api/src/openapi/export.ts`.

See `proposal.md` for motivation and `specs/` for the behavior contract.

## Goals / Non-Goals

**Goals:**

- Re-introduce the `invoices` table and `time_entries.invoice_id` FK with a forward migration matching the documented schema.
- Implement the five documented invoice endpoints with Admin/PM authorization, PM assigned-project visibility, and Admin-only deletion.
- Make invoice creation atomic so a time entry can never be billed twice, even under concurrent requests.
- Store invoice totals as snapshots that survive later rate and time-entry changes.
- Add shared Zod contracts, regenerate OpenAPI, and cover authorization, validation, totals, eligibility, atomicity, and deletion unlinking with unit and e2e tests.

**Non-Goals:**

- PDF or document generation for invoices (explicitly deferred by the proposal and issue #439).
- Admin SPA / user-web invoice UI — a separate frontend effort.
- Recalculating existing invoice totals automatically when time entries or rates change.
- Changing time-entry CRUD behavior beyond exposing the optional `invoiceId` on the response.
- Multi-currency conversion or historical rate tables; the invoice snapshots one currency and one rate at creation.

## Decisions

### 1. Mirror the reports module's authorization and PM scope

Reuse `MembersService.requireRole(user.sub, user.workspaceId, ['admin','pm'])` and the PM project-assignment visibility pattern from `ReportsService.buildQueryContext()`: PMs see active public projects plus private projects assigned to them via `project_assignments`; admins see all. Apply the same join condition (`projects.isActive = true AND (projects.visibility = 'public' OR project_assignments.userId = user.sub)`) to invoice list, detail, create, update, and (admin-only) delete. This keeps authorization consistent with the existing reports capability and avoids a new generic auth framework.

**Alternative considered:** a shared decorator/guard. Rejected — the codebase authorizes inside services with `MembersService`, and a new guard would diverge from the proven reports path and touch unrelated modules.

### 2. Single Drizzle transaction with SELECT ... FOR UPDATE for atomicity

Invoice creation runs in one `db.transaction()`:

1. Lock candidate time-entry rows with `SELECT ... FOR UPDATE` filtered by workspace, project, date range, `endedAt IS NOT NULL`, `isBillable = true`, and `invoice_id IS NULL`.
2. Compute `total_hours` from the locked rows' `duration_seconds`.
3. Insert the `invoices` row with snapshot `hourly_rate`, `currency`, `discount_percent`, `total_hours`, `total_amount`.
4. `UPDATE time_entries SET invoice_id = <new invoice id> WHERE id IN (locked ids)` — the `FOR UPDATE` lock plus the `invoice_id IS NULL` filter guarantees no concurrent request can claim the same rows.
5. Return the invoice detail.

Because all steps share one transaction and the candidate rows are locked, two concurrent requests targeting the same entry serialize: the second sees `invoice_id` already set (or waits on the lock then re-evaluates) and excludes the entry. A DB-level partial unique guarantee is not needed for the link itself (one row, one nullable column), but the `FOR UPDATE` lock is what prevents double billing.

**Alternative considered:** a partial unique index on `time_entries(invoice_id)` to enforce one-link uniqueness. The column is nullable and each row links to at most one invoice by definition (single FK column), so a unique index adds no protection the transaction lock doesn't already provide. The documented `time_entries_invoice_id_idx` partial index (where not null) is kept for query performance, not uniqueness.

### 3. Snapshot totals computed in the transaction, never recomputed

`total_hours = SUM(duration_seconds) / 3600` over the locked selected entries, stored as `DECIMAL(10,2)`. `total_amount = total_hours * hourly_rate * (1 - discount_percent / 100)`, stored as `DECIMAL(12,2)`. `hourly_rate` and `currency` are snapshotted from the request body, or from `workspace_settings.default_hourly_rate` / `workspace_settings.currency` when the body omits them. The `PATCH /invoices/:id` endpoint updates only editable fields (status, notes, and other fields the shared update contract permits) and never touches `total_hours`, `total_amount`, `hourly_rate`, `currency`, or the linked time-entry set. This satisfies the snapshot requirement and the issue's "later changes do not silently recalculate" criterion.

### 4. Deletion unlinks via FK ON DELETE SET NULL

The `time_entries.invoice_id` FK is defined with `onDelete: 'set null'`, matching the documented cascade behavior. `DELETE /invoices/:id` (admin-only) deletes the invoice row; Postgres sets `invoice_id = NULL` on the linked entries, making them eligible again. No application-level update of time entries is required for unlinking, keeping the delete path simple and consistent with `DATA-MODEL.md`.

### 5. Contracts, DTOs, and OpenAPI follow the established pipeline

Add `packages/shared/src/contracts/invoices.ts` with Zod schemas (status enum, create, list query, update, list/detail responses) and export it from `packages/shared/src/index.ts`. Extend the existing time-entry response contract with an optional `invoiceId: z.uuid().nullable()`. Wrap the request DTOs with `createZodDto` in the new `apps/api/src/invoices/dto` directory. Register `InvoicesModule` in `app.module.ts`. Regenerate `packages/shared/openapi.json` via the documented export path. The `nest build`-based workflow applies because `pnpm openapi:export` runs through tsx (per `apps/api/AGENTS.md` gotcha).

The list response schema uses a compact item shape (`invoiceListItemSchema`) that omits the `timeEntries` array, while the detail response schema includes it. This keeps list payloads small; `timeEntryCount` is always present in both shapes.

### 6. Module layout mirrors existing feature modules

```
apps/api/src/invoices/
  invoices.module.ts
  controllers/invoices.controller.ts
  dto/
    create-invoice-request.dto.ts
    update-invoice-request.dto.ts
    invoice-list-query.dto.ts
    invoice-response.dto.ts
    invoice-list-response.dto.ts
  schemas/invoices.schema.ts
  services/invoices.service.ts
  services/invoices.service.spec.ts
```

`invoices.schema.ts` is re-exported from `src/db/schema.ts`. `time-entries.schema.ts` gains the `invoiceId` column and the partial index, re-exported through the existing barrel.

### Planned files by area

- **API** — follow `apps/api/AGENTS.md`: `src/invoices/**`, `src/time-entries/schemas/time-entries.schema.ts` (add `invoiceId` + partial index), `src/db/schema.ts` (re-export invoice schema), `src/app.module.ts` (register module), new migration under `apps/api/drizzle`, `test/invoices.e2e-spec.ts`.
- **Shared** — `packages/shared/src/contracts/invoices.ts`, `packages/shared/src/index.ts`, extended time-entry response contract, regenerated `packages/shared/openapi.json`, and a `packages/shared/src/contracts/invoices.spec.ts`.
- **Docs** — expand `docs/API-ENDPOINTS.md` Invoices section with request/response contracts and eligibility rules; keep `docs/DATA-MODEL.md` consistent (it already documents the target schema).

## Risks / Trade-offs

- [Concurrent double billing] → mitigated by `SELECT ... FOR UPDATE` inside a single transaction; e2e test must cover the concurrent-creation scenario.
- [Snapshot totals drift from reality after edits] → accepted MVP limitation, documented in the spec and `DATA-MODEL.md`; the PATCH endpoint never recomputes.
- [PM scope inconsistency with reports] → mitigated by reusing the exact reports join condition; a shared helper could be extracted later if a third caller appears.
- [Empty invoice when no eligible entries exist] → the create contract decides whether to allow zero-entry invoices or reject; the spec leaves this to the contract. The shared create contract should require at least the rate and date range and allow zero totals, matching Clockify-style data-only invoices.
- [OpenAPI export tooling gotcha] → use the `nest build`-based regeneration path noted in `apps/api/AGENTS.md`, not `pnpm openapi:export` directly, to avoid the tsx decorator-metadata break.

## Migration Plan

1. Add the `invoices` Drizzle schema and `time_entries.invoice_id` column, generate a forward migration (`pnpm --filter @gitiempo/api db:generate`), then apply with `db:migrate`. The forward migration re-creates `invoices` and adds `time_entries.invoice_id` with the partial index `time_entries_invoice_id_idx` (where not null), the `invoices_workspace_id_idx` index, and the `invoices_workspace_status_idx` composite index (`workspace_id`, `status`), mirroring the objects dropped by `0021_drop_invoice_tables.sql`; it is safe to run on existing databases (idempotent object names).
2. Deploy the API and shared contract changes together; the new endpoints and contracts ship in one release.
3. Rollback: a down-migration drops the FK, partial index, column, and table (mirroring `0021`). Existing time-entry data is unaffected since `invoice_id` is nullable and starts null.

## Open Questions

None for this scope. The empty-invoice behavior is resolved by the shared create contract (allow zero totals, require rate and date range). Frontend invoice UI is a separate change.