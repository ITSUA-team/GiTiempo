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

- Header actions include a primary PrimeVue `<Button>` labeled `+ New time entry` in the same row as the page title. It opens the shared manual time-entry PrimeVue `<Dialog>` without a preset day.
- Filter bar uses PrimeVue `<DatePicker>` for the date range, PrimeVue `<Select>` for the single project filter, and PrimeVue `<AutoComplete>` for task lookup.
- The task lookup placeholder copy is `Search tasks`.
- The task lookup applies `taskId` filtering from the selected suggestion; do not document it as a backend free-text search endpoint.
- Entries grouped by day.
- Each day heading row includes its own PrimeVue `<Button>` labeled `+ New time entry` beside the date title. It opens the same manual time-entry `<Dialog>` with that day prefilled in the form.
- Entry row includes task, project, time range, duration, edit, delete.
- Running entry highlighted with `bg-accent-tint`.
- Clicking `Edit` opens the shared time-entry PrimeVue `<Dialog>` instead of expanding the row inline.
- Edit mode uses the same field order and visual structure as create mode, but it pre-fills the selected entry values.
- The shared time-entry dialog uses these fields in both create and edit modes: project `<Select>`, task `<AutoComplete>`, `startedAt` `<DatePicker showTime>`, `endedAt` `<DatePicker showTime>`, optional description `<Textarea>`, and `isBillable` `<Checkbox binary>`.
- Edit mode allows changing the selected project and task in addition to `startedAt`, `endedAt`, `description`, and `isBillable`.
- This create/edit surface must ship as a true popup dialog overlay. Do not render it inline inside the Time Entries page layout.
- Delete uses the shared confirmation dialog pattern before removing an entry.
- Pagination uses PrimeVue `<Paginator>` below the grouped entry sections.
- Keep loading, empty, and request-error states distinct instead of collapsing failed loads into empty data.

## Project View Page

- Header with project name, description, and total tracked hours.
- Read-only time entries table filtered to the project.
- No edit or delete actions.

## Profile Page

- Editable display name backed by `PATCH /users/me`.
- Display-name input is enabled and prefilled from the current user profile.
- `Save changes` persists the latest valid display name and `Cancel` restores the latest persisted value.
- A disabled placeholder row does not satisfy the editable display-name requirement.
- GitHub connection card fields must reflect the current API contract only: `githubUserId`, `login`, `avatarUrl`, `connectedAt`, and `updatedAt`.
- GitHub connection card required states: loading, request-error, disconnected, connected, and redirecting/connecting.
- Connected state actions: `Reconnect` and `Disconnect`.
- Disconnected state primary action: `Connect GitHub`.
- Disconnect uses the shared PrimeVue `<ConfirmDialog>` confirmation pattern before removing the connection.
- GitHub OAuth callback outcomes after redirect back to `/profile` are surfaced with toast notifications only; do not render inline success or error banners for callback results.
- When `avatarUrl` is `null`, do not render the avatar row in the GitHub connection card.
- Disconnect confirmation and callback notifications should use standard PrimeVue `<ConfirmDialog>` and `<Toast>` components; do not invent custom dialog or toast patterns for this page.
- Sign out action at the bottom using a ghost/destructive treatment.

## Cross-App Navigation

- The user SPA should expose a visible entry point to the admin workspace when the admin SPA is available.
- Prefer placing the cross-link in the shared shell identity/top-bar area so it is available from authenticated user pages without competing with page-level actions.
