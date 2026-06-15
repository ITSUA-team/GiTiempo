## Context

GitHub issue #207 updates the user-web top-bar timer task picker from workspace-only `Project -> Task` selection to selector data that also includes GitHub-backed project and issue choices visible to the connected GitHub user. Existing read-only GitHub browsing endpoints already expose connected-user owners, repositories, Projects V2, repository issues, and Project V2 issue items. The current picker implementation in `apps/user-web` loads only `GET /projects` and `GET /projects/:id/tasks`, then appends the `New task` sentinel as the last task option.

The approved UI source is `GITiempo.pen`, frame `Top-Bar Timer Task Picker` (`LKDTn`), with idle dialog `ecXQx` and running dialog `sNkdj`. The frame keeps the field order `Project`, `Task`, conditional `New task title`, `Description`, then actions. Implementation must preserve this structure, PrimeVue `<Dialog>` and `<AutoComplete>` usage, and the mobile/full-width action behavior already documented in `docs/ui/pages-user.md` and `docs/ui/patterns.md`.

The main coordination issue is that GitHub browsing responses are read-only candidates, while existing timer start and running-entry update flows require a concrete local `taskId`. A selected GitHub issue therefore needs a narrow materialization step that creates or reuses the local provider-neutral project/task mapping before the timer mutation runs.

Planned file groups:

- `docs/ui`: update user-page and selector-pattern requirements for connected GitHub options, source precedence, disconnected fallback, and `New task` ordering.
- `packages/shared`: add a small contract for GitHub issue timer-target materialization request/response, reusing existing GitHub issue and project/task response shapes where practical.
- `apps/api`: add backend materialization behavior near the time-entry/timer target boundary, reusing existing GitHub connection, external-ref, and task visibility logic.
- `apps/user-web`: add a GitHub browsing/materialization client path, extend top-bar task-picker state and option rendering, and cover connected/disconnected/source-precedence behavior with focused tests.

## Goals / Non-Goals

**Goals:**

- Include workspace-local visible projects/tasks and connected-user GitHub-backed repository, Project V2, and issue candidates in the top-bar timer task-picker flow.
- Keep disconnected users on the current workspace-local selector behavior without showing GitHub-specific errors as empty workspace data.
- Keep `New task` as the last task option and keep manual task creation inside the selected visible workspace-local project.
- Resolve a selected GitHub issue candidate to a local project/task target before start-timer or running-entry update mutations so description handling and existing timer behavior remain intact.
- Preserve the existing task-picker popup visual structure, field order, loading/error distinctions, toast behavior, and mobile usability.

**Non-Goals:**

- No GitHub write operations, background sync, webhook ingestion, or database migrations.
- No replacement of the existing workspace-local project/task APIs.
- No admin-web or Chrome extension UI changes.
- No change to read-only GitHub browsing endpoint semantics.
- No new-project creation option in the top-bar timer dialog.

## Decisions

### Use a union option model instead of forcing GitHub data into project/task response shapes

The picker should model project options as workspace projects or GitHub browsing sources, and task options as workspace tasks, GitHub issue candidates, or the existing `New task` sentinel. This avoids fake UUIDs, keeps source-specific labels and metadata available, and lets the component render provider hints or external-link affordances without mutating shared API response types.

Alternative considered: coerce GitHub repositories/projects/issues into `ProjectResponse` and `TaskResponse` objects in the frontend. Rejected because these objects imply local IDs and visibility semantics that do not exist until materialization succeeds.

### Workspace-local options stay first; GitHub options are additive

For the project dropdown, load visible workspace projects first and append connected GitHub sources after them. For a selected workspace project, the task dropdown lists that project's active open visible tasks first and appends `New task` last. For a selected GitHub source, the task dropdown lists GitHub issue candidates for that source and does not offer manual `New task` creation inside the GitHub source, because manual task creation remains scoped to existing visible workspace projects.

Alternative considered: merge all project and task candidates alphabetically. Rejected because it would obscure current workspace-local behavior and make data-source precedence hard to explain.

### Treat disconnected GitHub as an optional data source, not a selector failure

The user-web picker should check GitHub connection state or handle GitHub browsing `404`/not-connected responses so disconnected users keep the existing visible workspace project/task flow. GitHub loading or request failures should be shown as GitHub-specific option-source feedback or toast detail, not as `No existing active tasks in this project` messaging.

Alternative considered: fail the whole dialog when GitHub browsing fails. Rejected because acceptance criteria require selector behavior to remain valid without a connected GitHub account.

### Materialize GitHub issue candidates before timer mutations

Add a narrow backend/shared contract that accepts a selected GitHub issue candidate from the connected-user selector flow and returns the local project/task context to use for timer mutations. The backend should require an authenticated active workspace member, require a usable connected GitHub account, verify that the issue is visible through that connection, create or reuse the local provider-neutral project/task external refs, and return the resulting local `ProjectResponse`/`TaskResponse` context without starting, stopping, or updating a timer.

The user-web flow should call materialization only when the selected task option is a GitHub candidate. After materialization succeeds, the existing timer start path can use `POST /time-entries/timer/start` with the selected description, and the existing running-entry update path can use the returned local `taskId` with the current `PATCH /time-entries/:id` behavior.

Alternative considered: use `POST /time-entries/timer/start-from-github` from the web picker. Rejected because that route starts a timer immediately, uses extension source semantics, does not cover running timer reassignment, and currently does not carry the top-bar picker description.

### Existing local GitHub mappings win when the same issue is already known

When a GitHub issue candidate already maps to a local task in the workspace, materialization should return the existing visible local project/task context. This preserves one local task per GitHub issue external key and avoids duplicate tasks when the same issue is reachable through a repository and one or more GitHub Projects V2 sources.

Alternative considered: create a separate local task for every GitHub source that contains the issue. Rejected because `task_external_refs` already model a unique provider issue key in a workspace, and duplicate tasks would fragment time tracking.

## Risks / Trade-offs

- GitHub API rate limits during dropdown browsing -> load GitHub sources lazily, page bounded issue results, avoid auto-fetching every owner/source, and keep workspace-local options usable while GitHub data loads.
- Same issue appears under multiple GitHub sources -> materialization returns the existing local task mapping and the authoritative timer context may display the existing local project rather than the transient GitHub source label.
- GitHub Project V2 issue browsing can skip non-issue or inaccessible items -> render only real issue candidates and keep skipped-item behavior inside the existing browsing API response, not as local empty-task messaging.
- Backend materialization can fail after a GitHub candidate was shown -> keep the dialog retryable, show one scoped inline/toast error, and do not clear the user's selection or description as if the mutation succeeded.
- Selector state becomes more complex -> keep source normalization in a focused composable or helper, and keep `TopBarTimerTaskDialog.vue` mostly presentational.
- Docs and `.pen` currently show workspace-only helper copy -> update copy to mention connected GitHub options without changing field order or action hierarchy.

## Migration Plan

1. Update docs and OpenSpec deltas for selector source behavior and GitHub issue materialization.
2. Add shared contracts and backend materialization tests before frontend consumption.
3. Add user-web GitHub browsing/materialization client methods with request/response parsing tests.
4. Extend top-bar task-picker option state, rendering, and timer-action flow.
5. Run shared, API, and user-web verification, then export OpenAPI if the backend route changes DTO output.

Rollback is additive: remove the materialization route/contracts and user-web GitHub option loading while leaving existing workspace-local task-picker behavior and GitHub browsing endpoints intact.

## Open Questions

- The exact route name for materialization can be chosen during implementation; prefer the existing time-entry/timer target boundary over adding mutation behavior to read-only GitHub browsing routes.
- If product wants the selected GitHub Project V2 board to remain the displayed local project even when the issue already has a repository-backed mapping, that requires a broader data-model decision and is out of scope for this focused selector change.
