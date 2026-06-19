## Context

GiTiempo already uses GitHub App user-to-server authentication: each user connects their own GitHub account, token material stays server-side, and GitHub browsing only exposes data visible to that connected user. ADR 003 and `docs/TECHNICAL-REQUIREMENTS.md` explicitly preserve that model while allowing a workspace admin policy that filters which GitHub organizations appear in product flows.

The admin Settings UI docs already define a `GitHub Workspace Access` card below the workspace settings form. This change turns that documented surface into an implemented policy flow spanning `apps/api`, `packages/shared`, and `apps/admin-web`.

Affected instruction sources:
- Root `AGENTS.md` for monorepo, OpenSpec, and root Turbo command expectations.
- `apps/api/AGENTS.md` for NestJS, Drizzle, contracts, OpenAPI, and verification.
- `apps/admin-web/AGENTS.md`, `docs/ui/INDEX.md`, and `docs/ui/pages-admin.md` for Settings UI behavior.
- `gitiempo-frontend-rules` for frontend state, client, toast, and test expectations.

## Goals / Non-Goals

**Goals:**
- Let workspace admins list, add, and remove allowed GitHub organization logins from the admin Settings page.
- Store the allow-list as workspace-owned policy data with uniqueness per workspace.
- Validate organization logins through the requesting admin's connected GitHub account before saving.
- Apply the allow-list to organization-scoped GitHub browsing and GitHub-backed workspace flows while keeping personal-owner browsing available.
- Share request/response contracts through `packages/shared` and document the API in OpenAPI.
- Guide workspace admins through GitHub App install, organization approval/unblock, account reconnect, and retry steps when organization validation fails for GitHub-side access reasons.

**Non-Goals:**
- Do not introduce a shared organization GitHub token or workspace-level GitHub credential.
- Do not replace the existing GitHub App user-to-server OAuth flow.
- Do not grant users access to GitHub data they cannot already access through their connected GitHub account.
- Do not implement GitHub App installation management, GitHub webhooks, or background sync; GiTiempo may only show guidance and outbound links to GitHub's own install/settings pages.
- Do not change manual/local GiTiempo project, task, or timer behavior except where a flow is explicitly backed by GitHub organization data.

## Decisions

1. **Store policy in a dedicated workspace table.**

   Add a `workspace_github_organizations` table owned by `workspace_id`, with normalized lowercase `login`, original/display `login`, timestamps, and `created_by_user_id`. Enforce uniqueness on `(workspace_id, normalized_login)`.

   Alternative considered: store an array on `workspace_settings`. Rejected because per-login audit fields, uniqueness, and future metadata become awkward inside a settings blob.

2. **Expose policy through `workspace` admin endpoints.**

   Add endpoints under the existing workspace boundary, for example `GET /workspace/github/organizations`, `POST /workspace/github/organizations`, and `DELETE /workspace/github/organizations/:login`. Reuse `WorkspaceAdminGuard`.

   Alternative considered: expose endpoints under `/github`. Rejected because the data is workspace policy, not connected-account profile state or GitHub browsing data.

3. **Validate additions through the admin's connected GitHub account.**

   On add, the backend requires the admin to have a usable GitHub connection, loads organization owners visible to that account, and saves only exact login matches for organization owners. This confirms the login is reachable through the same auth model used by members.

   Alternative considered: accept arbitrary logins and rely on later browse failures. Rejected because admins would get false-positive policy rows and members would see confusing empty/forbidden GitHub flows.

4. **Policy filters after user auth, before organization-scoped provider calls are trusted.**

   For owner lists, return personal owners plus organization owners that match the allow-list. For organization-scoped repository/project requests, reject or return a safe forbidden-style application error when the requested organization is not allowed. Repository issue requests should derive the repository owner from the URL/path owner and reject disallowed organization owners; personal repositories remain available. Project V2 issue requests should validate against stored metadata when available, or require enough owner context before surfacing organization-backed items.

   Alternative considered: only filter owner dropdowns in the frontend. Rejected because direct API requests could still browse disallowed organizations.

5. **Keep allow-list empty as "no organizations allowed".**

   With no saved organization rows, only personal-owner browsing remains visible and organization-scoped requests are denied. This makes policy explicit and avoids silently allowing every organization until an admin configures the workspace.

   Alternative considered: empty means unrestricted. Rejected because the requested feature is an allow-list management surface, and an unrestricted default is hard to distinguish from missing configuration.

6. **Use the existing Settings page pattern instead of a new admin route.**

   Implement the documented `GitHub Workspace Access` card below the existing workspace settings card. The card owns load, add, remove, skeleton, request-error, empty, and mutation states while reusing the existing admin Settings page shell.

   Alternative considered: create a separate GitHub admin page. Rejected because current UI docs route the surface to Settings and the scope is narrow.

7. **Return response-driven GitHub App access recovery cards.**

   When add validation fails because the admin has no connected GitHub account, the organization is inaccessible to the connected account, GitHub reports that the organization blocks or has not approved the app, or the provider check is retryable, return a frontend-safe recovery payload alongside the normal application error message. The payload includes the rejected organization login, a stable recovery reason, and ordered `GitHub App access` card steps. Each step has a stable step id and a backend-derived status value, so the frontend does not infer card status only from the broad recovery reason.

   Admin-web owns presentation mapping from step id/status to concise instructions and action links without rendering visible status tags. GitHub install/settings actions open GitHub in a new tab; reconnect uses the existing user profile GitHub connection flow; retry reuses the Settings card mutation. The install action uses the configured GitHub App install URL and defaults to the public `https://github.com/apps/gi-tiempo/installations/new` installation request route when no deployment override is provided.

   Alternative considered: show only the backend error toast. Rejected because provider-side GitHub App approval failures are recoverable but require actions outside GiTiempo, and a generic error leaves admins without a path to fix the organization.

## Risks / Trade-offs

- **Admin validates an org they can see, but a member cannot see it** -> The allow-list remains only a GiTiempo filter; each member's connected GitHub account still determines actual access, and empty/member-specific results must stay clear.
- **GitHub API pagination omits a visible organization during validation** -> Validation must page through all accessible organization owners up to the provider-supported limit or perform a direct organization lookup with membership/access confirmation.
- **Case variants create duplicates** -> Normalize login for uniqueness and comparisons while preserving display login in responses.
- **Direct organization-scoped API calls bypass frontend filters** -> Enforce policy in backend services before provider data is returned.
- **Project V2 issue calls may only receive a project node id** -> Store or carry owner metadata for GitHub project selections where possible; fail closed when organization ownership cannot be verified against policy.
- **Settings page becomes too broad** -> Keep the GitHub access card in its own client/composable section so workspace identity/settings form behavior stays isolated.
- **GitHub App install URL depends on deployment configuration** -> Prefer a configured public app slug/install URL for the direct install action, and default to the public GiTiempo GitHub App installation request URL when it is unavailable.
- **Provider failures can be ambiguous** -> Classify only safe, product-useful reasons for the frontend. Keep raw GitHub response details server-side and use the generic recovery path when the provider result cannot be distinguished safely.
- **Backend-owned statuses can drift from UI copy** -> Keep shared step ids and status enums stable, and keep admin-web responsible only for display labels, tones, instructions, and destinations.

## Migration Plan

1. Add the Drizzle table and migration with an empty default policy for existing workspaces.
2. Add shared Zod schemas and DTOs for policy list/add/remove responses and GitHub App access recovery step statuses.
3. Add backend workspace policy service and controller endpoints behind `WorkspaceAdminGuard`.
4. Wire policy enforcement into GitHub browsing and any GitHub-backed task-picker option provider.
5. Implement the admin Settings GitHub Workspace Access card against the new endpoints.
6. Add structured recovery metadata to add-organization failures and render response-driven GitHub App access cards for disconnected, blocked/needs-approval, inaccessible, and retryable provider states.
7. Regenerate OpenAPI after contract/DTO changes.

Rollback is straightforward before policy data is used externally: remove the UI calls, remove service enforcement, and drop the new table through a down migration if the deployment process supports rollback migrations. Existing GitHub connections and manual/local workspace data are unaffected.

## Open Questions

- Should seeded local development include one example allowed organization, or should dev start with an empty allow-list to exercise the add flow?
- If a user opens an older synced GitHub task whose organization is later removed from the allow-list, should the UI keep the historical external link visible while hiding it from new selection flows?
