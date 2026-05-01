## Why

Project access needs a workspace-wide visibility model so public work can be tracked by every workspace member while private work remains assignment-gated.

Project list and stats responses also need enough summary data for admin and user project pages without pushing aggregation logic into frontend clients.

## What Changes

- Add project `visibility` with `public | private`, defaulting to `private`.
- Treat public projects as visible, accessible, editable, and trackable by all active workspace members, while private projects require assignment for non-admins.
- Keep admins able to see and edit all workspace projects regardless of visibility or active state.
- Return `visibility`, MVP `source`, and `totalHours` in project responses.
- Derive MVP project `source` as `manual | github`, with GitHub detected from project external references.
- Calculate `totalHours` from completed time entries only.
- Keep `PATCH /projects/:id` archive/unarchive support through `{ isActive: true | false }`, with active-state mutation remaining admin-only.
- Add `GET /projects/management-summary` with `activeProjects`, `privateProjects`, and `publicProjects`.
- Add `GET /projects/my-summary` with `visibleProjects`, `trackedHoursWeek`, and `trackedHoursMonth`.
- Use calendar week and calendar month windows for tracked-hour stats.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-management`: define public/private project visibility and update project list/read/update behavior for admins, PMs, and members.
- `data-model`: add project visibility with private default and define derived source and completed-entry project hour totals.
- `contracts`: extend project responses and add project summary response contracts.
- `time-tracking-api`: allow time tracking against active public projects for all workspace members while preserving private-project assignment scope.
- `api-conventions`: define calendar-based stats windows and distinct visible-project counting.

## Impact

- Requires a PostgreSQL migration for project visibility and matching Drizzle schema updates.
- Requires shared Zod contract and DTO updates, plus OpenAPI regeneration through the build-based workflow.
- Requires project query changes for visibility filtering, source derivation, total-hour aggregation, and summary endpoints.
- Requires focused unit/e2e coverage for public/private access, admin-only archive/unarchive, and summary calculations.
- Preserves existing private-by-default behavior for current projects unless explicitly changed.
