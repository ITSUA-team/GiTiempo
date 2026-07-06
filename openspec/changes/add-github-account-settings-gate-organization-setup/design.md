## Context

Admin Workspace Settings already renders workspace settings and a GitHub Workspace Access card. The organization allow-list flow validates organizations through the requesting user's connected GitHub account, but the UI can expose `Add organization` before the current user has connected GitHub.

Existing backend and shared contracts already provide `GET /github/connection` through `GitHubConnectionStatusResponse`, and user-web already uses this status for profile GitHub connection management. The change should reuse that connection status in admin-web Settings instead of adding a parallel auth model.

Affected frontend area:

- `apps/admin-web` Settings page and settings-specific components/composables.
- Admin settings API client and admin settings query keys.
- Focused Settings tests and component tests.
- `docs/ui/pages-admin.md` Settings requirements.

## Goals / Non-Goals

**Goals:**

- Add a current-user GitHub Account section to Admin Workspace Settings.
- Show connected, disconnected, loading, and request-error states for the GitHub account status.
- Hide the `Add organization` form/action until the current user has a connected GitHub account.
- Preserve existing allowed-organization list and remove behavior after policy data loads.
- Preserve existing recovery checklist behavior for organization validation failures after the user is connected.
- Keep the UI aligned with the existing Settings card design: single-column, 620px desktop target, token-backed card styling, PrimeVue controls.

**Non-Goals:**

- No backend GitHub OAuth model rewrite.
- No new GitHub token storage behavior.
- No schema migration or seed requirement.
- No new shared contract if the existing `GitHubConnectionStatusResponse` remains sufficient.
- No user-web profile connection redesign.

## Decisions

### Reuse the existing GitHub connection status endpoint

Admin Settings will read `GET /github/connection` through the existing authenticated frontend API client and shared response schema.

Rationale: organization validation already depends on the current user's GitHub connection, and the backend endpoint already models connected/disconnected status without exposing token material.

Alternative considered: add an admin-only settings endpoint that embeds GitHub account status. Rejected because it would duplicate an existing user-scoped status contract and introduce unnecessary backend/OpenAPI work.

### Keep connection gating in admin-web presentation/state

The organization policy endpoint and add mutation stay unchanged. Admin-web will hide the add form/action when the connection query reports disconnected, loading, or request-error.

Rationale: the backend already protects organization add attempts with structured recovery errors. The issue is primarily a broken setup path in Settings UI before the user tries the action.

Alternative considered: disable the button but keep the add form visible. Rejected because acceptance criteria require `Add organization` to be hidden when GitHub is not connected.

### Preserve saved policy visibility independently from add gating

The allowed organization list, loading, empty, request-error, and remove behavior should remain scoped to workspace policy data. Only the add/setup action is gated by GitHub account connection.

Rationale: existing organization management behavior should continue after connection, and existing saved policy rows remain useful workspace configuration even when the current user's GitHub account is disconnected.

Alternative considered: hide the entire GitHub Workspace Access card until connected. Rejected because it would obscure existing policy state and request-error recovery for policy loading.

### Add a dedicated GitHub Account card/section in Settings

The Settings page will render a GitHub Account section near the GitHub Workspace Access card, using the same Settings card visual language and linking users to the existing user-web profile connection flow when a profile URL is configured.

Rationale: this makes the prerequisite visible before organization setup and keeps connection management ownership in the existing profile flow.

Alternative considered: fold status text into the existing workspace access card. Rejected because the account status is current-user state while organization policy is workspace state; separate sections make the prerequisite clearer.

## Risks / Trade-offs

- [Risk] Admin Settings now depends on another frontend query. -> Mitigation: keep the status query scoped under admin settings keys and handle loading/error states independently from workspace settings form load.
- [Risk] `userAppUrl` may be absent or invalid in some environments. -> Mitigation: render the status/explanation without a profile link when no safe profile URL can be built.
- [Risk] Organization policy query and GitHub connection query can disagree transiently. -> Mitigation: hide only add/setup action unless connected; backend remains authoritative for add attempts and existing recovery payloads.
- [Risk] Existing Settings tests may become broad and brittle. -> Mitigation: add focused tests for connected/disconnected/error gating and keep transport tests at the settings client/query boundary.

## Migration Plan

No data migration is required.

Implementation and rollout steps:

1. Extend admin settings client/query layer to read GitHub connection status through the existing endpoint/schema.
2. Add Settings UI state for GitHub account status and pass connection-derived gating into the existing workspace access card.
3. Update docs/specs and focused tests.
4. Deploy frontend normally. If rollback is needed, revert the admin-web UI/client changes; backend behavior remains compatible.

## Open Questions

- Should the GitHub Account section link to user-web `/profile` or a more specific future `/profile?section=github` anchor if the profile page adds section anchors later?
