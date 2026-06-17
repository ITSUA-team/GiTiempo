## Why

GitHub browsing APIs already expose repositories, Projects V2, and issues, but the current `admin-web` and `user-web` create flows still behave as manual-only forms. This leaves connected GitHub users unable to create local projects or tasks from provider-backed selections while preserving external reference metadata.

## What Changes

- Add GitHub-backed predictive selection to the `admin-web` Add Project flow for connected users.
- Add GitHub-backed predictive selection to the `user-web` task create flow for connected users.
- Keep manual project and task creation paths available and unchanged for disconnected users or non-GitHub work.
- Persist selected GitHub-backed project/task source and external reference metadata when creating local records.
- Add shared frontend GitHub browsing client coverage for owner, repository, project, and issue candidate fetching.
- Extend shared create contracts and backend create handling only where existing payloads cannot carry the selected external reference safely.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-projects-page`: Add Project route can offer GitHub-backed project name candidates and explicit manual fallback.
- `user-projects-list-page`: task create dialog can offer GitHub-backed task candidates for the selected GitHub-backed scope and explicit manual fallback.
- `contracts`: project and task create payload contracts can carry validated provider reference metadata when creating from GitHub-backed selections.
- `project-management`: project creation can persist GitHub external references and return derived GitHub source data.
- `task-management`: task creation can persist GitHub issue/item external references for tasks created from GitHub-backed selections.
- `data-model`: external provider reference uniqueness and storage rules apply to create-flow-linked projects and tasks.

## Impact

- `apps/user-web`: task create dialog, project/task creation composables, frontend GitHub browsing client usage, and focused view/component tests.
- `apps/admin-web`: Add Project view/form flow, admin project client usage, and focused view/form tests.
- `apps/api`: project/task create DTOs and services if shared contracts require provider reference payloads.
- `packages/shared`: Zod contracts and OpenAPI output for any create payload extensions.
- `packages/web-shared`: shared browser/runtime GitHub browsing client or narrow helpers if both SPAs need identical fetch-boundary behavior.
