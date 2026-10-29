# Implementation preparation

Prepared 2026-10-13 for tasks 1.1–1.4; revised the same day following the user's instruction to reuse existing views with `External` tags and contextual own-time help. Scope: source/rules inspection, baseline reconciliation, and design preparation. Application implementation, migrations, publication, and tasks 2–9 remain pending.

## Reviewed guidance and evidence boundaries

- Reviewed root and affected API, user-web, admin-web, chrome-ext, landing-web, and web-shared agent guidance; frontend/landing skills; UI index and relevant extension, user/admin, landing, layout, accessibility, component, and pattern guidance.
- Inspected current source and change specifications. The root note that chrome-ext is a placeholder is stale: the application exists; use its manifest, source, and local guidance.
- Codebase-memory graph tools were unavailable in this session. The following is a targeted source-inspection map, not a claim of exhaustive graph coverage. No application code changed, so no re-index was required.
- [Design parity and frame inventory](design-parity.md) records the preparation deliverable. These designs are review drafts; frontend implementation still requires design approval.

## Authorization caller map

Paths below are relative to the repository root. Method names identify the inspected call sites without depending on changing line numbers.

| Surface | Current caller / authorization path | Required implementation boundary |
| --- | --- | --- |
| Project reads and summaries | `apps/api/src/projects/services/projects.service.ts`: `listProjects`, `getManagementSummary`, `getMySummary`, `getProject`, `requireVisibleProject`, `visibleNonAdminProjectCondition` | Resolve explicit project access separately from derived own-time access. Scope rows, counts, and completed durations before aggregation. Current project response selection and tracked summary include project-wide values. |
| Project edits and billing | Same service: `updateProject`, `backfillBillableDefault`, `requireProjectForUpdate` | PM update authorization delegates to visibility today. Broadening visibility alone would permit unintended writes. Require independent management authority. |
| Assignments | Same service: assignment list/create/remove methods | Preserve workspace/admin checks. Own-time responses must redact members, not expose assignment endpoints or infer a zero-member team. |
| Task lists and detail | `apps/api/src/tasks/services/tasks.service.ts`: `listProjectTasks`, `getTask`, `requireVisibleTask` | A visible project currently permits all tasks. Own-time must require an entry on each exact task, including running entries. Apply to direct identifiers as well as lists. |
| Task writes | Same service: `createTask`, `updateTask`, `backfillBillableDefault`, `deleteTask` | Current shared visibility helpers also guard writes. Separate write authority; closing tasks can stop all task timers, billing backfill touches all entries, and delete checks shared history. Hide UI controls and enforce server policy. |
| Provider browse/materialization | Same service: `listProjectGitHubIssues`, `ensureGitHubIssueTask` | Keep provider credentials and existing authorization. Own-time project visibility cannot permit sibling discovery or generic issue materialization. |
| Manual entries and moves | `apps/api/src/time-entries/services/time-entries.service.ts`: `createManualEntry`, `updateOwnEntry`; task service `requireTrackableTaskForUpdate` | Retain entry ownership and locking. Targets must already be authorized; generic manual entry creation/move cannot bootstrap a hidden task. |
| Entry reads | Time-entry service: `listOwnEntries`, `listProjectEntries`, `getOwnEntry` | Own listing already has a user predicate. Project listing currently grants visibility then queries the project: add own scope to rows and all totals/counts. Preserve owned-history rules separately. |
| Saved timer start | Time-entry service: `startTimer`, `createRunningEntry`, `requireTaskForTimerStart` | This is a separate locked membership/project/task/assignment path. Preserve managed GitHub assignment requirements; add only the external exact-task own-time exception. |
| GitHub timer start | Time-entry service: `startTimerFromGitHub` | Existing flow verifies installation/provider context before materialization and rechecks authority transactionally. Add reference routing without weakening this route or falling back after denial. |
| Stop/current timer | Time-entry service: current-timer and stop methods | Keep ownership, global running-timer uniqueness, conditional stop, and authoritative reconciliation independent of newly derived read visibility. |
| Shared identity | `apps/api/src/tasks/services/github-task-materialization.service.ts`: `findExistingIssueProject`, `findOrCreateProjectForRepo`, `findOrCreateTaskForIssue`, `resolveExistingProjectForIssue`, `resolveProjectForIssue` | Preserve hidden lookup: issue mapping before repository mapping. Coordinate case-insensitive identity, locks, post-lock rechecks, and conflict recovery. Never use the caller's visible project list or GitHub account as the deduplication boundary. |
| Imports | `apps/api/src/project-imports/services/project-imports.service.ts`: repository/board import paths, `importBoard`, `importOne` | Repository reuse must retain external policy/provenance. Board reassociation cannot take an external mapping, even inactive. Preserve managed import eligibility and provider checks. |
| Reports and exports | `apps/api/src/reports/services/reports.service.ts`: `getTimeReport`, `buildQueryContext`, `renderPdfDocument`; `saved-reports.service.ts`: role guard | Preserve admin/PM role and existing project rights. Own-time is not report authority. PDF rendering styles caller-provided report content rather than requerying; frontend export datasets must retain authorized report scope. Saved presets grant no additional access. |

The authoritative workspace comes from the authenticated session. Current controllers use `/projects` and `/projects/:projectId/tasks`; do not copy stale workspace-path examples into the new contract.

## Client consumers and invalidation

| Area | Inspected consumers | Preparation decision |
| --- | --- | --- |
| User projects | `apps/user-web/src/composables/projects/useProjectsData.ts`, `useProjectsSearch.ts`, `useProjectTaskDialog.ts`, `useProjectTaskMutations.ts` | Render only returned scope; gate every shared edit on capability. Search only authorized tasks. Invalidate project summaries, exact task data, and visible lists together. |
| Timer picker | `apps/user-web/src/composables/` timer `useTopBarTaskOptions`, task picker/actions/dialog flow and selection helpers | Provider issue options must not expand an own-time task set. Clear stale selections when derived visibility disappears. |
| Manual entry picker | Time-entry `useTimeEntryTaskOptions`, `useTimeEntryMutations` | Apply the same scope and prohibit provider sibling expansion. Entry deletion/move invalidates derived project/task visibility, not just history. |
| Dashboard/history | Dashboard overview, time-entry data and repeat-start consumers | Preserve own history and conditional stop. Repeat-start uses current exact-task authority; refresh after navigation/refocus and extension changes. |
| Admin | Admin project data/edit actions, report rows/options and report-data helpers | Keep full admin scope and existing PM grants. Do not turn own-time into management or report options. No feature enablement setting. |
| Extension | `apps/chrome-ext/src/lib/api.ts`, `runtime.ts`, `github-context.ts`, background, popup and content entry points | Current request sends repository/issue number. Future reference request adds current issue title and canonical direct URL from either supported surface. Runtime workspace must belong to the current session. One Start action; refresh authoritative timer after conflict/lost response. |
| Shared contracts | `packages/shared` response/request schemas and SPA clients | Add explicit scope/capability and response validation. Own-time uses `members: []`, `assignedMembersSummary: null`, no `memberCount`, and personal completed durations. Running entries grant visibility but do not become completed duration. |

## Canonical baseline review

Archived artifacts were inspected and left unchanged. Requirement bodies were compared after whitespace normalization.

| 2026-10-12 archive | Evidence | Preserve / apply |
| --- | --- | --- |
| `require-project-assignment-for-saved-github-timers` | Both requirement titles exist in canonical specs. `Saved GitHub Task Starts Require Project Authorization Across Connection States` matches. The general start requirement has two less-qualified canonical preconditions for inactive project / closed task scenarios. | The present delta already restores authorization-qualified scenario preconditions and defines the external exception. Preserve managed assignment checks across connected/disconnected states; do not rewrite the archive. |
| `unify-github-oauth-account-linking` | 25 requirement bodies match across nine domains. | Keep GiTiempo sign-in, personal OAuth identity, personal App credentials, and workspace installations separate. External reference tracking requires none of the personal GitHub credentials. Existing import and installation-setup authority remains unchanged. |
| `prepare-chrome-web-store-privacy` | Seven requirement bodies match: three extension and four public-landing requirements. | Keep logout cleanup and candidate-specific release evidence. Apply the new title/URL payload, managed retrieval versus external recording, and scoped-sharing disclosure before distribution. Historical Store handoff does not certify a new package. |

OAuth baseline details: personal OAuth uses `user:email`, `read:org`, `read:project`; it is separate from personal App data access. Disconnect removes personal identity/credentials after checking alternative sign-in while preserving sessions, installations, policies, and history. Workspace installation linking requires active workspace-admin authority and verified GitHub/App context; setup failures must not become external-tracking prerequisites.

## Document reconciliation for task 8.1 / 8.2

The approved proposal deliberately changes the external-reference branch. Existing managed-only prose is therefore an identified update target, not authority to widen managed behavior:

- ADR 009 and existing product/API documentation describe installation-backed starts; distinguish the new reference route and stored policy.
- Current project/task UI guidance assumes broader task editing in visible projects; document capability-gated own-time surfaces using the design inventory.
- `apps/landing-web/src/pages/privacy.astro` currently says titles/full URLs are not transmitted and describes backend retrieval. Update that text to match the four-field reference payload and managed/external distinction before extension distribution.
- Privacy designs are focused disclosure excerpts, not a complete replacement policy. Preserve unrelated recipients, limited-use, retention, security and contact sections; verify the actual policy date at release.
- Canonical specification synchronization, public policy deployment, new package version/hash, and publisher-owned Store submission are later release work. None was performed here.

## Implementation guardrails confirmed

- External tracking is default-on for active workspace members. No personal workspace, GitHub-link prerequisite, admin toggle, or extension workspace switcher.
- New external projects remain private. Hidden mapping reuse is server-side and atomic with a successful own timer; no automatic assignment.
- Own-time grants exact-task personal reads only. Admin/explicit project grants remain independent. Shared mutations and peer metadata stay restricted.
- Reference data is untrusted plain text, not provider verification. Incoming titles never overwrite existing shared metadata.
- Managed denial cannot create a duplicate, select an alternate route, or change tracking policy.
- Last-own-entry deletion/move removes derived visibility. Existing ownership rules continue to govern history and stopping.
- Rename/transfer recognition, merging, rebinding, and policy conversion remain deferred.

## Verification

The original 18-frame exploration was superseded by the user's simpler presentation decision. Eight standalone external/own-time web mockups were removed from the live canvas. Existing Projects desktop/mobile roots were updated in place with tags and contextual help. The current 12-page PDF contains those two existing views and the ten retained extension/privacy review states. See the revised design inventory for scope and save status. No separate external web views are planned.

Verification passed: `openspec validate external-github-extension-tracking --strict`, `git diff --check`, local documentation-link checks, and a task-scope assertion confirming exactly 1.1–1.4 checked (4/67 total). The OpenSpec command emitted an existing workspace/node_modules synchronization warning but completed successfully.

Application tests were not run for these design/documentation-only edits. Product behavior and runtime accessibility remain implementation/QA work.
