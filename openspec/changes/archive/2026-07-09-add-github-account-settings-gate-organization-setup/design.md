## Context

Admin Workspace Settings already renders workspace settings and a GitHub Workspace Access card. The organization allow-list flow validates organizations through the requesting user's connected GitHub account, but the UI can expose `Add organization` before the current user has connected GitHub.

Existing backend and shared contracts already provide `GET /github/connection` through `GitHubConnectionStatusResponse`, and user-web already uses this status for profile GitHub connection management. The change reuses that connection status in admin-web Settings instead of adding a parallel auth model.

Admin Settings also needs a safe source for the organization selector. Existing browsing owner lists are filtered by workspace organization policy for normal GitHub browsing, but setup must show organizations visible to the current user's connected GitHub account before they are allowed for the workspace. This requires a setup-only current-user organization list that does not grant workspace access and still keeps token material server-side.

Affected implementation areas follow `apps/admin-web/AGENTS.md` for UI work and `apps/api/AGENTS.md` for backend/API work. UI source-of-truth docs are `docs/ui/INDEX.md` and the Settings section of `docs/ui/pages-admin.md`; the approved `GITiempo.pen` Settings screen should be checked during implementation when the Pencil editor can access it.

Review of this change also exposed that existing `user-activity-tracking` and `workspace-membership` specs are missing required purpose metadata. Canonical `openspec/specs/*` files must not be edited directly during active change work, and OpenSpec requirement deltas cannot directly add top-level `## Purpose` headers. This change therefore records the validation caveat for closeout: targeted change validation can pass before archive, but `openspec validate --all` remains dependent on canonical spec-purpose metadata being materialized through the normal workflow.

## Goals / Non-Goals

**Goals:**

- Add a current-user GitHub Account card to Admin Workspace Settings.
- Show connected, disconnected, loading, and request-error states for GitHub account status.
- Hide the `Add organization` form/action until the current user has a connected GitHub account.
- Populate the add setup selector from organizations visible to the current user's connected GitHub account, excluding organizations already allowed for the workspace, while still accepting a manually typed organization login for backend-authoritative validation.
- Preserve existing allowed-organization list and remove behavior after policy data loads.
- Preserve existing recovery checklist behavior for organization validation failures after the user is connected.
- Provide a clear connect/reconnect path that routes to the existing user-app GitHub profile connection surface.
- Keep successful add, validation failure, recovery-card, loading, empty, and request-error states distinct.
- Keep backend add validation authoritative for direct API calls or stale browser state.
- Keep the UI aligned with the existing Settings card design: single-column, 620px desktop target, token-backed card styling, and PrimeVue controls.
- Record the `user-activity-tracking` and `workspace-membership` purpose-metadata validation caveat without claiming it is fixed before archive.

**Non-Goals:**

- Do not change the Firebase/backend application auth model.
- Do not store workspace-level GitHub tokens or share one admin's GitHub provider permissions with other members.
- Do not change GitHub OAuth callback destinations, token storage, or disconnect semantics.
- Do not change existing organization policy persistence beyond enforcing the already-required connected-account prerequisite for adds.
- Do not add a schema migration or seed requirement.
- Do not redesign the user-web profile connection surface.
- Do not change `user-activity-tracking` or `workspace-membership` behavior or add fake behavior requirements for spec metadata.

## Decisions

### Reuse the existing GitHub connection status endpoint

Admin Settings will read `GET /github/connection` through the existing authenticated frontend API client and shared response schema.

Rationale: organization validation already depends on the current user's GitHub connection, and the backend endpoint already models connected/disconnected status without exposing token material.

Alternative considered: add an admin-only settings endpoint that embeds GitHub account status. Rejected because it would duplicate an existing user-scoped status contract and introduce unnecessary backend/OpenAPI work.

### Add a setup-only current-user organization listing

Admin Settings will read `GET /github/organizations` to populate the add-organization selector. The endpoint returns `GitHubOwnerListResponse` with organization owners visible to the current user's connected GitHub account. It is intentionally not filtered by the current workspace allow-list because its purpose is to help admins choose a new organization before it is allowed.

Rationale: the existing browsing owner list applies workspace policy for normal GitHub browsing, so it cannot show disallowed-but-visible organizations that an admin may want to add to the workspace policy. Keeping this as a setup-only current-user list avoids overloading browsing endpoints and keeps provider access checks tied to the requesting user.

Alternative considered: require force-selection from the loaded organization list. Rejected because the Settings UI docs require the PrimeVue organization input to accept a manually typed GitHub organization login when backend validation can accept active memberships that are missing from suggestions.

Alternative considered: reuse `GET /github/owners?type=organization`. Rejected because that endpoint is governed by workspace browsing policy and should not bypass that policy for normal browsing flows.

### Keep connection gating in admin-web presentation/state

The organization policy add mutation stays unchanged. Admin-web hides the add form/action when the connection query reports disconnected, loading, or request-error, and avoids sending add requests for empty or invalid organization login input. The selector should prefer loaded suggestions when available, but a non-empty manually typed login remains a valid add attempt because backend validation is authoritative.

Rationale: the backend already protects organization add attempts with structured recovery errors. The frontend issue is primarily a broken setup path before the user tries the action.

Alternative considered: disable the button but keep the add form visible. Rejected because acceptance criteria require `Add organization` to be hidden when GitHub is not connected.

### Preserve saved policy visibility independently from add gating

The allowed organization list, loading, empty, request-error, and remove behavior remain scoped to workspace policy data. Only the add/setup action is gated by GitHub account connection.

Rationale: existing saved policy rows remain useful workspace configuration even when the current user's GitHub account is disconnected.

Alternative considered: hide the entire GitHub Workspace Access card until connected. Rejected because it would obscure existing policy state and request-error recovery for policy loading.

### Add a dedicated GitHub Account card in Settings

The Settings page renders a GitHub Account card before GitHub Workspace Access, using the same Settings card visual language and linking users to the existing user-web `/profile` route when a profile URL is configured. More specific profile anchors such as `/profile?section=github` are out of scope until the user profile page defines them.

Rationale: this makes the prerequisite visible before organization setup and keeps connection management ownership in the existing profile flow.

Alternative considered: fold status text into the existing workspace access card. Rejected because account status is current-user state while organization policy is workspace state; separate cards make the prerequisite clearer.

### Document related OpenSpec validation caveat in this change

The missing purpose metadata blocks full OpenSpec validation during review, but change-local requirement deltas cannot directly add a top-level `## Purpose` section to existing canonical specs. The correct pre-archive signal for this feature remains `openspec validate add-github-account-settings-gate-organization-setup --strict`; `openspec validate --all` should be rechecked only after the canonical spec metadata is materialized through the normal workflow.

Alternative considered: direct canonical spec edits. Rejected because canonical specs should be updated through the OpenSpec workflow, not edited directly during active change work.

## Risks / Trade-offs

- [Risk] Admin Settings now depends on another frontend query. -> Mitigation: keep the status query scoped under admin settings keys and handle loading/error states independently from workspace settings form load.
- [Risk] `userAppUrl` may be absent or invalid in some environments. -> Mitigation: render the status/explanation without a profile link when no safe profile URL can be built.
- [Risk] Organization policy query, available organization query, and GitHub connection query can disagree transiently. -> Mitigation: hide or locally block only add/setup action unless connected and selector data is usable; backend remains authoritative for add attempts and existing recovery payloads.
- [Risk] `GET /github/organizations` can be mistaken for browsing access. -> Mitigation: document it as setup-only, return only safe `GitHubOwnerListResponse` owner metadata, do not apply it to browsing/resource access, and keep workspace policy enforcement on browsing/add endpoints.
- [Risk] A stale connected status could show the add form after the provider connection has expired. -> Mitigation: backend add validation remains authoritative and surfaces existing recovery/error payloads.
- [Risk] Hiding add controls while disconnected could be mistaken for missing permissions. -> Mitigation: show explicit disconnected copy and a connect/reconnect action in the GitHub account section.
- [Risk] Reviewers could assume this change fixes full catalog validation before archive. -> Mitigation: the change explicitly states that `openspec validate --all` still depends on canonical purpose metadata being materialized through the normal workflow.

## Migration Plan

No data migration is required.

Implementation and rollout steps:

1. Extend backend/API docs/OpenAPI with `GET /github/organizations` using `GitHubOwnerListResponse` and current-user connected GitHub provider access.
2. Extend admin settings client/query layer to read GitHub connection status through the existing endpoint/schema and available organizations through `GET /github/organizations`.
3. Add Settings UI state for GitHub account status and pass connection-derived gating into the existing workspace access card.
4. Render organization setup as a PrimeVue selector sourced from available organizations, excluding already allowed workspace organizations from suggestions while preserving manually typed organization login fallback.
5. Update docs/specs and focused tests.
6. Use targeted change validation before archive; re-run full catalog validation only after canonical spec-purpose metadata is materialized through the normal workflow.
7. Deploy normally. If rollback is needed, revert the admin-web UI/client changes and setup-only GitHub organizations endpoint; backend organization add validation remains compatible.

## Open Questions

- None.
