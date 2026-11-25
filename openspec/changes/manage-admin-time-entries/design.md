# Design

## Context

The existing personal endpoints bind entry ownership to the signed-in user. The team list at `GET /projects/:id/time-entries` uses project read visibility, which includes cases where a PM has no assignment. The management page needs a distinct authorization decision for both its lookups and its writes. See [the proposal](proposal.md) for product scope.

## API and shared contracts

Add a management controller in `apps/api/src/time-entries`. Follow `apps/api/AGENTS.md`. Publish strict Zod contracts from `packages/shared/src/contracts` and export the corresponding DTOs to `packages/shared/openapi.json`. Paths below are relative to `/api`. In the table, `P` expands to `/management/projects/:projectId`.

| Method and path | Input | Success |
| --- | --- | --- |
| GET `/management/projects` | page, limit | Manageable projects, including archived ones. Each option has id, name, isActive. |
| GET `P/time-entry-members` | purpose (filter or create), optional taskId for create, page, limit | Distinct owners with id, displayName and email. Filter uses entry history. Create lists current members eligible for the specified task, or for at least one task when omitted. |
| GET `P/time-entry-tasks` | optional userId, page, limit | With an owner, list that owner's trackable tasks and return whether the owner is a current workspace member explicitly assigned to this project, even for an empty page. Without an owner, list distinct tasks trackable by at least one current member. Each item includes id, title and defaultBillableForTimeEntries. |
| GET `P/time-entries` | page, limit, optional userId, search, dateFrom, dateTo | Shared time-entry list. Return running and invoice-linked rows alongside editable ones. |
| POST `P/time-entries` | Completed manual-entry body plus userId | 201 with the shared time-entry response. |
| PATCH `P/time-entries/:entryId` | Existing strict update fields plus optional projectId and userId. A change of project requires a destination taskId. The path identifies the source project. | 200 with the shared time-entry response. |
| DELETE `P/time-entries/:entryId` | No body | 204. |

All collections return `{ items, meta: { page, limit, total, totalPages } }` using the existing page defaults and limits. Fetch further options as needed so projects and people beyond page one are selectable. Sort options by display label then ID. Order records by descending start, creation time and ID. Reuse the time-entry service's escaped task-title search, date boundaries, row projection and positive-duration calculation. Add the member condition to both the row and count queries.

## Authorization and atomic writes

1. Resolve the authenticated user's current active membership in the session workspace. Require Admin or PM. For a PM, require a current assignment matching workspace, project and actor. Apply this scope to lookup queries, pagination counts, reads and writes, including both source and destination projects on reassignment. The invoice-view flag and public visibility grant no management rights. Return 401 for missing authentication, 403 for insufficient workspace role and 404 for an out-of-scope project, entry or destination task, without disclosing its state.
2. For create and any actual change to project, member or task, evaluate the resulting owner's current tracking eligibility. Bind the task to the destination project, require active work and an open task, and reuse the ordinary tracking rules, including exact-task participation for private external-reference work. Calculate eligibility using the resulting owner's membership. For an authorized project, reject an ineligible owner or closed or inactive work with 422. Recheck eligibility at save time. Record activity for the acting manager through the existing activity mechanism.
3. Check authorization and record state within the write transaction. Lock or serialize with changes to the relevant membership and assignments before committing. For PATCH and DELETE, select the entry by ID, workspace and source project, lock its row, then inspect `endedAt` and `invoiceId`. Return the specified 409 before changing any field. Apply reassignment by updating the existing owner and task together. The project is derived from the task. Invoice creation and revision already lock the affected time-entry rows. Use consistent ordering for locks spanning multiple projects and verify concurrent moves and invoice attachment against PostgreSQL. Removing an entry from an invoice releases the management restriction once the link is null.
4. For historical corrections, check the manager's current access and validate the merged interval. When the project, owner and task retain their original values, allow time, description and billable corrections on archived work or for a former member. Preserve the existing entry ID and source. Deletion uses the same management scope and record-state checks.

Extending the personal endpoints would make their owner checks and running-timer semantics depend on which client called them. A dedicated controller keeps the management policy explicit and lets both surfaces reuse the same data and validation. Existing tables and invoice links supply all required state.

## Admin web

Follow `apps/admin-web/AGENTS.md`, `docs/ui/INDEX.md` and the **Admin · Time Entries** frames in `GITiempo.pen` (desktop `te471_1069`, mobile `te471_1569`). Add the lazy route to `src/router`, the icon and accessible label to the shell, a typed client in `src/services`, and a route view with focused list and editor state. Use existing management table, mobile card, dialog, confirmation and error patterns.

- Open the first manageable project in display order. If none exists, show an empty project state. Changing project clears the old rows and member selection, resets pagination and closes the previous editor. Key queries by workspace, actor, project and filters. Discard stale responses when scope changes.
- Keep the create dialog's project independent of the sidebar, initialized to its selection. Load both pickers on open. A task selection scopes member options and a member selection scopes task options. Preserve a compatible selection. Project assignment grants all active, non-closed tasks, including tasks assigned to someone else or with no prior time by that member. Apply the existing public-project, admin and exact-task own-time access rules for other members.
- On a draft project change, clear the task immediately, preserve start, end and description, and use the owner-scoped lookup to check explicit assignment. Keep the member if assigned, including when the new project has no trackable tasks. Otherwise clear the member and load project-wide choices. Picking a new task sets its billable default. Key pending responses by the draft project and selections. Save against the draft project and keep the sidebar selection and filters intact.
- On edit, prefill the entry and reuse the project, member and task pickers. Offer active manageable destination projects and display the entry's initial project, member and task even when one is historical. Apply the same project switch rules as creation. Let the manager clear the member or task so they can select a different eligible pair in either order. Keep the current billable value while editing unless the manager explicitly changes it. On delete, ask for confirmation.
- Show the lock reason in each affected row or card. On a server conflict, show its message, keep the form contents available for review, and refetch the affected list. On an eligibility rejection, reload the destination choices and keep the rest of the draft. On 404, verify source and destination access before reconciling the form and list. Loss of destination access removes that choice and allows reselection if the source remains manageable. Loss of source access clears protected data and reloads the allowed projects. Keep empty filter results distinct from an empty project list and a failed request.
- Apply a date range only when confirmed. Keep the editor's pending state local to the action. After a successful mutation, keep the sidebar selection and filters, update the row in place if it still belongs on the current page, and reconcile affected lists, member filters and pagination when the entry changes project or falls out of the current view. Invalidate affected Reports and dashboard data for the workspace.

## Delivery and verification

Ship the additive contracts and API before enabling navigation in admin-web. Reverting the web route and navigation removes the client entry point independently of the API. The database needs no migration. Verify authorization, transactional conflicts and historical ownership against isolated PostgreSQL. Verify rendered desktop and mobile flows against the two frames, including keyboard access and a conflict after opening an editor.
