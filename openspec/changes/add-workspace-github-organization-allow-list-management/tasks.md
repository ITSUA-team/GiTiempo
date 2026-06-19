## 1. Contracts And Data Model

- [x] 1.1 Add shared Zod schemas and exported types for allowed GitHub organization item, list response, and add request in `packages/shared/src/contracts`.
- [x] 1.2 Add shared contract tests for valid responses, strict add payloads, empty login rejection, and unknown-field rejection.
- [x] 1.2a Add shared recovery payload schemas and contract tests for GitHub App access step ids and status values.
- [x] 1.3 Add Drizzle schema and migration for workspace-owned GitHub organization allow-list records with normalized-login uniqueness per workspace.
- [x] 1.4 Update DB schema exports, DBML if maintained, and local seed/test helpers for the new table without adding placeholder policy rows.
- [x] 1.5 Add frontend-safe add-organization recovery reason contract coverage for missing GitHub connection, inaccessible organization, GitHub App blocked/needs approval, and retryable provider failure.

## 2. Backend Policy API

- [x] 2.1 Add DTOs wrapping the shared contracts for workspace GitHub organization policy requests and responses.
- [x] 2.2 Implement a workspace GitHub organization policy service that lists, adds, removes, normalizes, and de-duplicates allowed organization logins.
- [x] 2.3 Validate add requests through the requesting admin's connected GitHub account before saving the organization policy row, including direct or active-membership fallback when the initial owner list does not include the organization.
- [x] 2.4 Add admin-only workspace endpoints for listing, adding, and removing allowed GitHub organizations.
- [x] 2.5 Add backend unit tests for admin success paths, duplicate casing, disconnected admin add failure, inaccessible organization add failure, membership fallback validation, remove behavior, and non-admin forbidden paths.
- [x] 2.6 Classify add-organization validation failures into stable frontend-safe recovery reasons without exposing raw GitHub provider details.
- [x] 2.7 Add backend tests for GitHub App blocked/needs-approval and retryable provider failure reason mapping.
- [x] 2.8 Return structured recovery payloads with ordered GitHub App access step ids and backend-derived statuses for recoverable add-organization failures.
- [x] 2.9 Add backend tests proving each recoverable add-organization failure returns the expected recovery step statuses without raw provider details.
- [x] 2.10 Align the remove endpoint and tests on the policy row identifier returned by list/add responses, not the organization login string.

## 3. GitHub Policy Enforcement

- [x] 3.1 Filter GitHub owner list responses so organization owners are limited to the workspace allow-list while personal owner scope remains available.
- [x] 3.2 Reject organization-scoped repository and project browsing requests when the owner is not allowed by the workspace policy.
- [x] 3.3 Enforce policy for repository issue browsing and any project-issue browsing path that can identify an organization owner; fail closed when organization ownership cannot be verified.
- [x] 3.4 Apply the same policy filter to GitHub-backed task-picker option loading when that provider surface exists in the implementation.
- [x] 3.5 Add focused GitHub service/controller tests proving allowed, disallowed, empty-policy, and personal-owner behavior.
- [x] 3.6 Confirm historical GitHub-backed local refs remain readable after policy removal while removed organizations stay unavailable for new GitHub browsing and selection flows.
- [x] 3.7 Capture start-from-GitHub casing reuse behavior in the active time-tracking API delta spec instead of editing the canonical spec before archive.

## 4. Admin Settings UI

- [x] 4.1 Inspect the approved `.pen` Settings screen and record the parity checklist for the GitHub Workspace Access card before implementation.
- [x] 4.2 Extend the existing admin settings client or its domain boundary with policy list/add/remove calls instead of creating a duplicate transport helper.
- [x] 4.3 Add a focused settings composable or feature section for GitHub Workspace Access load, add, remove, validation, retry, and toast behavior.
- [x] 4.4 Render the documented GitHub Workspace Access card below the workspace settings form with skeleton, empty, request-error, saved-row, add, and remove states.
- [x] 4.5 Add admin-web tests for card loading, empty state, validation without request, add success/failure, remove success/failure, retry, and toast behavior.
- [x] 4.6 Perform reusable-pattern and PrimeVue exception review for the Settings card and document any PrimeVue-only compromises.
- [x] 4.7 Render GitHub App access recovery cards from the structured backend recovery payload, including response-derived instructions, GitHub install/settings links, reconnect link, and retry action without visible status tags.
- [x] 4.8 Add admin-web tests for disconnected, inaccessible organization, GitHub App blocked/needs approval, retryable provider failure, retry-success, and still-blocked recovery card states using response-provided statuses.

## 5. OpenAPI And Verification

- [x] 5.1 Regenerate OpenAPI after backend DTO and shared contract changes using the repo-supported export workflow.
- [x] 5.1a Regenerate OpenAPI after adding structured GitHub App access recovery payload DTOs.
- [x] 5.2 Run shared contract verification with `pnpm --filter @gitiempo/shared test`.
- [x] 5.2a Run shared contract verification after adding recovery payload schemas.
- [x] 5.3 Run backend verification with `pnpm --filter @gitiempo/api lint`, `pnpm --filter @gitiempo/api typecheck`, and `pnpm --filter @gitiempo/api test`.
- [x] 5.3a Run backend verification after adding recovery payload status mapping.
- [x] 5.4 Run admin frontend verification with `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test`.
- [x] 5.4a Run admin frontend verification after rendering response-driven recovery cards.
- [x] 5.5 Run targeted manual or browser verification for the Settings card add/remove flow, including disconnected GitHub account and backend rejection states.
- [x] 5.6 Run `openspec status --change add-workspace-github-organization-allow-list-management` and confirm the change is apply-ready.
- [x] 5.7 Run targeted browser verification for the response-driven GitHub App access recovery cards with a real or mocked blocked organization state.
- [x] 5.8 Update human API documentation for the workspace GitHub organization policy endpoints alongside OpenAPI.
