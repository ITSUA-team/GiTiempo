<!-- Scope: user SPA screens -->
<!-- Read when: implementing user-facing product pages -->

# User SPA Pages

## Dashboard

- Active Timer widget: full-width `<Card>` showing task, project, elapsed time, and stop action.
- Recent Time Entries: `<DataTable>` with last 10 entries.
- Empty dashboard state: reuse the shared empty state pattern.
- Optional MVP stats row: 3 summary cards.

## Timer Page

- Task selector: cascading selects for visible Project -> Task.
- Selector options come from the current user's visible workspace projects and tasks only.
- Start / Stop button: large CTA, full width on mobile, fixed width on desktop.
- Timer display: centered `text-5xl font-semibold text-brand`, format `HH:MM:SS`.
- Manual interval entry: panel containing date/time controls below the timer actions.

## Time Entries Page

- Filter bar: date range, single project filter, search field.
- Search placeholder copy: `Search tasks`.
- Entries grouped by day.
- Entry row includes task, project, time range, duration, edit, delete.
- Running entry highlighted with `bg-accent-tint`.
- Inline edit opens within the row, not a modal.
- Inline edit shows task as read-only text and only edits the time interval fields in place.
- Delete uses the shared confirmation dialog pattern before removing an entry.
- Pagination uses PrimeVue `<Paginator>` below the grouped entry sections.
- Keep loading, empty, and request-error states distinct instead of collapsing failed loads into empty data.

## Project View Page

- Header with project name, description, and total tracked hours.
- Read-only time entries table filtered to the project.
- No edit or delete actions.

## Profile Page

- Editable display name.
- GitHub connection card with connected/disconnected states.
- Sign out action at the bottom using a ghost/destructive treatment.

## Cross-App Navigation

- The user SPA should expose a visible entry point to the admin workspace when the admin SPA is available.
- Prefer placing the cross-link in the shared shell identity/top-bar area so it is available from authenticated user pages without competing with page-level actions.
