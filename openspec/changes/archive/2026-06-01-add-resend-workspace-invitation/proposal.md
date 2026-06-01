## Why

Admins need a recovery path when an invited user loses the original email or needs fresh Firebase password setup/reset link content before the invite expires. The current source of truth has drifted: docs and the approved Admin Members design require resend, while the prior invite provisioning change still describes cancel/recreate as the MVP recovery path.

## What Changes

- Add an admin-only `POST /invites/:id/resend` API that redelivers a pending, unexpired workspace invite.
- Preserve the existing invite row, token, role, workspace, and expiration when resending.
- Generate fresh Firebase password setup/reset link content for the invited email before redelivery.
- Return the existing invite response on successful resend.
- Reject missing, accepted, canceled/expired, cross-workspace, or otherwise non-pending invites with `404 Pending invite not found`.
- Reject pending invites whose `expiresAt` is in the past with `410 Invite has expired`.
- Add Pending Invitations UI on the Admin Members page with `Resend invite` and `Cancel invite` icon-only row actions, toast feedback, refresh behavior, and distinct empty/error states.
- Update contracts/OpenAPI and tests for the new endpoint and Admin Members behavior.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `workspace-invites`: Invite management now includes admin resend for pending, unexpired invites without changing token, expiration, or membership state.
- `admin-members-page`: Members page now renders and manages pending invitations in a separate card with resend and cancel actions.
- `api-e2e-rbac-tests`: Invite RBAC expectations now include admin-only protection for the resend endpoint.
- `api-invite-negative-tests`: Invite failure-path coverage now includes resend not-found/non-pending and expired-pending cases.
- `contracts`: API contract coverage now includes the no-body resend endpoint and its response shape.

## Impact

- Backend: `apps/api` invite controller/service, invite delivery orchestration reuse, Firebase Admin link generation path, unit tests, and e2e tests.
- Contracts/OpenAPI: shared invite response schemas remain reusable, but `packages/shared/openapi.json` must include `POST /invites/{id}/resend`.
- Frontend: `apps/admin-web` members client, Members page composition, pending-invitation UI component/state, toasts, confirmations, and tests.
- Docs/design: existing docs and `GITiempo.pen` already define the target behavior and remain the implementation parity source.
- External systems: Firebase Admin password setup/reset link generation and SMTP/console invite delivery are reused for redelivery.
