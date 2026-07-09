## Context

The admin Settings page already renders a `GitHub Workspace Access` card with allowed-organization list, add/remove actions, and structured GitHub App recovery cards. The add flow validates an organization through the requesting admin's connected GitHub account, but the Settings page does not currently show that account status before the admin tries to add an organization.

`GET /github/connection` already returns safe connection status for any authenticated user and never exposes token material. The active workspace organization policy remains workspace-owned and only filters organization-scoped GitHub flows; it must not become a shared GitHub credential or broaden member permissions.

Affected implementation areas follow the nearest instructions in `apps/admin-web/AGENTS.md` for UI work and `apps/api/AGENTS.md` only if backend or contract changes are needed. UI source-of-truth docs are `docs/ui/INDEX.md` and the Settings section of `docs/ui/pages-admin.md`; the approved `GITiempo.pen` Settings screen must be checked during implementation when the Pencil editor can access it.

Review of this change also exposed that existing `user-activity-tracking` and `workspace-membership` specs are missing required purpose metadata. Canonical `openspec/specs/*` files must not be edited directly during active change work, so the metadata cleanup is carried as change-local spec deltas in this scope and should be materialized only through the normal apply/archive flow.

## Goals / Non-Goals

**Goals:**

- Show the requesting admin's GitHub account connection state inside the Settings page GitHub card.
- Hide the `Add organization` form while the requesting admin is disconnected from GitHub.
- Provide a clear connect/reconnect path that routes to the existing user-app GitHub profile connection surface.
- Preserve allowed-organization listing and removal behavior regardless of the current admin's GitHub connection state.
- Keep successful add, validation failure, recovery-card, loading, empty, and request-error states distinct.
- Carry the missing `user-activity-tracking` and `workspace-membership` purpose metadata through this change to unblock reviewer validation without direct canonical spec edits.

**Non-Goals:**

- Do not change the Firebase/backend application auth model.
- Do not store workspace-level GitHub tokens or share one admin's GitHub provider permissions with other members.
- Do not change GitHub OAuth callback destinations, token storage, or disconnect semantics.
- Do not change existing organization policy persistence beyond enforcing the already-required connected-account prerequisite for adds.
- Do not change `user-activity-tracking` or `workspace-membership` behavior; only add their missing spec purpose metadata through the change workflow.

## Decisions

1. Reuse the existing GitHub connection status contract.

   Admin Settings will read `GET /github/connection` using the existing `githubConnectionStatusResponseSchema` and exported TypeScript types. This keeps token material server-side and avoids a duplicate admin-specific connection endpoint.

   Alternative considered: add a workspace-scoped admin GitHub connection endpoint. Rejected because the connection is user-owned, not workspace-owned, and the existing endpoint already has the correct security boundary.

2. Gate only the add flow in the client, not the policy list.

   The Settings card will continue loading and rendering saved allowed organizations while disconnected. The `Add organization` form is hidden when disconnected because validation would require the requesting admin's GitHub account, but saved policy rows still belong to the workspace and remain manageable.

   Alternative considered: hide the entire GitHub Workspace Access card while disconnected. Rejected because it would hide existing workspace policy state and make removal of stale organizations impossible from Settings.

3. Keep backend enforcement as the source of truth for organization adds.

   Client gating improves the Settings experience, but `POST /workspace/github/organizations` must still reject disconnected or unusable GitHub connections and return the structured recovery payload where applicable. This prevents bypasses from direct API calls or stale browser state.

   Alternative considered: rely only on frontend gating. Rejected because the provider-access prerequisite is a server-side security and correctness rule.

4. Keep the implementation local to `apps/admin-web` unless reuse requires shared code.

   Planned `apps/admin-web` changes include `admin-settings-client.ts`, Settings query keys/composables, `SettingsView.vue`, `SettingsGitHubWorkspaceAccessCard.vue`, and focused tests. `packages/shared` should only change if the existing GitHub connection exports are missing from the package barrel or need contract documentation. `apps/api` should only change if the existing endpoint is not available to admin-web authenticated requests or disconnected add errors are not contract-compliant.

   Alternative considered: create a shared cross-app GitHub account card now. Rejected because this is currently an admin Settings composition detail; extraction can happen after identical user/admin call sites are proven.

5. Carry related OpenSpec validation cleanup in this change.

   The missing purpose metadata blocks full OpenSpec validation during review. The cleanup is included here because it was found while preparing this Settings change for review, but it is explicitly constrained to metadata only and must not alter membership or activity-tracking behavior.

   Alternative considered: direct canonical spec edits. Rejected because canonical specs should be updated through the OpenSpec change/apply/archive workflow.

## Risks / Trade-offs

- [Risk] Connection and organization queries can load at different times, creating confusing mixed states. -> Mitigation: render a dedicated account loading/error block while leaving the policy list's loading/error state scoped to the list.
- [Risk] A stale connected status could show the add form after the provider connection has expired. -> Mitigation: keep backend add validation authoritative and surface existing recovery/error payloads when the add request fails.
- [Risk] Hiding add controls while disconnected could be mistaken for missing permissions. -> Mitigation: show explicit disconnected copy and a connect/reconnect action in the GitHub account section.
- [Risk] The user-app profile link could be unavailable in local or test environments. -> Mitigation: derive the link from existing admin-web env configuration and render non-blocking helper copy when no concrete URL is configured.
- [Risk] Spec metadata cleanup could be mistaken for behavior changes in membership or activity tracking. -> Mitigation: the deltas state that existing requirements and scenarios remain semantically unchanged.

## Migration Plan

- Ship frontend gating first using the existing connection status endpoint.
- If needed, add only minimal shared contract exports or backend error/status tests in the same change.
- Carry spec-purpose metadata through the change-local deltas and materialize it only through the normal OpenSpec workflow.
- No database migration is expected.
- Rollback is safe by reverting the admin Settings UI/client changes; backend organization add validation remains unchanged.

## Open Questions

- None at proposal time.
