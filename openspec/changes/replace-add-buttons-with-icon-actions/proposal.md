## Why

The latest approved UI update makes create/add affordances more compact where the surrounding section or table header already supplies context. Updating these actions improves visual consistency across user and admin record-list surfaces while preserving explicit tooltip and accessibility copy.

## What Changes

- Replace stale page-content create/add text openers where the approved design now relies on contextual section or table-header actions.
- Replace the Time Entries day-level `New time entry` text buttons with primary icon-only actions that open the same manual time-entry dialog with the selected day prefilled.
- Replace each User Projects project-level `Add task` text button, including the mobile card variant, with the same primary icon-only action pattern.
- Replace Admin Invoices, Members, and Projects table-header create/invite text buttons with primary icon-only actions next to the existing search controls.
- Keep each icon-only action's tooltip and accessible label explicit: `New time entry`, `Add task`, `Create invoice`, `Invite member`, and `New project`.
- Preserve the existing dialog flows and dialog submit buttons; this change only affects opener actions.
- No API, backend, contract, database, or dependency changes are required.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `components`: Add the shared primary icon-only create/add action expectations for section and table-header action surfaces.
- `user-pages`: Update Time Entries day-level create actions to the approved primary icon-only pattern.
- `user-projects-list-page`: Update project-level task creation actions, including mobile project sections, to the approved primary icon-only pattern.
- `admin-pages`: Update admin invoice and broad admin management page expectations for table-header create/invite actions.
- `admin-members-page`: Update the Members invite entry point from stats/page header text action to the table-header primary icon-only action.
- `admin-projects-page`: Update the Projects new-project entry point to the table-header primary icon-only action while preserving navigation to `/projects/new`.

## Impact

- Affected apps: `apps/user-web` and `apps/admin-web`.
- Affected UI docs/design references: `docs/ui/pages-user.md`, `docs/ui/pages-admin.md`, `docs/ui/patterns.md`, `docs/ui/components.md`, `docs/ui/accessibility.md`, and the approved `GITiempo.pen` frames `Time Entries`, `Projects List`, `Admin Invoices`, `Admin Members`, and `Admin Projects`.
- Expected implementation touches are limited to Vue components/composables that render the affected opener actions and related focused tests for desktop and mobile branches.
- Existing dialogs, submission copy, API clients, mutations, and routes remain unchanged.
