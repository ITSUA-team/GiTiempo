## 1. API

- [x] 1.1 Add failing regression coverage for an ordinary member starting a saved GitHub-linked task in an unassigned public project after personal disconnect; assert the exact assignment error and absence of writes.
- [x] 1.2 Add workspace-scoped stored-task GitHub linkage detection and a timer-start-specific assignment check using current membership and existing role rules, without broadening checks on manual-entry or reassignment callers.
- [x] 1.3 Enforce authorization within the timer creation transaction using a lock order compatible with membership and assignment changes; preserve private-target 404 behavior and existing timer invariants.
- [x] 1.4 Cover assigned public/private projects across connected, disconnected, absent, and expired personal states; missing assignment with a connected account; admin/PM cases; board-linked tasks; manual tasks inside GitHub-backed projects; and cross-workspace or removed-member denial.
- [x] 1.5 Add focused real-database coverage for saved-task starts after completed assignment removal, no writes on denial, successful assigned starts, and owned-timer stop after access loss. Preserve source, billing, description, task-state, and single-running-timer behavior.
- [x] 1.6 Run API lint, typecheck, unit tests, and the targeted isolated e2e scenarios following `apps/api/AGENTS.md`; record results and any environment limits.

## 2. User-web

- [x] 2.1 Add focused rejection coverage for Projects, existing-task top-bar, and prior-entry timer starts: display the assignment message, avoid successful-start feedback or false running state, and retain server-owned current-timer state.
- [x] 2.2 If existing error handling fails those scenarios, update only the affected actions following the frontend skills and required UI guidance; preserve request payloads and layouts.
- [x] 2.3 Run user-web lint, typecheck, and affected tests, and verify a disconnected member can start an assigned saved GitHub task while an unassigned public-project task is denied.

## 3. Shared API documentation

- [x] 3.1 Reuse the existing `project_assignment_required` code and message; annotate the ordinary timer-start endpoint's 403 response and regenerate OpenAPI using the app-documented export path. Preserve timer input and success-response schemas.
- [x] 3.2 Verify the documented error response matches the actual safe API envelope and all affected clients can read it; run relevant shared contract checks if shared source changes become necessary.

## 4. Local manual testing

- [x] 4.1 Start the local API, user-web, and admin-web against an isolated local test database. Prepare a member, admin, and PM plus assigned/unassigned public/private projects, saved GitHub-linked tasks, a manual task, and a previous time entry. Record the initial assignments and connection state.
- [x] 4.2 As the member, disconnect GitHub through Profile and confirm the disconnected state persists after reload. Start saved GitHub tasks from Projects, the existing-task top-bar picker, and a prior time entry: assigned public/private projects must succeed; unassigned public projects must show the assignment error without a success toast or false running timer. Inspect the failed response and confirm no time entry was created.
- [x] 4.3 Verify an unassigned private task is unavailable in the UI and that submitting its saved identifier to the local API returns 404 without protected details or a new entry. Verify an unassigned public GitHub task is also denied while the personal GitHub account is connected.
- [x] 4.4 Leave a task selected in the member's browser, remove the project assignment in a separate admin session, and attempt to start without reloading: the server must deny the stale selection. Separately start an authorized timer, then disconnect GitHub and remove the assignment; confirm the owner can still stop that timer and its history remains available.
- [x] 4.5 Check preserved behavior locally: an unassigned member can start an eligible manual task in a public project, including a GitHub-backed project; admin and PM access follows the documented exceptions. Stop each successful timer before the next case and confirm duration, description, and billing behavior remain correct.
- [x] 4.6 With the development extension configured to use the local API and a verified test installation, start from a GitHub issue page as a disconnected member: an assigned GiTiempo project must succeed even without GitHub issue assignment; an unassigned project must be denied. Compare the result with starting the same saved task in user-web.
- [x] 4.7 Record local manual results in this change's verification evidence: tested revision, local services, role/assignment/connection state, surface, expected versus actual result, and relevant screenshots or safe response details. Record unavailable GitHub/extension prerequisites as unverified cases rather than passes; stop test timers and clean up only fixtures created for this run.

## 5. Docs and specification completion

- [x] 5.1 Update `docs/API-ENDPOINTS.md` and `docs/github-installations.md` to distinguish saved GitHub-task assignment from personal credentials, project visibility, and GitHub issue assignee status; preserve assigned-member access after disconnect and ADR 009.
- [x] 5.2 Review the final diff for accidental changes to manual entries, historical edits, running-task reassignment, global visibility, privileged roles, and existing stop behavior; record any out-of-scope findings separately.
- [x] 5.3 Validate this change with OpenSpec strict validation and record implementation verification evidence. When archiving, first synchronize the implemented `workspace-github-installation-tracking` predecessor, then merge this change's existing-task requirement and saved-task scenarios into the canonical `time-tracking-api` spec.
