## 1. Docs and implementation preparation

- [ ] 1.1 Read affected app AGENTS and UI guidance; map current project/task read, mutation, import, and report authorization callers before changing shared access helpers.
- [ ] 1.2 Reconcile the effective baseline with completed `require-project-assignment-for-saved-github-timers` and `unify-github-oauth-account-linking`. Preserve their code behavior; synchronize their canonical specs before archiving this delta, including the named saved-GitHub-task authorization requirement.
- [ ] 1.3 Inspect approved extension and user/admin screens, record parity checklists, and update needed workspace, context-loading, own-time, and capability states before UI implementation. Add no admin enablement toggle or Connect GitHub prerequisite.

## 2. Shared contracts

- [ ] 2.1 Define strict reference-start input validation for repository, positive safe issue number, bounded plain-text title, and matching canonical HTTPS issue URL; reject caller authority fields.
- [ ] 2.2 Define stored-mode and reference-provenance types plus project/task access scope and operation capabilities; keep client requests unable to change authority.
- [ ] 2.3 Extend response validation for own-time aggregates, empty members, and nullable assignedMembersSummary; keep memberCount absent and full-project values compatible.
- [ ] 2.4 Add focused contract checks for reference validation, scope-dependent responses, safe errors, and backward-compatible managed timer contracts.

## 3. API data and identity

- [ ] 3.1 Add persisted managed/external-reference project policy and reference provenance; backfill existing projects as managed and retain all existing access/billing/history.
- [ ] 3.2 Build a read-only case-collision preflight with actionable record identifiers. Prepare the case-insensitive GitHub repository-reference constraint; block conflicting migrations without deleting or silently merging history.
- [ ] 3.3 Adapt materializer namespace locks, lookup rechecks, unique-conflict recovery, and all import writers to the shared case-insensitive repository and issue identities.
- [ ] 3.4 Preserve external project mode and task ownership on repository reuse; reject board reassociation of external mappings, including inactive ones, without affecting managed import behavior.
- [ ] 3.5 Verify schema migration and concurrent reference/import identity behavior against an isolated database; preserve task-reference uniqueness and existing billing defaults.

## 4. API access and timer behavior

- [ ] 4.1 Implement reusable project/own-time/denied access resolution with exact-task own-entry existence, running entries included, and separate explicit admin/assignment authority.
- [ ] 4.2 Apply scoped reads and aggregates to project/task lists, detail, search, picker data, pagination, and own/project time-entry responses; redact peer metadata and totals.
- [ ] 4.3 Guard shared task/project mutations, creation, assignments, and billing operations against own-time-only access; keep manual own-entry creation/moves limited to already authorized targets.
- [ ] 4.4 Add the reference-start controller/service path with authoritative session workspace, fresh membership/role checks, managed-route delegation, and no client-controlled fallback or mode conversion.
- [ ] 4.5 Implement atomic external first-start materialization for hidden or missing mappings; preserve local active/open rules, source, billing, global timer conflict, and rollback on denied/conflicting starts.
- [ ] 4.6 Update saved-task starts to permit authorized external own-time repeats without assignment/GitHub link while retaining managed GitHub assignment checks; reject stale hidden task identifiers.
- [ ] 4.7 Ensure deleting or moving the last own entry changes derived visibility without deleting shared records; keep conditional owned stop/history available under their existing authorization.
- [ ] 4.8 Expose authenticated workspace context and operation capabilities needed by clients using existing narrow response surfaces where suitable; do not disclose hidden mappings during preflight.
- [ ] 4.9 Preserve reporting endpoint eligibility: admins keep full scope, PMs require existing report/project rights, members remain denied; own-time access alone does not enlarge management reports or exports.
- [ ] 4.10 Add focused API regressions for two-member hidden reuse, exact-task reads, direct-route/aggregate leaks, shared-mutation denial, deletion/reassignment, membership races, managed denials, disconnect independence, timer conflicts, and billing/history preservation.

## 5. Extension

- [ ] 5.1 Build canonical direct issue URLs for direct pages and Projects panes; require current issue-specific DOM title and handle delayed/stale context without persisting a board title.
- [ ] 5.2 Send full issue context through the shared reference-start request from popup and injected controls; retain one Start action and no alternate-path retry after managed/provider denial.
- [ ] 5.3 Carry session-bound workspace context/capabilities in runtime state and show the destination; retain authentication, current-timer reconciliation, owned conditional stop, and safe error states.
- [ ] 5.4 Add extension checks for both issue surfaces, absent GitHub link/App, invalid/stale context, wrong-workspace snapshots, denied managed targets, duplicate clicks, lost responses, and matching-issue stop.
- [ ] 5.5 Run Chrome extension typecheck/tests/build and browser smoke in Chrome and Firefox, including a permitted private customer issue without App/API access and a Projects issue pane.

## 6. User-web

- [ ] 6.1 Consume scoped contracts in project/task clients and render only returned projects/tasks, personal totals, and permitted source context; gate all shared-task controls on server capabilities.
- [ ] 6.2 Update Projects, top-bar pickers, manual-entry selectors, Dashboard/history repeat starts, and direct routes to preserve own-time scope without fetching hidden siblings.
- [ ] 6.3 Invalidate affected project/task/detail/picker state after start/delete/move and refresh on navigation/refocus for extension or other-tab changes; clear stale wider-scope data and selections.
- [ ] 6.4 Verify running-entry visibility, final-entry disappearance, stale direct routes, safe repeat starts, and no peer data or management controls across desktop/mobile approved states.
- [ ] 6.5 Run user-web verification required by app AGENTS and shared-contract changes; capture browser evidence for both own-time and explicit project access.

## 7. Admin-web and shared frontend compatibility

- [ ] 7.1 Adapt affected contract consumers without adding an enablement setting; retain full admin project/report visibility and assigned PM management scope.
- [ ] 7.2 Verify admin/PM project details, member summaries, reports, and existing import conflict handling with managed and external-reference records.
- [ ] 7.3 Run admin-web verification required by its AGENTS; if shared browser/auth/runtime leaves change, verify both SPA suites and keep shared code within its existing ownership boundaries.

## 8. Docs and release verification

- [ ] 8.1 Update ADR 009, API/data-model/product and UI documentation to distinguish reference recording from installation-backed tracking; preserve separate authentication and import requirements.
- [ ] 8.2 Update extension collection descriptions consistently with `prepare-chrome-web-store-privacy`, without duplicating its publishing work; document the deferred rename/transfer and conversion limits.
- [ ] 8.3 Regenerate OpenAPI using the supported repository workflow and verify contracts, source-policy compatibility, and no secret exposure.
- [ ] 8.4 Run targeted tests followed by required lint, typecheck, build, and isolated API e2e checks for touched areas; record results and any validation gaps once, without redundant repeats.
- [ ] 8.5 Verify migration/rollback and release ordering: access-safe API/contracts and SPA consumers before extension distribution, default-on behavior, preserved records/owned stopping, and no downgrade that loses external policy enforcement.
- [ ] 8.6 Reconcile overlapping canonical specs in dependency order, validate the final OpenSpec change, and collect completion evidence before later archival. Leave every implementation task unchecked until supported by actual execution evidence.
