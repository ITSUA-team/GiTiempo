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
- Project assignment is handled with inline expansion and checkboxes for non-admin members.

## Projects Page

- Projects list card includes an Assigned member PrimeVue `<Select>` below the list heading with `All members` default. Option labels use `Display Name (role)`.
- Project list table includes project name, source, assigned members, total hours, visibility, actions.
- Project settings row is a single line: `Select members` uses PrimeVue `<MultiSelect>`, `Visibility` uses PrimeVue `<Select>`, followed by `Cancel` and `Save` actions.
- Manual project creation uses a dialog.

## Settings Page

- Single-column grouped form layout.
- Workspace fields include name, default hourly rate, and currency.
- Save action pinned per section or at the page bottom.

## Cross-App Navigation

- The admin SPA should expose a visible entry point back to the user workspace when the user SPA is available.
- Prefer placing the cross-link in the shared shell identity/top-bar area so it stays consistent with the user SPA shell treatment.
