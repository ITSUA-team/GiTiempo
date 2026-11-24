# Design

## Context

The existing personal endpoints bind entry ownership to the signed-in user. The team list at `GET /projects/:id/time-entries` uses project read visibility, which includes cases where a PM has no assignment. The management page needs a distinct authorization decision for both its lookups and its writes. See [the proposal](proposal.md) for product scope.

## API and shared contracts

Add a management controller in `apps/api/src/time-entries`. Follow `apps/api/AGENTS.md`. Publish strict Zod contracts from `packages/shared/src/contracts` and export the corresponding DTOs to `packages/shared/openapi.json`. Paths below are relative to `/api`. In the table, `P` expands to `/management/projects/:projectId`.

| Method and path | Input | Success |
| --- | --- | --- |
| GET `/management/projects` | page, limit | Manageable projects, including archived ones. Each option has id, name, isActive. |
| GET `P/time-entry-members` | purpose (filter or create), page, limit | Distinct owner options with id, displayName and email. Filter uses entry history. Create requires active membership and at least one currently trackable task in the project. |
| GET `P/time-entry-tasks` | userId, page, limit | Eligible destination tasks for this owner, each with id, title and defaultBillableForTimeEntries. |
| GET `P/time-entries` | page, limit, optional userId, search, dateFrom, dateTo | Shared time-entry list. Return running and invoice-linked rows alongside editable ones. |
| POST `P/time-entries` | Completed manual-entry body plus userId | 201 with the shared time-entry response. |
| PATCH `P/time-entries/:entryId` | Existing strict update fields | 200 with the shared time-entry response. |
| DELETE `P/time-entries/:entryId` | No body | 204. |

All collections return `{ items, meta: { page, limit, total, totalPages } }` using the existing page defaults and limits. Fetch further options as needed so projects and people beyond page one are selectable. Sort options by display label then ID. Order records by descending start, creation time and ID. Reuse the time-entry service's escaped task-title search, date boundaries, row projection and positive-duration calculation. Add the member condition to both the row and count queries.

## Authorization and atomic writes

1. Resolve the authenticated user's current active membership in the session workspace. Require Admin or PM. For a PM, require a current assignment matching workspace, project and actor. Apply this scope to lookup queries, pagination counts, reads and writes. The invoice-view flag and public visibility grant no management rights. Return 401 for missing authentication, 403 for insufficient workspace role and 404 for an out-of-scope project, entry or destination task, without disclosing its state.
2. For create and actual task changes, evaluate the owner's current tracking eligibility. Bind the task to the requested project, require active work and an open task, and reuse the ordinary tracking rules, including exact-task participation for private external-reference work. Use the owner's membership, never the manager's role, to calculate eligibility. For an authorized project, reject an ineligible owner or closed/inactive work with 422. A previously returned option grants no authority. Record activity for the acting manager through the existing activity mechanism.
3. Check authorization and record state within the write transaction. Lock or serialize with changes to the relevant membership and assignment before committing. For PATCH and DELETE, select the entry by ID, workspace and project, lock its row, then inspect `endedAt` and `invoiceId`. Return the specified 409 before changing any field. Invoice creation and revision already lock the affected time-entry rows. Use compatible lock ordering and verify both interleavings against PostgreSQL. Removing an entry from an invoice releases the management restriction once the link is null.
4. For historical corrections, check the manager's current access and validate the merged interval. A patch that retains the original task can correct time, description or billability on archived work or for a former member. Recheck owner eligibility only when a different task is selected. Keep the entry's source and owner. Deletion uses the same management scope and record-state checks.

Extending the personal endpoints would make their owner checks and running-timer semantics depend on which client called them. A dedicated controller keeps the management policy explicit and lets both surfaces reuse the same data and validation. Existing tables and invoice links supply all required state.

## Admin web

Follow `apps/admin-web/AGENTS.md`, `docs/ui/INDEX.md` and the **Admin · Time Entries** frames in `GITiempo.pen` (desktop `te471_1069`, mobile `te471_1569`). Add the lazy route to `src/router`, the icon and accessible label to the shell, a typed client in `src/services`, and a route view with focused list and editor state. Use existing management table, mobile card, dialog, confirmation and error patterns.

- Open the first manageable project in display order. If none exists, show an empty project state. Changing project clears the old rows and member selection, resets pagination and closes the previous editor. Key queries by workspace, actor, project and filters. Discard stale responses when scope changes.
- On create, preselect the current project, select an eligible owner, then load that owner's tasks. Reset dependent fields when the owner changes. On edit, display the fixed owner and project and keep the original task visible even when it is no longer a valid destination. Prefill the interval, description and billable flag. On delete, ask for confirmation.
- Show the lock reason in each affected row or card. On a server conflict, show its message, keep the form contents available for review, and refetch the affected list. On an eligibility rejection, reload the owner's tasks and keep the rest of the draft. On 404, verify that the selected project is still manageable before discarding its data. If management access was lost, clear protected data and reload the allowed projects. Keep empty filter results distinct from an empty project list and a failed request.
- Apply a date range only when confirmed. Keep the editor's pending state local to the action. After a successful mutation, invalidate Reports and dashboard data in the workspace where the mutation ran while keeping the in-place update for the selected entry.

## Delivery and verification

Ship the additive contracts and API before enabling navigation in admin-web. Reverting the web route and navigation removes the client entry point independently of the API. The database needs no migration. Verify authorization, transactional conflicts and historical ownership against isolated PostgreSQL. Verify rendered desktop and mobile flows against the two frames, including keyboard access and a conflict after opening an editor.
