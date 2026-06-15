## Why

GitHub issue #207 requires the user-web top-bar timer task picker to include GitHub-backed project and issue choices visible to the connected GitHub user. The current UI docs and implementation only describe visible workspace `Project -> Task` selection, which leaves the existing GitHub browsing API disconnected from the selector flow.

## What Changes

- Update the user-web task-picker requirements so project and task options include GitHub-backed choices available through the authenticated user's connected GitHub account.
- Make data-source precedence explicit: workspace-local visible projects and tasks remain available, GitHub-backed options are added when a usable GitHub connection exists, and disconnected users keep the current workspace-local behavior.
- Keep manual workspace-local task creation intact, with `New task` appended as the last task option in the selected project/task dropdown flow.
- Align `docs/ui/pages-user.md` and `docs/ui/patterns.md` with the updated selector behavior.
- Update the user-web top-bar timer task-picker data loading, option rendering, selection, and tests to match the documented behavior.
- Add the minimal shared/backend support needed to resolve a selected GitHub issue candidate into a local project/task timer target before starting or updating a timer.
- Keep existing GitHub browsing endpoints read-only; the selector materialization path is separate from browsing and does not replace Chrome extension `start-from-github` behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: Expands the top-bar timer task-picker requirement so selector options include workspace-local visible choices and connected-user GitHub-backed project/issue choices, while preserving disconnected and manual task-creation behavior.
- `contracts`: Adds shared request/response contracts for resolving a connected-user GitHub issue selection into a local timer task context.
- `time-tracking-api`: Adds backend behavior for materializing a connected-user GitHub issue selection into a visible local project/task target without starting, stopping, or updating a timer.

## Impact

- Affected docs: `docs/ui/pages-user.md` and `docs/ui/patterns.md`.
- Affected spec: `openspec/specs/user-pages/spec.md` through this change's delta spec.
- Affected app: `apps/user-web`, especially top-bar timer task-picker components, composables, clients, and focused tests.
- Affected backend/shared areas: `packages/shared/src/contracts`, `apps/api/src/time-entries` or the narrow timer-target service boundary, and OpenAPI export if the materialization route is added.
- Related existing APIs/specs: `github-data-browsing-api` already defines read-only GitHub browsing data used by the selector; this change consumes those concepts rather than redefining browsing.
- Out of scope: admin-web, Chrome extension timer behavior, GitHub write operations, background sync, database migrations, and changing manual workspace-local project/task creation rules.
