## Why

This branch adds project-scoped GitHub issue browsing and a separate `POST /tasks/from-github` task-materialization flow for user-web picker surfaces, but the active OpenSpec source still only describes read-only GitHub browsing and generic manual task creation. Capturing that behavior as an active change prevents future agents from treating the current implementation as undocumented drift or "fixing" it back to a less capable flow.

## What Changes

- Document a visible-project-scoped GitHub repository issue browsing endpoint for GitHub-backed local projects.
- Document `POST /tasks/from-github` as the explicit mutation that creates or reuses a local visible task from a selected GitHub issue.
- Keep GitHub browsing read-only until the user explicitly selects an issue for materialization.
- Document top-bar timer and Time Entries picker behavior that appends unsynced GitHub issues for visible GitHub-backed projects and materializes the selected issue before start/create/update flows.
- Require picker/dialog request-failure states to stay distinct from true empty issue results.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `github-data-browsing-api`: add visible-project-scoped GitHub issue browsing behavior while keeping browsing responses read-only.
- `task-management`: add explicit GitHub issue task materialization for visible active GitHub-backed projects.
- `contracts`: add the shared request contract for project-scoped GitHub issue task materialization.
- `user-pages`: update top-bar timer and Time Entries picker behavior for unsynced GitHub issue selection and distinct request-error states.

## Impact

- Backend task and GitHub services in `apps/api`, including OpenAPI docs for `/projects/:projectId/github/issues` and `/tasks/from-github`.
- Shared task contracts and generated OpenAPI artifacts in `packages/shared`.
- User-web task-option loaders, timer picker flows, and manual time-entry dialog flows in `apps/user-web`.
- Public endpoint and OpenSpec documentation for GitHub-backed project issue selection.
