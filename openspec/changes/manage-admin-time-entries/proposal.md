# Manage project time entries in the admin app

## Why

Admins and assigned project managers need to correct individual time records and enter completed work on behalf of a team member. The existing project time list provides team reads, while the personal editor operates on the caller's own entries. [Issue #471](https://github.com/ITSUA-team/GiTiempo/issues/471)

## What Changes

- Add **Time Entries** to admin navigation for Admins and PMs. Following the Invoices layout in `GITiempo.pen`, the left sidebar lists the projects the viewer can manage, and the table shows individual entries for the selected project.
- Allow Admins to manage entries throughout their current workspace and PMs to manage entries only in projects to which they are explicitly assigned. Apply this rule to lists, project selection and every direct management API request, including requests for a public project.
- At creation, select the project, owner and task. The owner must currently be eligible to record time against that task in the selected project. Editing keeps the owner and project fixed and allows changes to the time interval, description, billable flag and task within that project.
- Keep historical entries available for review and correction while the viewer retains management access, including after the project is archived, the task is closed or the owner loses access. An eligible completed entry can receive an interval, description or billable correction in place. Creating an entry or moving it to another task requires current tracking eligibility for the owner and destination task.
- Allow managers to edit or delete completed entries within their scope. Keep running and invoiced entries visible. Reject administrative edits and deletions of running entries with an instruction to stop the timer first. Reject both actions for entries linked to any invoice, including a draft, and explain that the entry is included in an invoice. Enforce the checks when writing so a rejected operation preserves the record.
- Scope these record-state restrictions to administrative operations. Personal time-entry and timer actions and bulk billable updates retain their established behavior.

## Capabilities

### New Capabilities

- `admin-time-entries-page` covers project selection, individual time entries, actions and visible reasons for restricted actions.

### Modified Capabilities

- `admin-routing` includes the authenticated Time Entries route for Admins and PMs.
- `admin-pages` includes Time Entries in role-aware admin navigation.
- `time-tracking-api` adds management operations with explicit PM assignment, owner eligibility, historical correction and record-state rules.
- `contracts` describes the management inputs, results and record-state errors shared by the API and admin app.

## Impact

The first deliverable is the admin page design in `GITiempo.pen`. Implementation will involve `apps/admin-web`, management authorization and time-entry operations in `apps/api`, and shared API contracts and OpenAPI in `packages/shared`. The new operations use existing workspace authentication, project assignments, time-entry records and invoice links.
