## Context

Projects, tasks, and time entries already carry the visibility and mutation boundaries needed for this change, but only time entries currently persist an `isBillable` value. Manual time-entry creation defaults missing `isBillable` to `true`, timer starts rely on the database `time_entries.is_billable` default, and tasks do not yet expose a default used by new entries. The approved UI docs require a project -> task -> time-entry inheritance chain and require existing-record propagation to happen only through a follow-up popup after the future default is already saved.

This change spans persistence, shared contracts, API services, admin project settings, user task management, the top-bar timer picker, and the manual time-entry dialog. Frontend implementation must follow `docs/ui/INDEX.md`, `docs/ui/pages-admin.md`, `docs/ui/pages-user.md`, `docs/ui/patterns.md`, and the relevant `GITiempo.pen` frames before editing UI code.

## Goals / Non-Goals

**Goals:**

- Persist a project default billable value for new tasks and a task default billable value for new time entries.
- Keep future-default saves independent from optional existing-record backfills.
- Provide explicit API contracts for project-level and task-level backfills, with counts returned for user feedback.
- Make backend defaults authoritative so frontend omissions, timer starts, extension-created tasks, and manual flows all converge on the same inheritance behavior.
- Update `admin-web` and `user-web` flows so checkbox defaults match the saved inheritance chain and follow-up dialogs match the approved copy and actions.

**Non-Goals:**

- No invoice, report, rate, or billing aggregation changes beyond existing time-entry `isBillable` effects.
- No new permission model for projects, tasks, or time entries.
- No bulk edit UI beyond the approved follow-up propagation popup.
- No separate "keep future defaults only" action inside the follow-up popup; dismissal is the no-backfill path.

## Decisions

### Store Defaults On Core Rows

Add `projects.default_task_billable` and `tasks.default_time_entry_billable` as non-null boolean columns with database defaults of `true`. Existing rows are backfilled to `true` to preserve current behavior where omitted entry billable values become billable.

Alternative considered: store defaults in a separate settings table. This adds joins and lifecycle complexity without a reusable settings model; the defaults are core project/task metadata and belong on the rows they describe.

### Use Explicit Contract Field Names

Expose project defaults as `defaultBillableForTasks` and task defaults as `defaultBillableForTimeEntries` in shared response and mutation contracts. Project create/update accepts optional `defaultBillableForTasks`; task create/update accepts optional `defaultBillableForTimeEntries`.

Alternative considered: generic `isBillableDefault`. That is shorter but ambiguous once both project and task defaults exist in the same UI flows.

### Keep Backfills Separate From PATCH Saves

`PATCH /projects/:id` saves `defaultBillableForTasks` for future tasks and returns the updated project. `PATCH /tasks/:id` saves `defaultBillableForTimeEntries` for future time entries and returns the updated task. Add separate non-destructive bulk endpoints:

- `POST /projects/:id/billable-default/backfill` with `{ updateTasks: boolean, updateTimeEntries: boolean }`, returning `{ tasksUpdated: number, timeEntriesUpdated: number }`.
- `POST /tasks/:id/billable-default/backfill` with `{ updateTimeEntries: true }`, returning `{ timeEntriesUpdated: number }`.

These endpoints read the already-saved default from the target project or task and apply it to selected downstream records. This prevents racey payloads where the follow-up popup could apply a stale draft value and keeps the UI rule clear: saving updates future defaults; the popup only backfills existing records.

Alternative considered: one PATCH body with propagation flags. That would blur the future-default save with existing-record mutation and would reintroduce the behavior the issue explicitly rejects.

### Backend Owns Inheritance Defaults

Task creation uses `input.defaultBillableForTimeEntries` when supplied, otherwise it copies `project.defaultBillableForTasks`. Manual time-entry creation uses `input.isBillable` when supplied, otherwise it copies `task.defaultBillableForTimeEntries`. Timer starts and extension-created time entries do not accept an entry-level billable override and copy `task.defaultBillableForTimeEntries` when inserting the running entry.

When the GitHub extension lazily creates a task, that task also copies the parent project's `defaultBillableForTasks`. A lazily created GitHub project uses the project column default of `true`, preserving current extension behavior unless a future sync flow chooses otherwise.

Alternative considered: rely on frontend always sending explicit values. Timer and extension flows have no billable field today, and contract omissions should remain safe, so backend inheritance must be authoritative.

### Backfill Scope Uses Workspace Visibility And Existing Mutability Rules

Project backfill authorization follows the same policy as project default update: admins can update workspace projects, PMs can update visible active projects, and members cannot update projects. Task backfill authorization follows the same visible task update policy as `PATCH /tasks/:id`.

Project backfill updates all tasks in the target workspace/project when `updateTasks` is true and all time entries linked through that project when `updateTimeEntries` is true. Task backfill updates all time entries linked to that task. These are explicit propagation operations and may update completed or running time-entry rows because their purpose is to backfill persisted existing records, not to edit an individual running timer interval.

Alternative considered: only update active tasks or completed time entries. That would leave hidden historical records in mixed states after the user chose "existing records" and would make the popup wording inaccurate.

### Frontend Detects Whether To Prompt Before Showing Follow-Up Dialogs

After a successful future-default save that changed the default value, the relevant page checks for downstream records before opening the follow-up popup. For project changes, the frontend can check `GET /projects/:id/tasks` for existing tasks and `GET /projects/:id/time-entries?limit=1` for existing time entries. For task changes, it can check `GET /projects/:projectId/time-entries?taskId=:taskId&limit=1`. If neither downstream record type exists, no popup is shown.

The follow-up popup uses PrimeVue `<Dialog>` as documented in `docs/ui/patterns.md`: project variant title `Update project billable default?`, task variant title `Update task billable default?`, checkbox choices for the relevant downstream records, dismissal leaves existing records unchanged, and the only footer primary action is `Update existing records`.

Alternative considered: add a dedicated impact-preview endpoint. Existing read endpoints can detect the required prompt condition with limit-1 checks, and avoiding another endpoint keeps the API surface smaller. If implementation finds these checks too expensive or semantically insufficient for inactive downstream records, add a small preview endpoint in the same service layer rather than overloading update responses.

## Planned File Changes

- `packages/shared`: update `contracts/projects.ts`, `contracts/tasks.ts`, `contracts/time-entries.ts` if needed for response/request typing, add backfill schemas and contract tests.
- `apps/api`: update Drizzle schemas, add a migration, update project/task/time-entry DTOs, controllers, services, unit tests, e2e tests, seed assumptions where relevant, and regenerate OpenAPI using the repository-supported workflow.
- `apps/admin-web`: update project clients, Add Project form, Projects row expansion form, follow-up project backfill dialog state, and related tests.
- `apps/user-web`: update task clients, `ProjectTaskDialog`, `TopBarTimerTaskDialog`, `TimeEntryDialog`, page/composable wiring, and related tests.
- Shared frontend extraction is optional and should only be used for a small reusable billable-default follow-up dialog if both SPAs share identical props/emits after implementation starts.

## Backend / Frontend Coordination

- Backend response contracts must expose project and task defaults before frontend checkbox initialization can be completed safely.
- Frontend create flows should seed checkbox state from loaded project/task defaults and still send the user's explicit override when a create form includes an entry-level billable checkbox.
- Timer start requests should not add `isBillable`; backend task-default inheritance owns the running-entry value.
- Existing-record popup state is driven by successful save responses and downstream-record checks, not by unsaved local form drafts.
- Toast feedback should use returned backfill counts when available and preserve existing request-error handling when a backfill fails.

## Risks / Trade-offs

- Backfilling large projects can update many rows -> keep updates set-based in SQL, return counts, and avoid per-row service loops.
- Prompt detection via existing list endpoints may miss inactive tasks because `GET /projects/:id/tasks` currently lists active tasks only -> implementation should verify whether the backend task list is sufficient; if inactive tasks must trigger prompts, add a focused impact-preview endpoint or backfill metadata query.
- Updating running time entries through bulk backfill differs from individual running-entry update rules -> document this as an explicit propagation path and cover it with service tests.
- Contract changes affect both SPAs and OpenAPI consumers -> update shared contracts first, regenerate DTO/OpenAPI artifacts, and run both frontend typechecks.
- UI docs and `.pen` may diverge during implementation -> follow docs as the source of truth and escalate only if the approved screen contradicts required behavior.

## Migration Plan

1. Add non-null `default_task_billable` to `projects` and `default_time_entry_billable` to `tasks`, each defaulting to `true` and backfilling existing rows.
2. Deploy backend contract and API changes before frontend depends on the new fields.
3. Update frontend flows to consume defaults and call backfill endpoints after saved default changes.
4. Rollback removes frontend usage first; backend columns with `true` defaults are safe to leave in place during rollback because they preserve old behavior.

## Open Questions

- Should prompt detection count inactive tasks, or is an active-task check sufficient for the approved popup trigger? The backfill operation should update all downstream rows when explicitly requested, but the prompt trigger may need a focused backend impact check if inactive-only projects are common.
