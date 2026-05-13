<!-- Scope: user SPA screens -->
<!-- Read when: implementing user-facing product pages -->

# User SPA Pages

## Dashboard

- Active Timer widget: full-width `<Card>` showing task, project, elapsed time, and stop action.
- Recent Time Entries: `<DataTable>` with last 10 entries.
- Empty dashboard state: reuse the shared empty state pattern.
- Optional MVP stats row: 3 summary cards.

## Global Top-Bar Timer

- There is no dedicated Timer page in the authenticated `user-web` MVP navigation.
- Authenticated top bar: every authenticated `user-web` page shows the compact timer surface.
- Running top-bar state: show live `HH:MM:SS`, current `Project / Task`, clickable task information, and a stop action.
- Not-running top-bar state: show the last tracked task context, clickable task information, and a start action that creates a new time entry for that task.
- Last tracked task context comes from `GET /time-entries?limit=1`, then uses the most recent own time entry whose task and parent project are still visible and active for the current user.
- A completed timer entry or manual entry may seed the last tracked task context if that task is still visible and active.
- The top-bar `Start` action creates a fresh running time entry. It must not resume or update the previous time entry record.
- If there is no eligible last tracked task context, keep the same not-running top-bar layout, keep the task information field clickable, and disable the start action.
- While the top-bar timer summary is loading, keep the layout visible and disable the action.
- If the top-bar timer summary fails to load, keep the layout visible in a disabled fallback state and surface the failure through toast feedback.
- Clicking the task information field opens the centered task-picker dialog.
- The task-picker dialog uses visible Project -> Task selection only.
- The dialog also supports creating a new task inside the currently selected visible project.
- The dialog does not support creating a new project.
- When task creation succeeds, the dialog keeps the newly created task selected and stays open until the user confirms with `Use selected task`.
- Manual interval entry stays on Time Entries only. It does not move into the top-bar timer surface or task-picker dialog.

## Time Entries Page

- Header actions include a primary PrimeVue `<Button>` labeled `+ New time entry` in the same row as the page title. It opens the shared manual time-entry PrimeVue `<Dialog>` without a preset day.
- Filter bar uses PrimeVue `<DatePicker>` for the date range, PrimeVue `<Select>` for the single project filter, and PrimeVue `<AutoComplete>` for task lookup.
- The task lookup placeholder copy is `Search tasks`.
- The task lookup filters the paginated API result set with backend task-title `search`; a selected concrete task may also apply exact `taskId` filtering.
- Entries grouped by day.
- Each day heading row includes its own PrimeVue `<Button>` labeled `+ New time entry` beside the date title. It opens the same manual time-entry `<Dialog>` with that day prefilled in the form.
- Entry row includes task, project, time range, duration, and icon-only edit/delete actions with `Edit` and `Delete` tooltips.
- Running entry highlighted with `bg-accent-tint`.
- Clicking `Edit` opens the shared time-entry PrimeVue `<Dialog>` instead of expanding the row inline.
- Edit mode uses the same field order and visual structure as create mode, but it pre-fills the selected entry values.
- The shared time-entry dialog uses these fields in both create and edit modes: project `<Select>`, task `<AutoComplete>`, `startedAt` `<DatePicker showTime>`, `endedAt` `<DatePicker showTime>`, optional description `<Textarea>`, and `isBillable` `<Checkbox binary>`.
- Edit mode allows changing the selected project and task in addition to `startedAt`, `endedAt`, `description`, and `isBillable`.
- This create/edit surface must ship as a true popup dialog overlay. Do not render it inline inside the Time Entries page layout.
- Delete uses the shared confirmation dialog pattern before removing an entry.
- Pagination uses PrimeVue `<Paginator>` below the grouped entry sections.
- Keep loading, empty, and request-error states distinct instead of collapsing failed loads into empty data.

## Projects Page

- Header actions include a primary PrimeVue `<Button>` labeled `+ New task` in the same row as the page title.
- The page uses the same high-level structure as Time Entries: page header row, grouped content sections, and a card/table shell for each group.
- A filter row above the grouped project sections uses a combined PrimeVue `<AutoComplete>` search with placeholder copy `Search projects or tasks`.
- The combined search filters already loaded visible projects and tasks on the frontend. Do not document it as a backend free-text search endpoint.
- Project-name matches keep the full matching project group visible.
- Task-name matches keep the parent project visible and narrow visible task rows to the matching tasks.
- Clearing the search restores the full grouped project list.
- Content is grouped by visible project instead of by day.
- Each project section header shows the project name on the left and a secondary PrimeVue `<Button>` labeled `+ Add task` on the right.
- Tasks for that project render beneath the project header inside the same section card.
- Task rows include task title, status, updated metadata, and icon-only edit/delete actions with `Edit` and `Delete` tooltips.
- Clicking `Edit` opens the shared task PrimeVue `<Dialog>` in update mode.
- The same task dialog is used for both create and update flows.
- Page-level `+ New task` opens the dialog in create mode with a required project `<Select>`.
- Project-level `+ Add task` opens the same dialog in create mode with that project already selected.
- Update mode pre-fills the selected project, task title, and editable task fields.
- The task dialog must ship as a true popup dialog overlay. Do not render create or update forms inline inside the Projects page layout.
- Delete uses the shared confirmation dialog pattern before permanently removing the task.
- Task deletion is available only when the task has no related time entries.
- Tasks with related time entries return a `409 Conflict` from the backend when deletion is attempted, and the Projects page surfaces that message without removing the task locally.
- Task responses do not include `canDelete`, `hasTimeEntries`, or other delete-eligibility metadata, so the Projects page must not rely on precomputed delete availability.
- Task lists show active tasks by default and exclude inactive tasks from the default grouped list.
- Keep loading, empty, and request-error states distinct instead of collapsing failed loads into empty data.

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

## Error Pages

- 404 Not Found renders inside the authenticated app shell when the user reaches an unknown `user-web` route.
- 404 content uses the shared centered empty/error state pattern: soft accent illustration, eyebrow `404`, title `Page not found`, concise helper copy, primary action `Back to dashboard`, and secondary action `Go back`.
- 403 Forbidden renders inside the authenticated app shell when the current user is signed in but lacks access to the requested page or workspace resource.
- 403 content uses the same centered error panel structure with eyebrow `403`, title `You do not have access`, helper copy explaining that the current workspace role cannot open the page, primary action `Back to dashboard`, and secondary action `Switch workspace` when another workspace is available.
- Keep both pages distinct from request-error states inside data cards. Route-level 403/404 pages replace the page content area; request errors stay scoped to the feature surface that failed.
- Do not hide the shell navigation on authenticated 403/404 pages; users should retain normal workspace navigation and the top-bar timer surface.
