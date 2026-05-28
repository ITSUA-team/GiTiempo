## Context

The Admin Members docs and approved `GITiempo.pen` screen now include a Pending Invitations card with `Resend invite` and `Cancel invite` actions. Current implementation support stops at listing, creating, canceling, and accepting invites: `apps/api` has no resend route, `packages/shared/openapi.json` has no resend operation, and `apps/admin-web` only uses invite data for the Pending Invites stat.

The previous Firebase invite provisioning change rejected a separate resend endpoint for MVP and documented cancel/recreate as the recovery path. This change supersedes that operational decision for pending, unexpired invites while keeping the existing invite-only membership boundary: resend redelivers onboarding content, but `POST /invites/accept` remains the only path that creates workspace membership.

Affected guidance:
- Backend work follows `apps/api/AGENTS.md`, including shared contract/OpenAPI updates when endpoint shape changes.
- Admin UI work follows `apps/admin-web/AGENTS.md`, `docs/ui/INDEX.md`, `docs/ui/pages-admin.md`, `docs/ui/components.md`, `docs/ui/patterns.md`, and the approved Admin Members screen in `GITiempo.pen`.

## Goals / Non-Goals

**Goals:**
- Add an admin-only resend endpoint for pending, unexpired workspace invites.
- Preserve the invite row, token, role, expiration, and membership state during resend.
- Redeliver invite email content with fresh Firebase password setup/reset link content.
- Expose pending invitations on the Admin Members page with accessible icon-only resend and cancel actions.
- Keep frontend, backend, OpenAPI, and tests aligned with the new source of truth.

**Non-Goals:**
- Do not extend invite expiration during resend.
- Do not create a new invite row or rotate the invite token during resend.
- Do not create Firebase passwords or accept raw passwords through GiTiempo APIs.
- Do not change invite acceptance behavior or make resend available to non-admin users.
- Do not add bulk resend or automatic retry scheduling.

## Decisions

1. **Resend reuses the existing pending invite.**
   - Decision: `POST /invites/:id/resend` looks up a pending invite in the current workspace, verifies it has not expired by time, regenerates Firebase setup/reset link content, redelivers, and returns the same invite response shape.
   - Rationale: Docs specify no body, unchanged token/expiration, and no membership creation. Returning the existing invite response lets the admin client reuse current invite parsing.
   - Alternative considered: cancel and recreate the invite. Rejected because the approved UI now offers resend specifically to recover delivery without changing invite identity.

2. **Non-pending and cross-workspace invites are hidden behind the same 404.**
   - Decision: missing, accepted, canceled/expired, and cross-workspace invite IDs return `404 Pending invite not found`.
   - Rationale: This matches current cancel behavior and avoids leaking invite existence across workspaces.
   - Alternative considered: return `409` for accepted/canceled invites. Rejected because docs require the 404 message and current admin invite management already uses that shape.

3. **Expired-by-time pending invites return 410 without mutating state.**
   - Decision: a row with status `pending` but `expiresAt <= now` returns `410 Invite has expired`; implementation does not extend expiration or create membership.
   - Rationale: The row is still pending, but resend would produce unusable onboarding content because acceptance is time-blocked.
   - Alternative considered: transition the row to expired during resend. Rejected for this change because the documented resend behavior only rejects expired pending invites and does not define a status mutation side effect.

4. **Reuse invite delivery composition through a service helper.**
   - Decision: factor the existing create-invite delivery steps so create and resend both provision/reuse Firebase user, generate password setup/reset link content, and call the invite delivery service.
   - Rationale: SMTP/console behavior, secret redaction, and Firebase action-code behavior should remain identical.
   - Alternative considered: duplicate resend delivery logic. Rejected because duplicate delivery logic risks inconsistent redaction and Firebase link behavior.

5. **Admin Members renders pending invitations separately from members.**
   - Decision: add a dedicated Pending Invitations card below the Members table, using the same management-table/card language. Desktop/tablet columns are Email, Role, Expires, and Actions; mobile uses stacked cards with the same fields.
   - Rationale: The approved `.pen` screen shows a separate card, and docs require distinct pending-empty and request-error states.
   - Alternative considered: merge pending invites into the members table. Rejected because pending invites are not members and have different actions, fields, and error behavior.

6. **Cancel invite remains a destructive confirmed action.**
   - Decision: wire pending invite cancellation from the Pending Invitations card using the existing `DELETE /invites/:id` endpoint and shared confirmation dialog.
   - Rationale: Docs require `Cancel invite` beside `Resend invite`, and existing cancellation behavior already matches backend semantics.
   - Alternative considered: leave cancel accessible only through future implementation. Rejected because the approved UI presents both actions together.

## Risks / Trade-offs

- Firebase setup/reset link generation can fail during resend -> surface the backend error to the admin, keep the invite row visible, and do not mutate token or expiration.
- SMTP delivery can fail after the invite is found -> surface the delivery error, keep the pending invite unchanged, and allow the admin to retry.
- Resending close to expiration can produce a link that still cannot be accepted after the invite expires -> show the existing expiration date and reject expired pending invites with `410`.
- Existing dashboard and Members page both consume invite lists -> keep the response schema unchanged so existing invite count behavior is stable.
- OpenAPI export has a known tooling caveat -> follow `apps/api/AGENTS.md` build-based export guidance if direct export fails.

## Migration Plan

1. Add backend resend service/controller behavior and focused tests before wiring the UI.
2. Update shared OpenAPI/contract expectations for `POST /invites/{id}/resend`.
3. Add admin-web client methods and Pending Invitations UI using the approved `.pen` parity checklist.
4. Verify API lint/typecheck/tests and admin-web lint/typecheck/tests; run OpenAPI export through the repo-approved workflow.

Rollback: remove the admin UI action first if backend resend must be disabled, then remove the API route. Existing create/cancel/accept invite flows remain unchanged.

## Open Questions

- None.
