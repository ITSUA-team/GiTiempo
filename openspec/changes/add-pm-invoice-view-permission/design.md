# Design

## Context

The invoices page (`InvoicesView.vue` in `admin-web`) is role-gated for Admin + PM. When a PM loads it, the page calls `useWorkspaceRoundingSettings`, which fetches `GET /workspace/settings` — an admin-only endpoint that returns 403 for PMs. This triggers an error toast even though the PM can otherwise list, create, and view invoices for their assigned projects.

The `InvoicesService` already reads `workspaceSettings` server-side (in `getInvoiceStats`, `previewEligibleEntries`, `createInvoice`) without going through the admin-only HTTP endpoint. The frontend only needs the currency, default hourly rate, and rounding step for the create dialog prefill — a small subset of workspace settings.

Separately, admins need explicit per-member control over whether a PM can access invoices at all. Today every PM can; the product requirement is to make this opt-in per PM.

See `proposal.md` for motivation. See delta specs for behavior requirements.

## Goals / Non-Goals

**Goals:**

- Eliminate the 403 toast for PMs on `/invoices` by providing a PM-accessible defaults endpoint.
- Add a per-membership `canViewInvoices` permission, defaulting to `false`, managed by admins on the Members page.
- Enforce the permission on both frontend (route guard) and backend (invoice endpoints).
- Keep the implementation consistent with existing patterns: Drizzle migrations, Zod shared contracts, NestJS guards/services, TanStack Query composables, PrimeVue form components.

**Non-Goals:**

- No changes to workspace settings endpoint authorization (stays admin-only).
- No changes to the `member` role — only PMs are affected by `canViewInvoices`.
- No PDF generation, email delivery, or payment processing.
- No `user-web` invoice surfaces.
- No per-project invoice permissions — the permission is per workspace membership.

## Decisions

### 1. PM-accessible defaults endpoint (variant b)

Add `GET /invoices/defaults` returning `{ currency, defaultHourlyRate, timeRoundingStepMinutes }`. Both Admin and PM can call it. The `InvoicesService` reads `workspaceSettings` server-side (same as it already does for stats/preview/create).

**Rationale:** The create dialog needs currency, hourly rate, and rounding step. Currently these come from the admin-only `GET /workspace/settings`. A dedicated, scoped endpoint avoids exposing full workspace settings to PMs while providing exactly the fields the invoice UI needs. The service already has the query logic.

**Alternative considered (variant a):** Skip the `GET /workspace/settings` call when the user is a PM and use fallback values. Rejected because the dialog would lose workspace-configured currency and rate prefill, degrading UX.

### 2. Permission storage: column on `workspace_members`

Add `can_view_invoices boolean default false not null` to the `workspace_members` table.

**Rationale:** The permission is per-membership (one user can be a PM in workspace A with invoices enabled and a PM in workspace B without). A column on the existing membership table is the simplest and most direct representation. No separate permissions table is warranted for a single boolean.

### 3. Default value: `false` (denied)

New PMs start without invoice access. Admins explicitly enable it.

**Rationale:** The product requirement is explicit admin control. Defaulting to denied is safer — no PM sees invoices unless an admin has granted it. Existing PMs at migration time will also default to `false`; admins can enable them as needed. The dev seed sets the seed PM (alice) to `true` for local testing.

### 4. Expose `canViewInvoices` in `UserResponse` (`GET /users/me`)

Add `canViewInvoices: boolean` to `userResponseSchema` and the `UsersService.findById`/`toResponse` mapping.

**Rationale:** The frontend auth store already fetches `GET /users/me` after login and stores the profile. Adding `canViewInvoices` there means the route guard and page logic can check `authStore.profile?.canViewInvoices` with zero extra round-trips. The `UsersService.findById` already joins `workspace_members` for the `role` field — adding `canViewInvoices` to the same join is trivial.

**Alternative considered:** Add to JWT claims. Rejected because it would require token re-issuance when the permission changes, and the permission is per-workspace-membership, not a global identity claim.

### 5. API contract: separate `PATCH /members/:id/permissions` endpoint

Add a new endpoint rather than extending `PATCH /members/:id/role`.

**Rationale:** Role and permissions are distinct concerns. The existing role endpoint has strict validation (`updateWorkspaceMemberRoleSchema` with only `{ role }`). Mixing permissions into it would break existing callers and tests. A separate endpoint keeps each mutation focused and independently testable.

### 6. Backend enforcement: check `canViewInvoices` after role check

In each `InvoicesService` method that allows PM, after `requireRole(['admin', 'pm'])`, if the membership role is `pm` and `canViewInvoices` is `false`, throw `ForbiddenException`.

**Rationale:** The `requireRole` method already returns an `ActiveMembership`. Extending `ActiveMembership` to include `canViewInvoices` lets each invoice method check it with one line after the existing role check. No new DB query is needed — the membership is already loaded.

### 7. Frontend route guard: `beforeEach` in admin-web router

After `createProtectedRouter` returns, chain a `beforeEach` guard that checks: if the target route has `meta.requiresInvoiceViewPermission` and the user is a PM with `canViewInvoices = false`, redirect to the forbidden route.

**Rationale:** `createProtectedRouter` in `web-shared` handles role-based guarding. Adding a secondary guard in `admin-web` avoids modifying the shared router abstraction for a single app's permission check. The `meta.requiresInvoiceViewPermission` flag is set on the `/invoices` and `/invoices/:id` routes.

### 8. Checkbox in existing `MemberEditForm.vue`

Add a PrimeVue `Checkbox` (or `ToggleSwitch`) to the existing "Member settings" panel, visible only when `member.role === 'pm'`. Wire it to emit a permission update alongside or after the project-assignment save.

**Rationale:** The issue specifies adding the checkbox in the existing "Member settings" section. The `MemberEditForm.vue` already has this title and structure. The checkbox is a separate concern from project assignments, so it emits its own event (`update:canViewInvoices`) that `MembersView.vue` handles by calling the new permissions endpoint.

## Design Parity Deltas

No `.pen` frame is approved for this change — it is a functional permission toggle, not a new visual surface. The checkbox follows existing PrimeVue form patterns in the member edit form.