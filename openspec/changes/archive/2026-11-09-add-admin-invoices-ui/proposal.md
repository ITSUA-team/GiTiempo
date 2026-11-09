# Proposal

## Why

The invoice backend API, shared Zod contracts, and time-entry eligibility logic are complete (archived change `2026-10-15-add-invoices-backend`, issue #439). The `admin-web` invoices route is wired and role-gated (Admin+PM), but the view is a hidden placeholder (`InvoicesView.vue` renders an empty deferred marker). Admins and PMs cannot list, search, create, view, edit, or manage invoices through the UI. Issue #440 tracks this frontend follow-up.

## What Changes

- Replace the placeholder `InvoicesView.vue` with a full invoices list page: searchable/filterable table (Title, Project, Period, Hours, Amount, Status badge), stats cards from `GET /invoices/stats`, pagination, and a header `Create invoice` action.
- Add an invoice create dialog with live eligible-entries preview (`GET /invoices/eligible-entries`), workspace-default rate/currency pre-fill, expandable entries table, empty-preview warning, and `Cancel`/`Create invoice` actions.
- Add an invoice detail page at `/invoices/:id` with breadcrumb, status-dependent header actions (`Mark as sent`, `Mark as paid`, `Delete` with confirmation), read-only summary card, editable title/notes card, and linked time-entries card.
- Create `services/admin-invoices-client.ts` with typed methods for all 7 invoice endpoints, backed by the shared `AuthenticatedApiClient` and `@gitiempo/shared` Zod schemas.
- Add invoices data/action composables and query-key entries following established admin-web patterns.
- Enable the invoices nav item (`SHOW_INVOICES_NAV = true`) in `admin-shell.ts`.
- Add the `/invoices/:id` detail route to the admin-web router (lazy, Admin+PM roles).
- Implement loading skeleton, empty, retryable error, validation, and mutation feedback states.
- Add focused tests for page behavior, role-aware interactions, API failures, invoice creation/editing, and status transitions.
- Handle backend conflict errors (409: `invoice_update_conflict`, `invoice_not_deletable`, `invoice_invalid_status_transition`) and domain errors (422: `invoice_rate_required`, `invoice_currency_required`, `invoice_total_overflow`) with user-visible feedback and state refresh.

## Capabilities

### New Capabilities

- `admin-invoices-page`: Admin SPA invoice management surface — list, search, filter, stats, create dialog, detail/edit page, status actions, and role-aware behavior for Admin and PM users.

### Modified Capabilities

- `admin-routing`: Add the `/invoices/:id` detail route to the admin route inventory with Admin+PM role access and lazy loading.

## Impact

- **admin-web**: New `InvoicesView.vue` (list), new `InvoiceDetailView.vue` (detail), new `InvoicesTable.vue`, new `InvoiceCreateDialog.vue`, new `admin-invoices-client.ts`, new invoices composables, new query-key entries, router update (detail route), `admin-shell.ts` nav flag flip, new `ManagementPageSkeleton` invoices variant, currency formatting helper.
- **shared / contracts**: No changes — all Zod schemas already exist in `packages/shared/src/contracts/invoices.ts`.
- **API**: No changes — all 7 endpoints are implemented and tested.
- **packages/web-config / packages/web-shared**: No changes expected unless a reusable leaf is identified during implementation.
- **GitHub issue**: #440.