## 1. Backend Resend API

- [x] 1.1 Add `POST /invites/:id/resend` to the invites controller with admin guard, bearer auth OpenAPI metadata, no request body, and existing invite response serialization.
- [x] 1.2 Factor shared invite delivery preparation in `InvitesService` so create and resend both provision/reuse Firebase identity, generate password setup/reset link content, and call the invite delivery service.
- [x] 1.3 Implement resend lookup for the current workspace that returns `404 Pending invite not found` for missing, cross-workspace, accepted, canceled, or non-pending invites.
- [x] 1.4 Implement expired-pending resend rejection with `410 Invite has expired` without changing invite token, role, workspace, expiration, status, or membership state.
- [x] 1.5 Add focused invite service/controller tests for successful resend, Firebase/link generation reuse, delivery failure, 404 targets, 410 expired pending invites, and no membership creation.

## 2. Contracts And API Coverage

- [x] 2.1 Update shared OpenAPI output so `packages/shared/openapi.json` includes `POST /invites/{id}/resend` with bearer auth, no request body, existing invite response, 403, 404, 410, and delivery/Firebase failure 503 behavior.
- [x] 2.2 Add or update admin members client tests to cover the resend path, method, headers, no request body, response parsing, and backend error propagation.
- [x] 2.3 Extend API e2e RBAC coverage for member-token and unauthenticated access to `POST /invites/:id/resend`.
- [x] 2.4 Extend invite negative-path e2e coverage for resend non-existent, accepted, cross-workspace, expired-pending, and no-membership-created cases.

## 3. Admin Members UI

- [x] 3.1 Build a Pending Invitations card below the members table using the approved `GITiempo.pen` Admin Members screen and `docs/ui/pages-admin.md` as the parity checklist.
- [x] 3.2 Render desktop/tablet Email, Role, Expires, and Actions columns plus mobile stacked cards with the same fields.
- [x] 3.3 Add `Resend invite` icon-only action with tooltip/accessibility label, success/error toast feedback, backend message handling, and pending invite refresh.
- [x] 3.4 Add `Cancel invite` icon-only action with shared destructive confirmation, success/error toast feedback, backend message handling, and pending invite refresh.
- [x] 3.5 Add distinct pending-invitations empty and retryable request-error states; failed resend or cancel must keep the row visible.
- [x] 3.6 Add focused admin-web tests for pending invitations render, mobile/desktop action labels, resend success/failure, cancel confirmation flow, empty state, and error state.

## 4. Verification

- [x] 4.1 Run API verification: `pnpm --filter @gitiempo/api lint`, `pnpm --filter @gitiempo/api typecheck`, and `pnpm --filter @gitiempo/api test`.
- [x] 4.2 Run API e2e coverage for the invite resend and RBAC paths after database migrations/seeds are ready for e2e.
- [x] 4.3 Run admin-web verification: `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test`.
- [x] 4.4 Verify OpenAPI generation using the repo-approved build-based workflow if direct export hits the known decorator metadata issue.
- [x] 4.5 Perform final Admin Members UI parity review against `GITiempo.pen` and document any PrimeVue-only compromises.
