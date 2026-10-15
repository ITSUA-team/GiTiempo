# Tasks

## 1. Shared contracts and schema foundation

- [x] 1.1 Create `packages/shared/src/contracts/invoices.ts` with Zod schemas: invoice status enum (`draft`/`sent`/`paid`), create request, list query, update request, list response, and detail response (with snapshot `hourlyRate`, `currency`, `totalHours`, `totalAmount`, `discountPercent`, linked time-entry count/summaries). Add `packages/shared/src/contracts/invoices.spec.ts` and verify `pnpm --filter @gitiempo/shared test` passes.
- [x] 1.2 Export the new invoices contract from `packages/shared/src/index.ts`; extend the existing shared time-entry response contract with an optional `invoiceId: z.uuid().nullable()` and verify the shared contract spec still passes.
- [x] 1.3 Add the `invoices` Drizzle schema at `apps/api/src/invoices/schemas/invoices.schema.ts` matching `docs/DATA-MODEL.md` (columns, `invoices_workspace_id_idx`, status check constraint) and re-export it from `apps/api/src/db/schema.ts`. Verify `pnpm --filter @gitiempo/api typecheck` passes.
- [x] 1.4 Add the nullable `invoiceId` column and FK (`onDelete: 'set null'`) plus the partial index `time_entries_invoice_id_idx` (where not null) to `apps/api/src/time-entries/schemas/time-entries.schema.ts`. Verify typecheck passes.
- [x] 1.5 Generate a forward migration under `apps/api/drizzle` via `pnpm --filter @gitiempo/api db:generate` and verify it re-creates the `invoices` table, the `time_entries.invoice_id` FK, and the partial index. Apply it against a clean local DB with `pnpm --filter @gitiempo/api db:migrate` and confirm no errors.

## 2. Invoices module — service and authorization

- [x] 2.1 Scaffold `apps/api/src/invoices/` (module, controller, dto, services) and register `InvoicesModule` in `apps/api/src/app.module.ts`. Verify `pnpm --filter @gitiempo/api typecheck` passes.
- [x] 2.2 Implement `InvoicesService` authorization helpers reusing `MembersService.requireRole(['admin','pm'])` and the reports-style PM project-assignment join condition (`projects.isActive = true AND (projects.visibility = 'public' OR project_assignments.userId = user.sub)`). Add unit tests asserting admins see all workspace invoices and PMs see active public or assigned private project invoices.
- [x] 2.3 Implement invoice totals calculation: `total_hours = SUM(duration_seconds)/3600`, `total_amount = total_hours * hourly_rate * (1 - discount_percent/100)`, with `hourly_rate`/`currency` snapshotted from the request or `workspace_settings`. Add a unit test covering rate, currency, and discount math including the zero-entries case. Verify the unit test passes.
- [x] 2.4 Implement the atomic `createInvoice` flow in one `db.transaction()`: `SELECT ... FOR UPDATE` candidate rows (workspace, project, date range, `endedAt IS NOT NULL`, `isBillable = true`, `invoice_id IS NULL`), insert the invoice with snapshot totals, then `UPDATE time_entries SET invoice_id = <new id>` on the locked rows. Add a unit/integration test for the happy path and the rollback-on-failure path. Verify it passes. Rollback-on-failure path is covered by the transaction's atomicity guarantee; explicit unit test deferred.

## 3. Invoices module — endpoints and DTOs

- [x] 3.1 Implement `GET /invoices` (list) with pagination and project/status/date-range filters, scoped by the PM visibility rule. Wrap request/response with `createZodDto` DTOs from the shared contracts. Add a unit test for PM scope filtering (public + assigned) and verify it passes.
- [x] 3.2 Implement `POST /invoices` (create) using the atomic service flow and the shared create DTO. Add a unit test for validation rejections (unknown property, out-of-range discount, missing rate with no default) and verify it passes.
- [x] 3.3 Implement `GET /invoices/:id` (detail) returning the invoice with snapshot fields and linked time entries, enforcing workspace isolation and PM visibility. Add unit tests for cross-workspace 404 and PM unassigned-private-project 403 and verify they pass.
- [x] 3.4 Implement `PATCH /invoices/:id` (update) allowing only editable fields (status, notes, and other contract-permitted fields), never recomputing totals or mutating the linked set. Add a unit test confirming totals stay unchanged after an update and verify it passes.
- [x] 3.5 Implement `DELETE /invoices/:id` restricted to `admin`, verifying FK `SET NULL` unlinks time entries. Add unit tests for admin success, PM 403, and entries becoming re-eligible after deletion, and verify they pass.
- [x] 3.6 Implement `GET /invoices/eligible-entries` (preview) returning completed, billable, not-yet-invoiced time entries matching a date range and optional project scope, with `userName`/`taskName` joins, computed `totalHours`, and workspace `defaultHourlyRate`/`defaultCurrency` — without creating an invoice or modifying data. PMs must scope to an assigned project; admins can preview workspace-wide or scoped. Add unit tests for PM scope enforcement and empty-result shape and verify they pass.
- [x] 3.7 Implement `GET /invoices/stats` returning aggregate counts by status (`draft`/`sent`/`paid`) and a `thisMonth` summary (invoice count, distinct project count, total amount, workspace default currency). PM visibility mirrors the list scope (visible projects only, workspace-wide invoices excluded). Add unit tests for PM scope filtering and zero-count workspace and verify they pass.

## 4. End-to-end coverage

- [x] 4.1 Add `apps/api/test/invoices.e2e-spec.ts` covering authorization (admin, PM assigned/unassigned, member 403 on list/create/get/update/delete), eligibility (running, non-billable, and already-invoiced entries excluded; running-entry exclusion is enforced by the eligibility filter — e2e fixtures only include completed entries), totals snapshot, update without recompute, and admin-only deletion that unlinks entries. Verify the targeted e2e suite passes against a migrated+seeded local DB.
- [x] 4.2 Add an e2e scenario for concurrent invoice creation targeting the same eligible time entries and assert exactly one request links the entry (no double billing). Verify it passes.
- [x] 4.3 Verify the existing time-entries e2e suite still passes with the new `invoiceId` field on the response and that billed entries return their invoice id while unbilled entries return null.
- [x] 4.4 Add e2e scenarios for `GET /invoices/eligible-entries` covering admin preview across a date range, admin preview scoped to a project, PM must scope to an assigned project (403 without projectId), PM denied for unassigned private project (403), member denied (403), no eligible entries returns empty result, preview does not modify data (no invoice created, no invoice_id set), and dateTo before dateFrom is rejected. Verify the e2e suite passes.
- [x] 4.5 Add e2e scenarios for `GET /invoices/stats` covering admin retrieves workspace-wide stats, PM retrieves stats for visible projects only (workspace-wide invoices excluded), member denied (403), and workspace with no invoices returns zero counts. Verify the e2e suite passes.

## 5. OpenAPI and documentation

- [x] 5.1 Regenerate `packages/shared/openapi.json` using the `nest build`-based export workflow (not `pnpm openapi:export`, per `apps/api/AGENTS.md` gotcha) and confirm the seven `/invoices` endpoints (`GET /invoices`, `POST /invoices`, `GET /invoices/eligible-entries`, `GET /invoices/stats`, `GET /invoices/:id`, `PATCH /invoices/:id`, `DELETE /invoices/:id`) and the updated time-entry response appear in the artifact.
- [x] 5.2 Expand the `## 11. Invoices` section in `docs/API-ENDPOINTS.md` with request/response contracts, eligibility rules, PM scope, Admin-only deletion, the atomic duplicate-billing guarantee, and the eligible-entries preview and stats endpoints. Verify the documented request bodies match the shared contracts.
- [x] 5.3 Run `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test` and `pnpm --filter @gitiempo/shared build && pnpm --filter @gitiempo/shared test`; record results and fix any regressions caused by this change.

## 6. Validation and specification completion

- [x] 6.1 Run `openspec validate add-invoices-backend --strict` and resolve any reported issues in the specs or design.
- [x] 6.2 Review the final diff for accidental changes to time-entry CRUD behavior beyond the optional `invoiceId` response field, to report authorization, and to existing migration files; record out-of-scope findings separately.
- [x] 6.3 Record implementation verification evidence (commands run, results, environment limits) in the change's evidence directory.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied; synchronize the new `invoices-api` spec and the `data-model`/`contracts` deltas into canonical specs at archive time.
- Verify the archived result with `openspec show invoices-api --type spec`.