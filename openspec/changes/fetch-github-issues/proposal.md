## Why

Users need a reliable way to turn visible GitHub issues into local tasks from both task creation surfaces without leaving the current flow. The current GitHub connection state can look successful while organization-scoped issue fetching still fails because the workspace organization allow-list or GitHub App approval is missing.

## What Changes

- Show open GitHub repository issues as optional task-title suggestions in the user-web Projects task creation dialog and top-bar timer New task flow for GitHub-backed projects.
- Keep GitHub browsing read-only: selecting an issue suggestion seeds local task creation instead of starting timers directly from provider data.
- Gate organization-owned issue fetching through the current workspace GitHub organization policy before calling repository issue endpoints.
- Keep local project/task selection usable when GitHub issue suggestions cannot be loaded.
- Surface clear, non-blocking issue-suggestion states so users and admins can distinguish empty issue results from missing GitHub organization access.
- No breaking changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-pages`: The Projects task creation dialog and top-bar timer New task flow can include GitHub issue suggestions for GitHub-backed visible projects while preserving the existing local task creation flow.
- `github-data-browsing-api`: Repository issue browsing must be safe for task-picker suggestion use and must not be called for disallowed organization owners.
- `workspace-github-organization-policy`: The policy must remain the authoritative gate for organization-scoped issue suggestions and must keep empty/disallowed organizations unavailable for new GitHub-backed task-picker flows.

## Impact

- `apps/user-web`: Projects task dialog, Projects page state, top-bar timer composables, task-picker dialog rendering, query keys, GitHub browsing client, and focused tests.
- `apps/api`: no new endpoint is required, but existing GitHub browsing and workspace organization policy behavior remains part of the contract.
- `packages/shared`: no contract shape changes are expected unless implementation finds a missing response/error state that cannot be represented safely today.
- `apps/admin-web`: no primary implementation work is expected, but existing GitHub Workspace Access recovery flow is the user-facing path when an organization blocks the GitHub App.
