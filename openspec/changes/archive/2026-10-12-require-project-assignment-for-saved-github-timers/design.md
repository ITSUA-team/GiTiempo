## Context

The reported case is an ordinary member starting a previously saved GitHub issue after disconnecting their personal GitHub account, even though the issue's GiTiempo project is not assigned to them. Personal disconnect already clears credential material. Saved tasks and their provider references remain workspace records.

`TimeEntriesService.startTimer()` uses the existing-task path, which checks visibility and local task state. Public projects are visible without assignment. `startTimerFromGitHub()` instead verifies the workspace installation and requires ordinary-member project assignment, including public projects. The Projects row action and existing-task timer picker use the first path even for GitHub-linked tasks.

The implemented `workspace-github-installation-tracking` change remains unarchived. Its delta requires assignment for GitHub endpoint starts and explicitly permits assigned members without personal connections. ADR 009 has the same credential separation. This follow-up extends that assignment policy to saved-task starts; it does not reverse the ADR. The canonical existing-task requirement still permits public-project starts without distinguishing task providers.

## Goals / Non-Goals

**Goals:**

- Block ordinary-member starts of saved GitHub-linked tasks in unassigned projects, including public projects and all personal connection states.
- Keep assigned projects trackable after personal disconnect.
- Make server authorization independent of whether the request originates in Projects, the timer picker, a prior-entry action, or a direct API call.
- Preserve timer invariants, safe private-project denial, privileged roles, and ordinary manual-task access.

**Non-Goals:**

- Checking GitHub issue assignees or changing project visibility/listing rules.
- Deleting projects, tasks, history, or mappings during personal disconnect.
- Requiring a personal GitHub token or adding installation/API verification to the ordinary saved-task start path.
- Changing manual completed-entry creation, historical entry edits, or running-timer task reassignment. Those operations share task helpers today, so the new start-specific policy must not silently change them.
- Stopping existing timers automatically, changing admin/PM privileges, or redesigning UI.

## Decisions

### 1. Assignment is a property of the target, not the connection state

For ordinary members, a saved task linked to a GitHub issue requires assignment to its owning GiTiempo project. Check that assignment whether the personal connection is connected, disconnected, absent, or expired. This closes the reported disconnected case and matches the existing GitHub-start policy. A disconnect-only condition would give a personal reconnect the unintended power to bypass GiTiempo assignment.

Preserve the existing role rules: admins have implicit project access; PMs retain access to active public projects and assigned private projects. Use current membership, not stale role claims, when making the decision.

### 2. Use authoritative task linkage and constrain the new check to starts

Resolve the task within the current workspace, and inspect its stored GitHub issue reference. An external issue reference identifies a GitHub-linked task even if its parent has no repository reference, as with board imports. A manual task without a GitHub issue reference remains manual even inside a GitHub-backed project. Client hints, task titles, and URLs must not decide authorization.

Reuse existing data access and error definitions. Place the additional policy in the timer-start path or a narrowly named start-authorization helper. Do not change `requireTrackableTaskForUpdate()` globally without isolating callers for manual entries and task reassignment. Do not add a new dependency or generic authorization framework.

### 3. Enforce current authorization before writing

Apply the new check inside the timer creation transaction and coordinate lock order with existing membership/assignment mutation paths. An assignment removal completed before the authorization/write boundary must deny the start. Denial creates no time entry and leaves existing timers and task/reference records unchanged.

Preserve private-project non-disclosure: existing invisible private targets return 404. A visible public GitHub task lacking ordinary-member assignment returns HTTP 403 with `project_assignment_required` and its existing shared message. Never expose credentials or extra protected metadata.

### 4. Keep existing client requests and show the server result

User-web continues sending `taskId` to the ordinary start endpoint. Existing error presentation must display the assignment message and avoid successful-start feedback or a false running state. Assignment errors should direct the user to their workspace administrator or project manager. The existing shared message already provides that guidance; no new error code is required.

### Planned files by area

- **API** — follow `apps/api/AGENTS.md`: `src/time-entries/services/time-entries.service.ts`, focused service tests and `test/time-entries.e2e-spec.ts`; change task/project lookup helpers only as needed for a start-specific transactional check; annotate the ordinary start endpoint's error response in its controller.
- **User-web** — follow `apps/user-web/AGENTS.md`: verify Projects, top-bar existing-task, and prior-entry start actions. Add focused rejection coverage to the affected action tests. Any needed UI code edit must first follow the frontend skills, `docs/ui/INDEX.md`, relevant page/pattern guidance, and approved design rules.
- **Shared** — reuse `project_assignment_required`; update generated `packages/shared/openapi.json` if the ordinary endpoint's documented responses change. No request/success-schema change is planned.
- **Docs** — clarify saved GitHub-task starts in `docs/API-ENDPOINTS.md` and `docs/github-installations.md`; preserve ADR 009's personal-connection independence. Update user-facing guidance only where affected.
- **Admin-web / extension** — no planned implementation change; preserve existing access rules and extension start authorization.

## Risks / Trade-offs

- Existing public-project timer access narrows for saved GitHub tasks → make the change explicit in the spec and cover manual-task preservation.
- Shared task helpers serve other write operations → constrain the policy to timer starts and add regression coverage for unchanged callers.
- Stale selections or assignment removal can occur after the page loads → server-side checks at the write boundary remain authoritative.
- The parent installation change is implemented but not yet merged into canonical OpenSpec specs → archive/synchronize it before this follow-up; this follow-up modifies only the existing-task requirement and adds a distinct saved-task requirement.
- Manual entry creation and task reassignment are separate write paths outside this timer-start fix → do not describe this change as a universal prohibition on all time-entry mutations. Their policy requires a separate scoped decision if requested.

## Migration Plan

No data migration or personal-token cleanup is needed. Deploy the API authorization change with compatible error presentation and updated endpoint documentation. Existing records and running timers remain intact. Reverting the authorization change restores the previous permissive behavior for saved public-project GitHub tasks; it does not require a data rollback.

## Open Questions

None for this timer-start scope. The proposal preserves current admin/PM exceptions and applies ordinary-member assignment consistently across personal connection states, matching the existing GitHub start policy.
