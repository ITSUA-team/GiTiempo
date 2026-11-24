# Manage project time entries in the admin app

## Why

Admins and assigned project managers need to correct individual time records and enter completed work on behalf of a team member. The existing project time list provides team reads, while the personal editor operates on the caller's own entries. [Issue #471](https://github.com/ITSUA-team/GiTiempo/issues/471)

## What Changes

- Add **Time Entries** to admin navigation for Admins and PMs. On desktop, follow the Invoices layout. A project sidebar on the left controls the paginated table on the right. The table heading names the selected project.
- Show one row per entry with the task and description, member, date and time interval, duration, billable flag, status and available actions. Within the selected project, users can search entries, filter by member and date range, and choose **New time entry**.
- On mobile, place a project selector above stacked entry cards. Keep search, filters and creation within reach. Each card shows the same entry details, permitted actions and reasons for restricted actions as the desktop row.
- Allow Admins to manage entries throughout their current workspace and PMs to manage entries only in projects to which they are explicitly assigned. Apply this rule to lists, project selection and every direct management API request, including requests for a public project.
- Start **New time entry** in the selected project and choose the owner and task. The owner must currently be eligible to record time against that task in the selected project. Editing keeps the owner and project fixed and allows changes to the time interval, description, billable flag and task within that project.
- Keep historical entries available for review and correction while the viewer retains management access, including after the project is archived, the task is closed or the owner loses access. An eligible completed entry can receive an interval, description or billable correction in place. Creating an entry or moving it to another task requires current tracking eligibility for the owner and destination task.
- Allow managers to edit or delete completed entries within their scope. Keep running and invoiced entries visible. Reject administrative edits and deletions of running entries with an instruction to stop the timer first. Reject both actions for entries linked to any invoice, including a draft, and explain that the entry is included in an invoice. Enforce the checks when writing so a rejected operation preserves the record.
- Scope these record-state restrictions to administrative operations. Personal time-entry and timer actions and bulk billable updates retain their established behavior.

## Capabilities

### New Capabilities

- `admin-time-entries-page` covers project selection, search and filtering, desktop rows and mobile cards, entry creation and correction, deletion, and visible reasons for restricted actions.

### Modified Capabilities

- `admin-routing` includes the authenticated Time Entries route for Admins and PMs.
- `admin-pages` includes Time Entries in role-aware admin navigation.
- `time-tracking-api` adds management operations with explicit PM assignment, owner eligibility, historical correction and record-state rules.
- `contracts` describes the management inputs, results and record-state errors shared by the API and admin app.

## Impact

The **Admin · Time Entries** section in `GITiempo.pen` contains the desktop frame `te471_1069` and mobile frame `te471_1569`. These frames are the layout references for `apps/admin-web`.

The project list, filtered entries and management actions require workspace-scoped authorization in `apps/api` and shared request, response and error contracts in `packages/shared` and OpenAPI. The new operations use existing workspace authentication, project assignments, time-entry records and invoice links.
