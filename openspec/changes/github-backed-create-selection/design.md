## Context

Issue #217 asks for GitHub-backed name selection in two existing create flows: `user-web` task creation and `admin-web` project creation. The backend already exposes read-only GitHub browsing endpoints for owners, repositories, Projects V2, repository issues, and Project V2 issue items, and the data model already stores provider references separately from core project/task rows.

Current gaps:

- `apps/user-web/src/components/projects/ProjectTaskDialog.vue` creates tasks from a selected local project and free-text title only.
- `apps/admin-web/src/views/AddProjectView.vue` creates projects from manual input only and displays `Source = Manual` as static text.
- `apps/user-web/src/services/profile-github-client.ts` owns only GitHub connection/auth status and should not become the shared browsing client for both SPAs.
- `packages/shared` project/task create schemas currently reject provider reference metadata.

## Goals / Non-Goals

**Goals:**

- Let connected GitHub users choose GitHub-backed project candidates in the admin Add Project flow using predictive search.
- Let connected GitHub users choose GitHub-backed task candidates in the user task create dialog using predictive search for the selected GitHub-backed scope.
- Preserve existing manual creation behavior for disconnected users and non-GitHub work.
- Persist GitHub provider references through shared create contracts and backend services when a GitHub option is selected.
- Keep GitHub browsing read-only; local create endpoints are the only persistence boundary.
- Share frontend GitHub browsing fetch-boundary code where both SPAs need the same behavior.

**Non-Goals:**

- Do not implement bulk import, background sync, or periodic GitHub synchronization.
- Do not create GitHub records from GiTiempo.
- Do not remove manual project or task creation.
- Do not change GitHub OAuth behavior, token storage, or connection lifecycle.
- Do not create local records when the user only browses GitHub candidates.

## Decisions

### 1. Use existing GitHub browsing endpoints as candidate sources

The UI will fetch GitHub owners and then browse repositories, Projects V2, repository issues, or Project V2 issue items through the existing `/github/*` browsing endpoints. Candidate lists remain read-only until the user submits a local create form.

Rationale: browsing endpoints already enforce connected-account requirements and safe provider normalization. Reusing them avoids adding separate GitHub search APIs before the current provider surface proves insufficient.

Alternatives considered:

- Add new create-flow-specific browse endpoints. Rejected because it duplicates existing endpoint ownership and increases backend surface area without a new provider capability.
- Fetch GitHub directly from frontend. Rejected because token material must remain server-side.

### 2. Extend shared create contracts with optional GitHub reference metadata

Project and task create schemas should accept an optional provider-reference object only when creating from a GitHub candidate. Manual creates continue to send the same payloads they send today.

Project create references should identify whether the selected GitHub candidate is a repository or Project V2 item and include enough normalized metadata to create a project external reference: provider `github`, external type, external id or node id when available, external key, URL, and display metadata.

Task create references should identify whether the selected candidate came from a repository issue or Project V2 issue item and include enough normalized metadata to create a task external reference for the GitHub issue. The task title remains the local task name initialized from the selected issue title.

Rationale: shared contracts keep frontend payloads, backend DTOs, and OpenAPI aligned. Optional nested metadata preserves backward compatibility for manual creates.

Alternatives considered:

- Send only a GitHub URL and have the backend infer all metadata. Rejected because the current browsing response already returns normalized identity; URL parsing would be weaker and provider-specific.
- Store provider fields directly on project/task rows. Rejected because the data model already derives source from external reference records.

### 3. Backend create services own provider-reference persistence

`ProjectService` and `TasksService` should validate normal create authorization first, create the local project/task, and insert the external reference record in the same transaction when provider metadata is present. External reference uniqueness conflicts should become safe user-facing conflicts rather than duplicate local mappings.

Rationale: local create APIs are the persistence boundary and can enforce workspace, role, visibility, active-state, and uniqueness rules atomically.

Alternatives considered:

- Let frontend call a separate “link external reference” endpoint after create. Rejected because partial success would leave local records without expected source linkage.

### 4. Use one shared frontend GitHub browsing client boundary

Add a narrow browser/runtime GitHub browsing client under `packages/web-shared` or another neutral shared frontend location, then consume it from both `user-web` and `admin-web`. Keep profile connection/auth actions in the existing profile client or a separate domain-specific client so profile behavior does not become coupled to browse/search flows.

Rationale: both SPAs need the same request paths, auth handling, response parsing, and API error propagation for browsing. A shared fetch boundary prevents duplicated URL construction and response parsing.

Alternatives considered:

- Duplicate separate GitHub browsing clients in both apps. Rejected because the same provider browse endpoints and response schemas would drift.
- Expand `profile-github-client.ts` into a general client. Rejected because profile connection behavior and create-flow browsing are different frontend domains.

### 5. Keep create-flow UI state explicit and manual-first safe

Connected users see GitHub-backed candidate controls with loading, empty, request-error, and disconnected states. Disconnected users see the manual path without broken controls. Selecting a GitHub option populates the local name/title while keeping a visible source indication. Clearing or choosing manual removes provider metadata from the pending create payload.

Rationale: create forms must remain useful for non-GitHub work and disconnected accounts. Explicit states avoid treating failed GitHub loads as empty manual data.

Alternatives considered:

- Hide manual title/name fields after selecting GitHub. Rejected because users still need clear local names and editable manual fallback.

## Risks / Trade-offs

- [Risk] GitHub Projects V2 and repository issues have different identity shapes. → Mitigation: normalize UI candidate models per selection type and map them into explicit project/task provider-reference payloads.
- [Risk] External reference uniqueness conflicts can surprise users if a GitHub item is already linked. → Mitigation: surface conflict errors and refresh local project/task data without creating duplicate mappings.
- [Risk] GitHub browsing can be slow or paginated. → Mitigation: use predictive search with loading, empty, request-error, and pagination or incremental fetch states; do not block manual entry.
- [Risk] Shared browsing client could become a generic transport escape hatch. → Mitigation: expose domain-specific GitHub browsing methods, not low-level request helpers.
- [Risk] Frontend specs and approved designs may not yet show the new candidate controls. → Mitigation: preserve the existing form hierarchy, use PrimeVue predictive selectors, and document any design deltas during implementation.

## Migration Plan

1. Extend shared contracts for optional provider-reference metadata and add contract tests.
2. Update backend DTOs/services to persist project/task external references in create transactions.
3. Regenerate OpenAPI through the supported repository workflow after DTO changes.
4. Add shared frontend GitHub browsing client tests and consume the client from both SPAs.
5. Update `admin-web` Add Project and `user-web` task create flows with connected/disconnected/loading/empty/error states.
6. Deploy as a backward-compatible API extension; existing manual create clients continue to work because provider metadata is optional.

Rollback strategy: frontend changes can be disabled by hiding GitHub candidate controls while keeping manual create payloads. Backend extensions are additive and can continue accepting manual payloads.

## Open Questions

- Should admin Add Project offer both repositories and Projects V2 as first-class project candidates, or prioritize repositories first and expose Projects V2 behind a source/scope selector?
- For user task creation, should Project V2 issue candidates be available only when the selected local project has a GitHub Project V2 reference, or also through an explicit GitHub scope selector in the dialog?
- If a selected GitHub issue is closed, should task creation allow a closed local task or force open-only candidates for create flows?
