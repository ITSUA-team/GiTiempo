## Why

Workspace members need to record time on customers' GitHub issues even when those customers do not add their organizations to GiTiempo or install its GitHub App. The extension already sees issue context, but installation verification and pre-existing project mappings currently prevent this workflow.

## What Changes

- Enable external issue tracking by default for authenticated GiTiempo workspace members, without an administrator toggle, personal GitHub link, organization allow-list entry, or GitHub App installation.
- Accept minimal issue context from the extension as user-supplied reference data, without reading private GitHub resources or claiming provider verification.
- Reuse one repository project and one issue task per workspace, including when another member cannot yet see them; create missing records atomically with the first successful timer start.
- **BREAKING:** Introduce a narrowly scoped external-reference project access policy: members without separate project rights see a project only while they have their own time in it, and see only tasks containing their own time. Running entries count immediately; deleting or moving the last own entry removes that derived visibility.
- Keep new external projects private. Own-time visibility grants neither access to colleagues' records nor shared task/project management. Administrators retain full workspace access; PMs and explicitly authorized members retain only their separately granted scope.
- Preserve existing authorization for managed/imported projects; an access denial cannot create a duplicate or silently change the project's policy. Preserve timer concurrency, billing defaults, owned stopping, and history.
- Coordinate popup, injected controls, web lists, pickers, detail endpoints, summaries, and repeat-start actions around the same server-enforced access rules.
- Defer repository rename/transfer recognition, rebinding, merging, and project policy conversion to later changes.

## Capabilities

### New Capabilities

- `external-github-tracking`: Default-on reference tracking, atomic shared identity resolution, own-time visibility, authorization boundaries, and lifecycle behavior.

### Modified Capabilities

- `time-tracking-api`: Distinguish reference starts from installation starts; permit authorized repeat starts and restrict own-time readers to their entries.
- `project-management`: Add own-time project visibility and scoped summaries while retaining explicit management rights and managed-project rules.
- `project-members-list`: Preserve full-project member lists while explicitly redacting own-time responses and hiding derived counts.
- `project-member-count`: Retire the obsolete scalar-count requirement in favor of the existing members-array contract and scoped rendering.
- `task-management`: Enforce task-level own-time reads and prevent derived project visibility from granting shared-task mutation.
- `chrome-extension`: Submit reliable issue context, display destination workspace, and offer one Start action without GitHub linking or installation setup for external targets.
- `public-landing-page`: Disclose transmitted issue title and canonical URL, distinguish reference recording from managed GitHub retrieval, and describe scoped sharing before distributing the updated extension.
- `user-projects-list-page`: Render only authorized projects/tasks, gate management controls, and refresh visibility after own-time changes.
- `user-pages`: Apply the same scoped data and repeat-start behavior to timer pickers, history, and dashboard actions.
- `data-model`: Persist external tracking policy and reference provenance; enforce case-insensitive repository identity.
- `contracts`: Add reference-start validation and explicit access-scope/capability responses without exposing restricted summaries.
- `workspace-github-installations`: Scope installation revocation requirements to installation-authorized tracking.
- `workspace-github-organization-policy`: Scope organization filters to provider-backed operations and exclude reference recording.

## Impact

- **Layers:** API/database, shared contracts/OpenAPI, Chrome/Firefox extension, user-web, admin-web compatibility/reporting verification, and landing-web privacy content. No new dependencies are planned.
- **Contracts/authentication:** Add a reference-start API and scoped project/task responses. GiTiempo authentication and membership remain mandatory; personal GitHub identity and credentials are not required for reference tracking. Existing provider-backed authentication remains intact.
- **Storage:** Add a persisted project tracking mode and reference provenance, default existing projects to managed behavior, and migrate repository-reference uniqueness after collision preflight. No automatic assignment or persistent participation grant is created by tracking.
- **Documentation/design:** Update ADR 009 and affected API, data-model, and UI guidance; inspect/update approved Pencil screens before implementation. Update public privacy disclosures and the candidate-specific collection inventory against the canonical requirements synchronized from archived `prepare-chrome-web-store-privacy`. Verify the deployed policy matches the new data flow before extension distribution; Store Dashboard changes and submission remain publisher-owned and outside this task.
- **Related changes:** `require-project-assignment-for-saved-github-timers` and `unify-github-oauth-account-linking` were archived and synchronized into canonical specs on 2026-10-12. Preserve their implemented managed authorization and account separation as the baseline for this delta. `prepare-chrome-web-store-privacy` was also archived and synchronized on that date; its historical package handoff does not certify the new reference-start payload.
- **Planning source:** `.omx/plans/github-extension-flexible-tracking.md`, incorporating the user's final decisions. No GitHub issue or parent issue was supplied. This change creates planning artifacts only.
