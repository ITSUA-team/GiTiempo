## 1. Contracts And Data Model

- [ ] 1.1 Add shared Zod schemas and exported types for allowed GitHub organization item, list response, and add request in `packages/shared/src/contracts`.
- [ ] 1.2 Add shared contract tests for valid responses, strict add payloads, empty login rejection, and unknown-field rejection.
- [ ] 1.3 Add Drizzle schema and migration for workspace-owned GitHub organization allow-list records with normalized-login uniqueness per workspace.
- [ ] 1.4 Update DB schema exports, DBML if maintained, and local seed/test helpers for the new table without adding placeholder policy rows.

## 2. Backend Policy API

- [ ] 2.1 Add DTOs wrapping the shared contracts for workspace GitHub organization policy requests and responses.
- [ ] 2.2 Implement a workspace GitHub organization policy service that lists, adds, removes, normalizes, and de-duplicates allowed organization logins.
- [ ] 2.3 Validate add requests through the requesting admin's connected GitHub account before saving the organization policy row.
- [ ] 2.4 Add admin-only workspace endpoints for listing, adding, and removing allowed GitHub organizations.
- [ ] 2.5 Add backend unit tests for admin success paths, duplicate casing, disconnected admin add failure, inaccessible organization add failure, remove behavior, and non-admin forbidden paths.

## 3. GitHub Policy Enforcement

- [ ] 3.1 Filter GitHub owner list responses so organization owners are limited to the workspace allow-list while personal owner scope remains available.
- [ ] 3.2 Reject organization-scoped repository and project browsing requests when the owner is not allowed by the workspace policy.
- [ ] 3.3 Enforce policy for repository issue browsing and any project-issue browsing path that can identify an organization owner; fail closed when organization ownership cannot be verified.
- [ ] 3.4 Apply the same policy filter to GitHub-backed task-picker option loading when that provider surface exists in the implementation.
- [ ] 3.5 Add focused GitHub service/controller tests proving allowed, disallowed, empty-policy, and personal-owner behavior.

## 4. Admin Settings UI

- [ ] 4.1 Inspect the approved `.pen` Settings screen and record the parity checklist for the GitHub Workspace Access card before implementation.
- [ ] 4.2 Extend the existing admin settings client or its domain boundary with policy list/add/remove calls instead of creating a duplicate transport helper.
- [ ] 4.3 Add a focused settings composable or feature section for GitHub Workspace Access load, add, remove, validation, retry, and toast behavior.
- [ ] 4.4 Render the documented GitHub Workspace Access card below the workspace settings form with skeleton, empty, request-error, saved-row, add, and remove states.
- [ ] 4.5 Add admin-web tests for card loading, empty state, validation without request, add success/failure, remove success/failure, retry, and toast behavior.
- [ ] 4.6 Perform reusable-pattern and PrimeVue exception review for the Settings card and document any PrimeVue-only compromises.

## 5. OpenAPI And Verification

- [ ] 5.1 Regenerate OpenAPI after backend DTO and shared contract changes using the repo-supported export workflow.
- [ ] 5.2 Run shared contract verification with `pnpm --filter @gitiempo/shared test`.
- [ ] 5.3 Run backend verification with `pnpm --filter @gitiempo/api lint`, `pnpm --filter @gitiempo/api typecheck`, and `pnpm --filter @gitiempo/api test`.
- [ ] 5.4 Run admin frontend verification with `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test`.
- [ ] 5.5 Run targeted manual or browser verification for the Settings card add/remove flow, including disconnected GitHub account and backend rejection states.
- [ ] 5.6 Run `openspec status --change add-workspace-github-organization-allow-list-management` and confirm the change is apply-ready.
