# Tasks

## 1. Shared Contracts and DB Schema

- [x] 1.1 Add `canViewInvoices: z.boolean()` to `workspaceMemberResponseSchema` in `packages/shared/src/contracts/workspace-members.ts`. Add `updateWorkspaceMemberPermissionsSchema` (`{ canViewInvoices: z.boolean() }`, strict) and its type. Verify: `packages/shared` tests pass.
- [x] 1.2 Add `canViewInvoices: z.boolean()` to `userResponseSchema` in `packages/shared/src/contracts/users.ts`. Export the updated type. Verify: `packages/shared` tests pass.
- [x] 1.3 Add `invoiceDefaultsResponseSchema` (`{ currency, defaultHourlyRate, timeRoundingStepMinutes }`) to `packages/shared/src/contracts/invoices.ts` and export its type. Verify: schema parses a valid payload and rejects unknown keys.
- [x] 1.4 Add `canViewInvoices` boolean column (default `false`, not null) to `workspace_members` in `apps/api/src/members/schemas/workspace-members.schema.ts`. Generate a Drizzle migration. Verify: migration SQL adds the column with the correct default.

## 2. Backend — Members

- [x] 2.1 Extend `ActiveMembership` interface in `MembersService` to include `canViewInvoices: boolean`. Update `resolveActiveMembership`, `resolveActiveMembershipForUser`, `resolveActiveMembershipById` to select and return `canViewInvoices`. Verify: existing `requireRole` callers still compile.
- [x] 2.2 Update `MembersService.listMembers` to include `canViewInvoices` in the response. Verify: `members.service.spec.ts` covers the new field.
- [x] 2.3 Add `updateMemberPermissions(workspaceId, memberId, input)` to `MembersService` — updates `canViewInvoices` on the membership row, returns the updated `WorkspaceMemberResponse`. Verify: `members.service.spec.ts` covers success and not-found.
- [x] 2.4 Add `PATCH /members/:id/permissions` endpoint to `MembersController` (admin-only via `WorkspaceAdminGuard`). Add `UpdateWorkspaceMemberPermissionsDto`. Verify: `members.controller.spec.ts` covers the delegation.

## 3. Backend — Users

- [x] 3.1 Update `UsersService.findById` to select `canViewInvoices` from the `workspaceMembers` join. Update `toResponse` to accept and include `canViewInvoices`. Update `findRole` to also return `canViewInvoices` (or add a parallel method). Verify: `users.service.spec.ts` covers the new field in the response.

## 4. Backend — Invoices

- [x] 4.1 Add `getInvoiceDefaults(user: AuthUser)` to `InvoicesService` — requires admin or PM role, reads `workspaceSettings` for `currency`, `defaultHourlyRate`, `timeRoundingStepMinutes`, returns `InvoiceDefaultsResponse`. Verify: `invoices.service.spec.ts` covers admin, PM, and member-denied.
- [x] 4.2 Add `GET /invoices/defaults` endpoint to `InvoicesController` with `@ZodSerializerDto(InvoiceDefaultsResponseDto)`. Add `InvoiceDefaultsResponseDto`. Verify: controller delegates to service.
- [x] 4.3 Enforce `canViewInvoices` in all `InvoicesService` methods that allow PM: `listInvoices`, `getInvoiceStats`, `previewEligibleEntries`, `createInvoice`, `getInvoice`, `updateInvoice`. After `requireRole(['admin', 'pm'])`, if `membership.role === 'pm' && !membership.canViewInvoices`, throw `ForbiddenException`. Verify: `invoices.service.spec.ts` covers PM-without-permission denied on each method.
- [x] 4.4 Update `apps/api/src/db/seed.ts` to set `can_view_invoices = true` for the seed PM user (alice). Verify: seed upsert includes the field.

## 5. Frontend — Invoice Defaults

- [x] 5.1 Add `getInvoiceDefaults()` method to `admin-invoices-client.ts` calling `GET /invoices/defaults` with `invoiceDefaultsResponseSchema`. Verify: `admin-invoices-client.spec.ts` covers path, auth headers, response parsing.
- [x] 5.2 Add `adminInvoicesKeys.defaults()` to `lib/query-keys.ts`. Add `useInvoiceDefaults` composable (TanStack query) in `composables/invoices/useInvoiceDefaults.ts`. Verify: composable spec covers loading, success, error.
- [x] 5.3 Replace `useWorkspaceRoundingSettings` in `InvoicesView.vue` with `useInvoiceDefaults`. Pass `workspaceCurrency`, `workspaceHourlyRate`, and `workspaceRoundingStepMinutes` from the new composable. Remove the settings error toast path. Verify: `InvoicesView.spec.ts` covers PM navigation without 403 toast.
- [x] 5.4 Update `InvoiceDetailView.vue` if it uses `useWorkspaceRoundingSettings` — replace with `useInvoiceDefaults`. Verify: detail view spec covers PM access.

## 6. Frontend — Route Guard

- [x] 6.1 Add `meta.requiresInvoiceViewPermission: true` to the `/invoices` and `/invoices/:id` routes in `apps/admin-web/src/router/index.ts`. Add a `beforeEach` guard after `createProtectedRouter` that redirects PMs with `canViewInvoices = false` to the forbidden route. Verify: `router/index.spec.ts` covers PM-without-permission redirected, PM-with-permission allowed, admin always allowed.
- [x] 6.2 Hide the invoices nav item from the sidebar and mobile bottom navigation for PMs with `canViewInvoices = false` by filtering `ADMIN_BASE_NAV_ITEMS` in `AdminAppShell.vue` using the `requiresInvoiceViewPermission` route meta. Verify: `AdminAppShell.spec.ts` covers PM-without-permission sees no invoices nav, PM-with-permission sees it.
- [x] 6.3 Detect `canViewInvoices` changes in `auth.ts` `authorizationChanged` so the query cache is cleared when the permission is revoked. On window focus (`App.vue` `refreshAuthorizationOnFocus`), redirect a PM whose `canViewInvoices` was revoked to the forbidden page if the current route requires invoice view permission. Verify: `App.spec.ts` covers PM redirected on focus after revocation.
- [x] 6.4 On workspace switch (`AdminAppShell.vue` `handleSwitchWorkspace`), redirect a PM from `/invoices` to the dashboard if the target workspace has `canViewInvoices = false`. Verify: `AdminAppShell.spec.ts` covers workspace switch redirect from invoices.

## 7. Frontend — Members Permission Toggle

- [x] 7.1 Add `updateMemberPermissions(memberId, input)` to `admin-members-client.ts` calling `PATCH /members/:id/permissions`. Verify: `admin-members-client.spec.ts` covers path, payload, response parsing.
- [x] 7.2 Add "Allow viewing invoices" checkbox (PrimeVue `Checkbox` or `ToggleSwitch`) to `MemberEditForm.vue`, visible only when `member.role === 'pm'`. Emit `update:canViewInvoices` event with the boolean value. Verify: `MemberEditForm.spec.ts` (or `MemberInlineForms.spec.ts`) covers checkbox visibility for PM vs admin/member, and emit on toggle.
- [x] 7.3 Wire `MembersView.vue` to handle the `update:canViewInvoices` event by calling `adminMembersClient.updateMemberPermissions`, showing a success/error toast, and refreshing the member list. Verify: `MembersView.spec.ts` covers permission update success and error.

## 8. OpenSpec and Documentation

- [x] 8.1 Write delta specs for `invoices-api`, `workspace-membership`, `users`, `admin-members-page`, `admin-invoices-page`, `admin-routing`. Verify: `openspec validate --strict` passes for the `add-pm-invoice-view-permission` change.
- [x] 8.2 Update any relevant `docs/` sections if the members page or invoices page docs mention role-based access. Verify: docs are consistent with the new permission.

## 9. Verification

- [x] 9.1 Run `pnpm typecheck` — no new errors.
- [x] 9.2 Run `pnpm lint` — no new errors.
- [x] 9.3 Run `pnpm test` — all tests pass.
- [x] 9.4 Run `pnpm --filter @gitiempo/api test` — all API tests pass including new permission enforcement tests.
- [x] 9.5 Run `pnpm --filter admin-web test` — all admin-web tests pass including new defaults endpoint, route guard, nav hiding, focus refresh, and member checkbox tests.
- [x] 9.6 Run `openspec validate --strict` for the `add-pm-invoice-view-permission` change — passes with no warnings.
- [x] 9.7 Manual test: log in as admin, enable `canViewInvoices` for alice (PM), log in as alice, navigate to `/invoices` — no 403 toast, page loads, create dialog pre-fills currency/rate from `GET /invoices/defaults`.
- [x] 9.8 Manual test: as admin, revoke `canViewInvoices` for alice while alice is on `/invoices`; alice switches back to the admin-web tab — she is redirected to the forbidden page.

## 10. OpenAPI Nullable Type Fix

- [x] 10.1 Create `apps/api/src/common/zod-dto.ts` wrapper around `createZodDto` that patches `_OPENAPI_METADATA_FACTORY` to convert `type: [T, "null"]` to `anyOf: [{ type: T }, { type: "null" }]` so NestJS Swagger does not misinterpret nullable strings as arrays. Update all 77 DTO files to import from the wrapper.
- [x] 10.2 Add `findMisconvertedNullables` validation to `apps/api/src/openapi/export.ts` that checks the generated OpenAPI document for misconverted nullable fields (`type: "array"` + `items: { type: "string" }` with no constraints) and fails the export if any are found.
- [x] 10.3 Regenerate `packages/shared/openapi.json` — all 11 previously broken nullable fields now use `anyOf` or `nullable: true`.