## 1. Shared Contracts

- [x] 1.1 Inspect existing GitHub browsing response schemas and project/task create schemas for reusable provider identity fields.
- [x] 1.2 Add shared GitHub create-source reference schemas for project repository, project Project V2, repository issue, and Project V2 issue-item selections.
- [x] 1.3 Extend project create and task create schemas to accept optional GitHub create-source reference metadata while preserving manual payload validation.
- [x] 1.4 Add shared contract tests for GitHub-backed project creates, GitHub-backed task creates, manual creates, unknown-field rejection, and unsupported-provider rejection.

## 2. Backend Create Persistence

- [x] 2.1 Inspect existing project/task external reference tables and services to confirm no database migration is required; stop for approval if schema changes are needed.
- [x] 2.2 Update backend project create DTO handling to accept the extended shared project create contract.
- [x] 2.3 Persist project and project external reference records atomically when GitHub project reference metadata is present.
- [x] 2.4 Return conflict errors without orphaned local projects when duplicate project provider references are submitted.
- [x] 2.5 Update backend task create DTO handling to accept the extended shared task create contract.
- [x] 2.6 Persist task and task external reference records atomically when GitHub issue reference metadata is present.
- [x] 2.7 Return conflict errors without orphaned local tasks when duplicate task provider references are submitted.
- [x] 2.8 Add backend tests for manual create behavior, GitHub-backed create behavior, duplicate-reference conflicts, and authorization or visibility rejection before reference persistence.

## 3. OpenAPI And Shared Browser Client

- [x] 3.1 Regenerate OpenAPI after shared DTO and backend create-contract changes.
- [x] 3.2 Add a narrow shared frontend GitHub browsing client boundary for owners, repositories, Projects V2, repository issues, and Project V2 issue items.
- [x] 3.3 Keep GitHub connection/profile status behavior separate from the shared browsing client.
- [x] 3.4 Add shared frontend client tests for request paths, response parsing, pagination parameters, search parameters, and API error propagation.

## 4. Admin Project Creation UI

- [x] 4.1 Update the admin Add Project flow to detect GitHub connection state and keep manual creation available for disconnected users.
- [x] 4.2 Add GitHub owner, repository, and Project V2 candidate controls using PrimeVue predictive selection patterns.
- [x] 4.3 Populate editable local project fields and visible source state from selected GitHub repository or Project V2 candidates.
- [x] 4.4 Clear pending GitHub metadata when the user switches back to manual entry or clears the candidate selection.
- [x] 4.5 Submit GitHub provider-reference metadata with project create requests only when a candidate remains selected.
- [x] 4.6 Add admin-web tests for connected candidate selection, disconnected manual-only behavior, loading/empty/error candidate states, metadata clearing, and request payloads.

## 5. User Task Creation UI

- [x] 5.1 Update the user Projects task create dialog to detect GitHub connection state and keep manual task creation available for disconnected users.
- [x] 5.2 Derive eligible GitHub issue candidate scope from the selected project or explicit GitHub scope without changing update-dialog behavior.
- [x] 5.3 Add repository issue and Project V2 issue item candidate controls using PrimeVue predictive selection patterns.
- [x] 5.4 Populate editable local task title and visible source state from the selected GitHub issue candidate.
- [x] 5.5 Clear pending GitHub metadata when the user switches back to manual entry or clears the issue candidate.
- [x] 5.6 Submit GitHub issue provider-reference metadata with task create requests only when a candidate remains selected.
- [x] 5.7 Add user-web tests for connected candidate selection, disconnected manual-only behavior, loading/empty/error candidate states, metadata clearing, request payloads, and unchanged update-dialog behavior.

## 6. Verification

- [x] 6.1 Run shared package contract tests and typecheck.
- [x] 6.2 Run API tests, lint, and typecheck for the touched backend modules.
- [x] 6.3 Run admin-web tests, lint, and typecheck.
- [x] 6.4 Run user-web tests, lint, and typecheck.
- [x] 6.5 Run root verification commands required by touched packages, including `pnpm openapi:export` if OpenAPI output changes.
- [x] 6.6 Manually verify that browsing GitHub candidates does not create local records until the create form is submitted.
