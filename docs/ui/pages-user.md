<!-- Scope: user SPA screens -->
<!-- Read when: implementing user-facing product pages -->

# User SPA Pages

## Dashboard

- Active Timer widget: full-width `<Card>` showing task, project, elapsed time, and stop action.
- Recent Time Entries: `<DataTable>` with last 10 entries.
- Empty dashboard state: reuse the shared empty state pattern.
- Optional MVP stats row: 3 summary cards.

## Timer Page

- Task selector: cascading selects for Organization -> Project/Repo -> Issue.
- Manual task input fallback when GitHub is not connected.
- Start / Stop button: large CTA, full width on mobile, fixed width on desktop.
- Timer display: centered `text-5xl font-semibold text-brand`, format `HH:MM:SS`.
- Manual interval entry: collapsible `<Panel>` containing date/time controls.

## Time Entries Page

- Filter bar: date range, project filter, search field.
- Entries grouped by day.
- Entry row includes task, project, time range, duration, edit, delete.
- Running entry highlighted with `bg-accent-tint`.
- Inline edit opens within the row, not a modal.

## Project View Page

- Header with project name, description, and total tracked hours.
- Read-only time entries table filtered to the project.
- No edit or delete actions.

## Profile Page

- Editable display name.
- GitHub connection card with connected/disconnected states.
- Sign out action at the bottom using a ghost/destructive treatment.
