## Why

The current billable controls do not consistently preserve the approved default inheritance chain from project to task to time entry, which makes new work records start from surprising billable states. The approved `.pen` flow and UI docs also require saved future defaults to be separated from optional backfills of existing downstream records.

## What Changes

- Add a project-level default billable value used when creating new tasks for that project.
- Add a task-level default billable value used when creating new manual and timer-created time entries for that task.
- Persist project and task default billable updates immediately for future records.
- Add explicit backfill operations that can update existing tasks and/or time entries only after the future default has already been saved.
- Update admin project settings, user task create/edit, timer task picker, and manual time-entry create flows so their default checkbox states reflect the project -> task -> time-entry inheritance chain.
- Ensure follow-up billable-default dialogs only ask whether existing downstream records should be updated and do not reintroduce a separate "keep future defaults only" action.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `data-model`: Store project and task default billable values and maintain existing time-entry billable storage behavior.
- `contracts`: Expose and validate default billable fields plus explicit backfill request contracts for projects and tasks.
- `project-management`: Allow permitted project editors to create and update project default billable values and optionally backfill existing downstream records.
- `task-management`: Make new tasks inherit their project's default billable value unless explicitly overridden, allow permitted task editors to update task default billable values, and optionally backfill task time entries.
- `time-tracking-api`: Make new manual and timer-created time entries inherit the selected task's default billable value unless explicitly overridden by an entry-level create flow.
- `admin-projects-page`: Render and save the project default billable control and show the approved follow-up popup only for existing-record backfills.
- `user-pages`: Reflect project/task default inheritance in the task dialog, timer task picker, and manual time-entry dialog default checkbox states.

## Impact

- Backend persistence and migrations for default billable fields on projects and tasks.
- NestJS project, task, and time-entry services/controllers and their authorization-preserving mutation paths.
- Shared Zod contracts and generated OpenAPI output for project, task, and time-entry payloads.
- Admin Projects page inline settings and Add Project flow.
- User Projects page task create/edit dialog, global top-bar timer task picker, and Time Entries manual create dialog.
- Focused backend, contract, frontend unit/component, and e2e coverage for inheritance and backfill prompts.
