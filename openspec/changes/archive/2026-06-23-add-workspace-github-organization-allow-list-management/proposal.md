## Why

Workspace admins need a product-level way to control which GitHub organizations can appear in GiTiempo flows. The current GitHub integration can list every organization visible to a connected user, but workspace policy should narrow that list without changing the approved user-to-server GitHub authentication model.

## What Changes

- Add workspace-level GitHub organization allow-list management for admins.
- Persist allowed GitHub organization logins as workspace-owned policy records.
- Validate a new organization login through the requesting admin's connected GitHub account before saving it.
- Filter GitHub organization owners, repositories, projects, project issues, repository issues, and task-picker GitHub options by the workspace allow-list.
- Expose shared contracts and API endpoints for listing, adding, and removing allowed organizations.
- Extend the admin Settings page's documented `GitHub Workspace Access` card so it uses the new API instead of remaining a static design requirement.
- When adding an organization fails because the connected GitHub account or organization blocks the GitHub App path, surface backend-driven GitHub App access recovery cards in the Settings card with response-derived instructions and action links, without visible status tags.
- Return stable, frontend-safe add-organization recovery payloads so the admin UI can distinguish disconnected GitHub account, inaccessible organization, GitHub App blocked/needs approval, and retryable provider failures while using the backend response as the status source of truth.
- Preserve the existing GitHub App user-to-server auth model; the allow-list is a workspace filter and does not grant GitHub access.

## Capabilities

### New Capabilities
- `workspace-github-organization-policy`: Workspace admin management of allowed GitHub organization logins and policy enforcement for GitHub-backed workspace flows.

### Modified Capabilities
- `data-model`: Persist workspace-owned GitHub organization allow-list records with uniqueness and audit fields.
- `contracts`: Add shared Zod request and response contracts for workspace GitHub organization policy endpoints.
- `github-data-browsing-api`: Apply the workspace organization allow-list to organization-scoped GitHub browsing.
- `time-tracking-api`: Preserve canonical GitHub provider mappings when starting timers from GitHub issues with repository casing variants.
- `workspace-management`: Expose admin-only API behavior for reading and mutating the workspace GitHub organization allow-list.
- `admin-pages`: Make the Settings page GitHub Workspace Access card interactive against the policy API and guide admins through GitHub App install/approval/reconnect recovery when provider-side access blocks validation.

## Impact

- Backend: `apps/api/src/workspaces`, `apps/api/src/github`, Drizzle schema/migration/seed/test fixtures, and OpenAPI export.
- Shared contracts: `packages/shared/src/contracts` for policy request/response shapes.
- Admin frontend: `apps/admin-web` Settings page data loading, validation, mutation, toasts, and tests.
- Admin frontend: blocked-organization GitHub App access recovery cards with response-derived instructions, external GitHub install/settings links, internal reconnect link, retry action, and focused tests.
- Existing GitHub browsing, task-picker, and start-from-GitHub flows gain policy filtering or canonical mapping reuse while retaining the connected-user permission boundary.
- No new external dependency and no shared organization GitHub credential.
