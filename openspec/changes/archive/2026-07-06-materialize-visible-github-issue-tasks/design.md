## Context

The current branch already implements a two-step GitHub-backed task-selection flow across `apps/api`, `packages/shared`, and `apps/user-web`:

- `GET /projects/:projectId/github/issues` browses repository issues for a visible local GitHub-backed project.
- `POST /tasks/from-github` creates or reuses a local task from a selected issue inside that visible project.
- The user-web top-bar timer picker and Time Entries dialog append unsynced GitHub issues alongside visible local tasks.

That behavior spans the nearest backend guidance in `apps/api/AGENTS.md`, the user-web guidance in `apps/user-web/AGENTS.md`, and the frontend rules in `.agents/skills/gitiempo-frontend-rules/SKILL.md`. The contract needs to preserve the existing GitHub auth model: user-to-server GitHub browsing remains provider-backed, while workspace/org policy stays a visibility filter rather than a new auth boundary.

## Goals / Non-Goals

**Goals:**

- Describe the already-implemented branch behavior as an active OpenSpec change instead of silently updating canonical specs.
- Keep GitHub browsing read-only until a separate explicit task-materialization request is made.
- Define a narrow materialization request shape that trusts the local project mapping plus issue number, not client-supplied repository or title fields.
- Keep frontend picker/dialog empty and request-failure states distinct for GitHub-backed project issue suggestions.

**Non-Goals:**

- Do not change the GitHub OAuth or workspace-organization allow-list model.
- Do not add freeform GitHub repository selection to the timer or manual-entry dialogs.
- Do not add timer creation directly to browsing endpoints.
- Do not introduce a second task response shape just for GitHub-backed tasks.

## Decisions

1. Treat local-project-scoped issue loading as GitHub browsing, not mutation.

   `GET /projects/:projectId/github/issues` resolves the canonical GitHub repository from the visible local project mapping, then returns normalized GitHub issue data through the existing browsing contracts. This keeps browsing read-only and avoids conflating suggestion loading with local persistence.

   Alternative considered: materialize tasks during issue listing. Rejected because it would violate the existing read-only browsing boundary and create local records for issues the user only inspected.

2. Materialize tasks from `projectId + issueNumber` only.

   `POST /tasks/from-github` should derive the repository from the visible local project and re-read the authoritative issue from GitHub before creating or reusing a task. This keeps client payloads small and prevents the UI from inventing repository or title data.

   Alternative considered: accept `githubRepo` and `issueTitle` from the user-web picker. Rejected because those fields are stale-prone and duplicate server-owned mapping logic.

3. Reuse the standard task response and existing tracking eligibility rules.

   Materialized GitHub tasks should return the normal task response shape, inherit billable defaults from the selected local project, and stay subject to the same active/open visibility rules as other tracking targets.

   Alternative considered: add a dedicated GitHub-task response or tracking exception path. Rejected because it would split task ownership rules and raise support cost across API and frontend layers.

4. Keep GitHub suggestion loading shared and status-aware in user-web.

   The timer and Time Entries surfaces should reuse one suggestion loader that deduplicates already-synced issues, distinguishes request failure from true empty results, and only caches successful suggestion loads. This avoids agent-introduced divergence between the two picker flows.

   Alternative considered: keep separate silent fallback logic per surface. Rejected because it hides GitHub request failures and makes future picker behavior drift more likely.

## Risks / Trade-offs

- [Risk] GitHub issue suggestions can become stale between browse and materialize. -> Mitigation: `POST /tasks/from-github` re-reads the authoritative issue before creating or reusing the local task.
- [Risk] Project-scoped issue browsing could look like task mutation if docs are vague. -> Mitigation: keep a separate read-only browsing requirement and a separate explicit materialization requirement.
- [Risk] Picker flows may cache local-only fallback results and suppress later GitHub retries. -> Mitigation: cache suggestion-expanded options only after successful GitHub suggestion loads.
- [Risk] Active specs may still lag behind docs until this change is applied or archived. -> Mitigation: keep this proposal on the branch and validate it before canonical sync.
