<!-- Scope: admin SPA screens -->
<!-- Read when: implementing admin or PM-facing pages -->

# Admin SPA Pages

## Dashboard

- Four summary stat cards.
- Recent activity feed using the same DataTable patterns as user pages.

## Reports Page

- Filter bar: project, member, date range, group-by.
- Filters apply in real time with 300ms debounce.
- Summary totals row above the results table.
- Results table is sortable and supports CSV export.
- PM users cannot widen filters beyond their assigned scope.

## Invoices Page

- Invoice list table with status tags.
- Create Invoice flow uses a modal dialog.
- Dialog fields: project, date range, hourly rate, discount, total amount.

## Members Page

- Members table with avatar, role, projects assigned, last active, actions.
- Invite member opens a dialog.
- PM assignment is handled with inline expansion and checkboxes.

## Projects Page

- Project list table includes project name, source, PM, total hours, visibility, actions.
- Inline edit supports visibility toggle and PM reassignment.
- Manual project creation uses a dialog.

## Settings Page

- Single-column grouped form layout.
- Workspace fields include name, default hourly rate, and currency.
- Save action pinned per section or at the page bottom.

## Cross-App Navigation

- The admin SPA should expose a visible entry point back to the user workspace when the user SPA is available.
- Prefer placing the cross-link in the shared shell identity/top-bar area so it stays consistent with the user SPA shell treatment.
