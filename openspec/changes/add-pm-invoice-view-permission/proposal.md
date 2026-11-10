# Proposal

## Why

PM users currently receive a 403 Forbidden error toast when navigating to `/invoices` because the frontend unconditionally calls `GET /workspace/settings` (admin-only) to load currency, hourly rate, and rounding-step defaults for the invoice create dialog. Additionally, admins need a per-member permission control to explicitly grant or revoke a PM's ability to view invoices for their assigned projects. Issue #499 tracks this.

## What Changes

- Add a `can_view_invoices` boolean column to `workspace_members` (default `false`, not null). This is a per-membership permission: admins toggle it on the Members page for individual PM users.
- Expose `canViewInvoices` in the `UserResponse` contract (`GET /users/me`) so the frontend route guard and page logic can check it without an extra round-trip.
- Expose `canViewInvoices` in the `WorkspaceMemberResponse` contract so the Members page can render and edit the current state.
- Add `PATCH /members/:id/permissions` (admin-only) to update `canViewInvoices` for a member.
- Add `GET /invoices/defaults` (admin + PM) returning `{ currency, defaultHourlyRate, timeRoundingStepMinutes }` — a PM-accessible endpoint that replaces the admin-only `GET /workspace/settings` call on the invoices page.
- Enforce `canViewInvoices` on all invoice endpoints: PMs with `canViewInvoices = false` are rejected with 403 on list, stats, eligible-entries preview, create, get, and update. Delete remains admin-only.
- Frontend: replace `useWorkspaceRoundingSettings` in `InvoicesView.vue` with the new `GET /invoices/defaults` endpoint. No more 403 toasts for authorized PMs.
- Frontend: add a route guard that redirects PMs with `canViewInvoices = false` away from `/invoices` and `/invoices/:id` to the forbidden page.
- Frontend: add an "Allow viewing invoices" checkbox to `MemberEditForm.vue` (visible only when the member's role is `pm`), wired to `PATCH /members/:id/permissions`.
- Update the dev seed so the seed PM user (alice) has `can_view_invoices = true` for local testing.

## Capabilities

### New Capabilities

- `pm-invoice-view-permission`: Per-member boolean permission controlling PM access to invoice endpoints and pages, managed by admins on the Members page.

### Modified Capabilities

- `invoices-api`: Add `GET /invoices/defaults` endpoint and enforce `canViewInvoices` on all invoice read/write endpoints for PM users.
- `workspace-membership`: Add `can_view_invoices` column, expose it in member and user responses, add `PATCH /members/:id/permissions`.
- `users`: Include `canViewInvoices` in the current-user response.
- `admin-members-page`: Add "Allow viewing invoices" checkbox to the member edit form for PM members.
- `admin-invoices-page`: Replace workspace-settings fetch with invoice-defaults fetch; no 403 on PM navigation.
- `admin-routing`: Guard `/invoices` and `/invoices/:id` against PMs without `canViewInvoices`.

## Impact

- **packages/shared/src/contracts/**: `workspace-members.ts` (add `canViewInvoices` to response + new `updateWorkspaceMemberPermissionsSchema`), `users.ts` (add `canViewInvoices` to `userResponseSchema`), `invoices.ts` (add `invoiceDefaultsResponseSchema`).
- **apps/api**: DB schema + migration (`workspace_members.can_view_invoices`), `MembersService` (list/resolve/permissions update), `MembersController` (new permissions endpoint), `UsersService` (`canViewInvoices` in `findById`/`toResponse`), `InvoicesService` (`getInvoiceDefaults` + `canViewInvoices` enforcement), `InvoicesController` (`GET /invoices/defaults`), seed update.
- **apps/admin-web**: `admin-invoices-client.ts` (defaults method), `admin-members-client.ts` (permissions method), `InvoicesView.vue` (use defaults endpoint), `InvoiceDetailView.vue` (guard), `MemberEditForm.vue` (checkbox), `MembersView.vue` (permission update handler), router (invoice permission guard), composables, query keys, tests.
- **packages/web-config / packages/web-shared**: No changes expected.
- **GitHub issue**: #499.