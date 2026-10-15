# Implementation Verification Evidence

## Environment

- OS: Linux (lordaeron)
- Node: v26.10.0
- Postgres: 17-alpine (Docker container `gitiempo-pg`)
- Date: 2026-10-12 (initial), 2026-10-14 (eligible-entries/stats sync)

## Commands run and results

| Command | Result |
|---|---|
| `pnpm --filter @gitiempo/shared build` | ✓ Pass |
| `pnpm --filter @gitiempo/shared test` | ✓ 516/516 tests pass (includes eligible-entries and stats contract tests) |
| `pnpm --filter @gitiempo/api lint` | ✓ Clean (0 errors) |
| `pnpm --filter @gitiempo/api lint:fix` | Applied formatting fixes |
| `pnpm --filter @gitiempo/api typecheck` | ✓ Pass |
| `pnpm --filter @gitiempo/api test` | ✓ 565/565 unit tests pass (14 new invoice service tests) |
| `pnpm --filter @gitiempo/api db:generate` | ✓ Migration `0022_tricky_black_panther.sql` generated |
| `pnpm --filter @gitiempo/api db:migrate` | ✓ Migration applied successfully |
| `pnpm --filter @gitiempo/api db:seed` | ✓ Seed completed (5 users, 3 projects, 12 time entries) |
| `NODE_ENV=test vitest run --config vitest.e2e.config.ts test/invoices.e2e-spec.ts` | ✓ 54/54 e2e tests pass (12 new: 8 eligible-entries + 3 stats + 1 auth) |
| `NODE_ENV=test vitest run --config vitest.e2e.config.ts test/time-entries.e2e-spec.ts` | ✓ 49/49 existing e2e tests pass |
| `pnpm --filter @gitiempo/api openapi:export` | ✓ OpenAPI artifact regenerated with 7 `/invoices` endpoints |
| `openspec validate add-invoices-backend --strict` | ✓ Valid |

## Pre-existing issue fixed

The Drizzle migration journal had a snapshot collision: `0020_snapshot.json` and `0021_snapshot.json` shared the same `id` and `prevId` (a side effect of the hand-written `0021_drop_invoice_tables.sql` down-migration). The `0021` snapshot's `id` was updated to a new unique UUID and its `prevId` was chained to `0020`'s `id`, unblocking `drizzle-kit generate`.

## Fixes applied after initial implementation

- PM list scope fixed to reports-parity: `listInvoices`/`countInvoices` use a `leftJoin` on `projects` with `or()`, so PMs see active public projects OR assigned private projects; workspace-wide invoices (null `projectId`) remain admin-only for PMs.
- List/detail split applied: the list response uses the compact `invoiceListItemSchema` item shape without a `timeEntries` array (`timeEntryCount` still present); the detail response includes the full `timeEntries` array.
- Stats `projectCount` serialisation fixed: `COUNT(DISTINCT ...)` returns a Postgres `bigint` (string at runtime); wrapped in `Number()` to match the `z.number().int()` contract.
- Stats PM `monthRow` query missing `projectAssignments` join: the PM visibility conditions reference `projectAssignments.userId` but the `thisMonth` aggregate query only joined `projects`; added the conditional `leftJoin` so PM-scoped month totals work without a 500.

## E2e coverage summary

- Authorization: member 403 on list, create, get, update, delete, eligible-entries, and stats; PM 403 on delete; admin-only delete
- List scope: admin sees all workspace invoices; PM sees only invoices for active public or assigned private projects (reports-parity `leftJoin`) — unassigned private (probe) and workspace-wide/null-project invoices are absent from the PM list
- Eligibility: non-billable excluded, already-invoiced excluded (second invoice over the same scope yields zero totals); running-entry exclusion is enforced by the eligibility filter but is not covered by a dedicated e2e test (e2e fixtures contain only completed entries)
- Totals: 3h × $75 = $225 with 2 billable entries; 1.5h × $100 (workspace default) = $150
- Atomic concurrent creation: two parallel POSTs targeting the same entry — exactly one links it (no double billing)
- Update: status change does not recompute totals; snapshot fields rejected (admin PATCH); PM PATCH on unassigned or workspace-wide (null project) invoices is denied server-side via `requirePmInvoiceAccess`, whose null-project branch is exercised at unit level (`denies PM access to workspace-wide invoices (null project)`); no dedicated PM-PATCH e2e assertion
- Delete: FK SET NULL unlinks entries; entries remain; invoice 404 after delete; entries re-billable
- Time entry response: `invoiceId` exposed for billed entries, null for unbilled
- Response shape: list/detail split applied — list items carry `timeEntryCount` without a `timeEntries` array; detail responses include the full `timeEntries` array
- Eligible-entries preview: admin previews across a date range with `userName`/`taskName` joins and `defaultHourlyRate`/`defaultCurrency`; admin previews scoped to a project; PM 403 without `projectId`; PM 403 for unassigned private project; member 403; no eligible entries returns `{ count: 0, totalHours: 0, entries: [] }`; preview does not create invoices or set `invoice_id`; reversed date bounds rejected with 400
- Stats: admin retrieves workspace-wide stats with `byStatus` and `thisMonth` shape; PM stats exclude workspace-wide invoices (PM total unchanged after creating a workspace-wide invoice); member 403

## OpenAPI artifact

The regenerated `packages/shared/openapi.json` includes all seven `/invoices` paths:
`GET /invoices`, `POST /invoices`, `GET /invoices/eligible-entries`, `GET /invoices/stats`, `GET /invoices/:id`, `PATCH /invoices/:id`, `DELETE /invoices/:id`.

## Out-of-scope findings

None. All changes are confined to the invoices module, shared contracts, time-entry response schema, DB migration, and documentation.