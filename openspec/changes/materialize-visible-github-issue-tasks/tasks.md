## 1. API And Shared Contracts

- [ ] 1.1 Document visible-project-scoped GitHub issue browsing in `github-data-browsing-api`, including the read-only boundary for `/projects/:projectId/github/issues`.
- [ ] 1.2 Document `POST /tasks/from-github` in `task-management`, including active/open visibility validation and create-or-reuse behavior.
- [ ] 1.3 Document the shared `EnsureGitHubIssueTaskInput` contract in `contracts` and keep `packages/shared/openapi.json` aligned with the endpoint behavior.

## 2. User-Web Behavior

- [ ] 2.1 Document top-bar timer picker behavior for unsynced GitHub issue suggestions inside visible GitHub-backed projects.
- [ ] 2.2 Document Time Entries create/edit dialog behavior for selecting and materializing unsynced GitHub issues.
- [ ] 2.3 Keep GitHub suggestion request failures distinct from true empty issue results in picker/dialog state descriptions and focused regression coverage.

## 3. Verification And Docs

- [ ] 3.1 Run `pnpm --filter @gitiempo/api typecheck` and focused API tests for task/GitHub materialization paths.
- [ ] 3.2 Run `pnpm --filter user-web typecheck` and focused timer/time-entry tests for GitHub-backed picker flows.
- [ ] 3.3 Run `pnpm exec openspec validate materialize-visible-github-issue-tasks --strict --no-interactive`.
- [ ] 3.4 Confirm `docs/API-ENDPOINTS.md` and related public docs match the proposal wording until canonical archive sync happens.
