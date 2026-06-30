<!-- Scope: user SPA screens -->
<!-- Read when: implementing user-facing product pages -->

# User SPA Pages

## Dashboard

- User-facing date/time displays in `user-web` use the user's current browser-local timezone unless a page requirement explicitly says otherwise. Stored timestamps remain ISO instants; the frontend converts them locally for display labels and calendar boundaries.
- Initial page load uses a skeleton that approximates the dashboard header, weekly insight/stat surfaces, and recent entries table before rendering empty states.
- Weekly focus insight: full-width `<Card>` highlighting `Top Project This Week` and `Top Task This Week` using the user's current browser-local-week tracked entries.
- Weekly focus insight values should show the winning project/task labels plus tracked-duration context, and may include a compact relative-share indicator when it improves scannability.
- When the winning task is backed by a synced GitHub issue, show a compact external-link icon next to the task name that opens the source issue in a new browser tab.
- Recent Time Entries: render the existing `<DataTable>` on tablet and desktop, and switch to stacked mobile cards below `640px`.
- The mobile recent-entry cards keep the same record content as the desktop table: task title, project name, time range, duration, and highlighted running/current-entry state when applicable.
- Dashboard recent-entry task names keep their current row behavior, and synced GitHub tasks add a separate external-link icon beside the task name that opens the source issue in a new browser tab.
- The section-level `View all` action remains available in both desktop/table and mobile-card layouts.
- Empty dashboard state: reuse the shared empty state pattern.
- Optional MVP stats row: 3 summary cards.
- Dashboard timer start/stop controls do not appear in page content; timer control lives in the global top bar. The Time Entries page is the only MVP page-content exception for direct row-level timer starts from existing entries.

## Global Top-Bar Timer

- There is no dedicated Timer page in the authenticated `user-web` MVP navigation.
- Authenticated shell: every authenticated `user-web` page shows the compact timer surface on tablet and desktop, and the selected full-width mobile timer strip below `640px`.
- Running top-bar state: show the project on the first line, task on the second line, and live `HH:MM:SS` inside the clickable compact timer surface.
- Not-running top-bar state: show the last tracked project/task context inside the same compact timer surface instead of a shell-level start action.
- When the shown task is backed by a synced GitHub issue, add a compact external-link icon beside the task line inside the surface. The icon opens the source issue in a new browser tab and does not replace the timer-surface click target.
- Last tracked task context comes from `GET /time-entries?limit=1`, then uses the most recent own time entry whose task and parent project are still visible and active for the current user.
- A completed timer entry or manual entry may seed the last tracked task context if that task is still visible and active.
- Starting from the popup creates a fresh running time entry. It must not resume or update the previous time entry record.
- The task-picker dialog includes visible `Project -> Task` selection plus an optional time-entry `Description` field under `Task`.
- The `Task` select lists visible tasks first and appends `New task` as the last option.
- When `Task = New task`, the created task inherits the selected project's default `isBillable` value.
- When the timer is idle, the popup primary action is `Start timer` and creates a fresh running time entry for the selected task and current dialog description. Time Entries completed rows may also start a fresh timer directly for that row's task without opening the task-picker popup.
- The fresh running time entry initializes `isBillable` from the selected task's default billable value before any per-entry override.
- When the timer is already running, the popup uses a secondary `Change task` action for task reassignment and a primary `Stop timer` action to its right.
- The authenticated user-web profile trigger is avatar-only in the top bar; visible member-name text does not appear beside the avatar.
- If there is no eligible last tracked task context, keep the same not-running top-bar layout and keep the compact timer surface clickable so the popup can seed a new startable task context.
- While the top-bar timer summary is loading, keep the layout visible with the popup entry point intact.
- If the top-bar timer summary fails to load, keep the layout visible in a disabled fallback state and surface the failure through toast feedback.
- Clicking the compact timer surface opens the centered task-picker dialog. The surface should hug its content width and stay aligned to the avatar side instead of expanding across the full center area.
- On mobile, a single `Task & timer` opener lives on the left side of the strip so it remains reachable when the profile menu opens from the top-right identity area.
- On mobile, the right-side metadata uses project on the first line and task on the second line, with running elapsed time shown there when applicable; the opener remains the guaranteed task-picker entry point if metadata is partially covered.
- The task-picker dialog uses predictive Project -> Task selection only for task targeting; it also includes the optional time-entry description field.
- When `Task` is set to `New task`, show a single required new-task title input directly below the task select and create that task inside the currently selected visible project.
- The dialog does not support creating a new project.
- When task creation succeeds, the dialog keeps the newly created task selected and stays open until the user confirms with the state-appropriate timer action.
- Manual interval entry stays on Time Entries only. It does not move into the top-bar timer surface or task-picker dialog.

## Time Entries Page

- Initial page load uses a skeleton matching the top-bar breadcrumb state, filters, grouped entry cards, and pagination region.
- Filter bar uses PrimeVue `<DatePicker showIcon showClear>` for the date range, PrimeVue `<AutoComplete dropdown forceSelection>` for the single project filter, and PrimeVue `<AutoComplete>` for task lookup. The date range is empty by default, selected ranges remain visible in the field until changed or cleared, and user-selected date ranges map to browser-local day-start and next-browser-local-day-start ISO boundaries before the API request is sent. Clearing the date range resets the date filter while preserving the other active filters.
- The task lookup placeholder copy is `Search tasks`.
- The task lookup filters the paginated API result set with backend task-title `search`; suggestions come from the currently loaded filtered entries so hints follow the active date/project/list filters, and a selected concrete task may also apply exact `taskId` filtering.
- Entries are grouped by the entry started-at day in the user's current browser-local timezone.
- Each day heading row includes its own primary icon-only PrimeVue `<Button>` with a `plus` icon beside the date title. It opens the same manual time-entry `<Dialog>` with that day prefilled in the form and uses tooltip/accessibility copy `New time entry`.
- Day-level create uses the rendered local day as the preset calendar day for `startedAt` and `endedAt`.
- At and above `640px`, each day group keeps the existing table layout for entries.
- Below `640px`, each day group renders stacked mobile cards instead of the fixed-width desktop table.
- Entry row/card content includes a first-column icon-only `Start timer` action for completed entries, a matching icon-only `Stop timer` action for the active running entry, a clickable task name, project, time range, and duration. The start action starts a fresh running timer for the same task without opening the task-picker popup and uses task-specific tooltip/accessibility copy such as `Start timer for Improve reports filters`. The stop action stops the current running timer without opening the task-picker popup and uses task-specific tooltip/accessibility copy such as `Stop timer for Improve reports filters`. The task name opens the shared edit dialog, and the row no longer carries separate edit/delete icon actions. When the task is backed by a synced GitHub issue, show a separate external-link icon beside the task name that opens the source issue in a new browser tab. Time-range labels use the user's current browser-local timezone.
- Running entry highlighted with `bg-accent-tint`.
- Running-entry mobile cards keep the same highlight treatment and expose the same direct `Stop timer` action as the desktop row; edit/delete actions remain unavailable for running entries.
- Clicking the task name opens the shared time-entry PrimeVue `<Dialog>` instead of expanding the row inline.
- Edit mode uses the same field order and visual structure as create mode, but it pre-fills the selected entry values.
- The shared time-entry dialog uses these fields in both create and edit modes: project `<AutoComplete dropdown forceSelection>`, task `<AutoComplete>`, `startedAt` `<DatePicker showTime>`, `endedAt` `<DatePicker showTime>`, optional description `<Textarea>`, and `isBillable` `<Checkbox binary>`.
- Create mode initializes `isBillable` from the selected task's default billable value and still lets the user override it before saving.
- Edit mode allows changing the selected project and task in addition to `startedAt`, `endedAt`, `description`, and `isBillable`.
- This create/edit surface must ship as a true popup dialog overlay. Do not render it inline inside the Time Entries page layout.
- Delete is triggered from inside the edit dialog and uses the shared confirmation dialog pattern before removing an entry.
- Pagination uses PrimeVue `<Paginator>` below the grouped entry sections.
- Keep loading, empty, and request-error states distinct instead of collapsing failed loads into empty data.

## Projects Page

- Initial page load uses a skeleton matching the top-bar breadcrumb state, the search row, and grouped project sections.
- The page uses the same high-level structure as Time Entries: top-bar breadcrumb, grouped content sections, and a card/table shell for each group.
- A lightweight filter row above the grouped project sections uses a combined standard PrimeVue `<AutoComplete>` search with placeholder copy `Search projects or tasks`, plus `Status` and `Updated` PrimeVue `<Select>` controls.
- Search suggestions include both project names and task names from the currently loaded visible data set; project suggestions render their main label in bold and task suggestions render regular weight.
- The combined search and the structured filters operate on already loaded visible projects and tasks on the frontend. Do not document them as backend free-text or backend filter endpoints.
- Project-name matches keep the full matching project group visible.
- Task-name matches keep the parent project visible and narrow visible task rows to the matching tasks.
- `Status` options are `All statuses`, `Open`, and `Closed`.
- `Updated` options are `Any time`, `Today`, `Last 7 days`, and `Older`.
- `Status` and `Updated` filters narrow task rows and only keep project groups that still contain at least one matching task.
- Clearing the search and resetting the status and updated selects restores the full grouped project list.
- Content is grouped by visible project instead of by day.
- Each project section header shows the project name on the left and a primary icon-only PrimeVue `<Button>` with a `plus` icon on the right. The action uses tooltip/accessibility copy `Add task`.
- Tasks for that project render beneath the project header inside the same section card.
- At and above `640px`, each project section keeps the existing task table layout.
- Below `640px`, each project section renders stacked mobile task cards instead of the fixed-width desktop task table.
- Task rows/cards include a clickable task title, status, and updated metadata. The task title opens the shared task edit dialog, and the row no longer carries separate edit/delete icon actions. When the task is backed by a synced GitHub issue, show a separate external-link icon beside the title that opens the source issue in a new browser tab. Updated metadata uses browser-local `Today`/`Yesterday`/weekday-plus-time formatting.
- Clicking the task title opens the shared task PrimeVue `<Dialog>` in update mode.
- The same task dialog is used for both create and update flows.
- The project-level add-task icon action opens the same dialog in create mode with that project already selected.
- Create mode includes `Default billable for time entries` and initializes it from the selected project's default billable value.
- Update mode pre-fills the selected project, task title, and editable task fields, including the task-level default billable value.
- Update mode uses PrimeVue `<Select>` for the fixed task status choice `Open`/`Closed`; this is a page-specific fixed-choice exception to the predictive single-select default.
- If a task default billable value changes after time entries already exist for that task, save the new default immediately for future entries, then show a follow-up popup that asks only whether existing time entries for that task should also be updated.
- The task dialog must ship as a true popup dialog overlay. Do not render create or update forms inline inside the Projects page layout.
- Delete is triggered from inside the task edit dialog and uses the shared confirmation dialog pattern before permanently removing the task.
- Task deletion is available only when the task has no related time entries.
- Tasks with related time entries return a `409 Conflict` from the backend when deletion is attempted, and the Projects page surfaces that message without removing the task locally.
- Task responses do not include `canDelete`, `hasTimeEntries`, or other delete-eligibility metadata, so the Projects page must not rely on precomputed delete availability.
- Task lists show active tasks by default and exclude inactive tasks from the default grouped list.
- Keep loading, empty, and request-error states distinct instead of collapsing failed loads into empty data.

## Profile Page

- Initial page load uses a skeleton matching the profile form and GitHub connection card before rendering disconnected, empty, or request-error states.
- Editable display name backed by `PATCH /users/me`.
- Display-name input is enabled and prefilled from the current user profile.
- `Save changes` persists the latest valid display name and `Cancel` restores the latest persisted value.
- A disabled placeholder row does not satisfy the editable display-name requirement.
- GitHub connection card fields must reflect the current API contract only: `githubUserId`, `login`, `avatarUrl`, `connectedAt`, and `updatedAt`. `connectedAt` and `updatedAt` render as browser-local user-facing timestamps rather than raw ISO strings.
- GitHub connection card required states: loading, request-error, disconnected, connected, and redirecting/connecting.
- Connected state actions: `Reconnect` and `Disconnect`.
- Disconnected state primary action: `Connect GitHub`.
- Disconnect uses the shared PrimeVue `<ConfirmDialog>` confirmation pattern before removing the connection.
- GitHub OAuth callback outcomes after redirect back to `/profile` are surfaced with toast notifications only; do not render inline success or error banners for callback results.
- When `avatarUrl` is `null`, do not render the avatar row in the GitHub connection card.
- Disconnect confirmation and callback notifications should use standard PrimeVue `<ConfirmDialog>` and `<Toast>` components; do not invent custom dialog or toast patterns for this page.
- Sign out is owned by the shared header profile dropdown; do not render a duplicate sign-out action in the Profile page content.

## Login Page

- `/login` renders as a standalone unauthenticated route-level page outside the authenticated app shell.
- The login page does not render the sidebar, top-bar timer surface, or in-shell workspace navigation.
- Use the approved `Login Page` `.pen` screen as the desktop parity source.
- The left brand panel keeps the existing product value copy and workspace-management summary cards.
- The main panel title is `Sign in` with email/password fields ordered `Email`, then `Password`.
- The primary action is `Sign in`.
- `Continue with Google` remains a secondary sign-in action below the primary action.
- Add a secondary outlined `Create workspace` action below `Continue with Google`. It links to `/register` and opens the register new workflow without changing the login form state.
- Keep the register action visually secondary to both sign-in actions. Do not render it as a second filled primary button.
- Keep the existing invite/help text below the action stack so users joining an existing workspace still understand they need an invitation.
- Login errors stay scoped to the sign-in attempt. Navigating to `/register` must not reuse or display stale login submission errors.

## Register New Workflow Page

- `/register` renders as a standalone unauthenticated route-level page outside the authenticated app shell.
- The register page does not render the sidebar, top-bar timer surface, or in-shell workspace navigation.
- Use the approved `Register New Workflow` `.pen` screen as the desktop parity source and `Register New Workflow Mobile` as the mobile parity source.
- The page creates the first workspace owner account for a new workspace only after an approved backend/API registration contract exists. It does not replace invite acceptance for members joining an existing workspace.
- The left desktop brand panel explains the new-workspace flow: create owner account, name the workspace, continue to dashboard.
- The mobile layout keeps the same content hierarchy while stacking the brand header, fields, owner acknowledgement, and actions in one column.
- The main panel title is `Create workspace` with helper copy explaining that the account becomes the initial workspace owner after registration succeeds.
- The default form fields are ordered `Work email`, `Full name`, `Workspace name`, `Password`, then `Confirm password`.
- Password fields use PrimeVue `<Password>` controls with feedback disabled unless a later approved password-strength requirement adds explicit feedback behavior.
- The owner acknowledgement checkbox follows the password fields and must be checked before submission. Desktop copy is `I agree to receive workspace email and accept the workspace owner responsibility.`
- The primary action is `Create workspace`.
- The secondary account action is an inline `Sign in` link for existing users. It navigates to `/login` and does not compete visually with the primary action.
- Do not add Google sign-up, invite acceptance, or password setup actions to this page unless docs, specs, and design are updated together.
- Registration implementation must use a shared contract-facing validation schema and a typed frontend API client once the backend/API contract exists. Do not create an ad hoc route-local fetch path for this workflow.
- The page must not ship as a disabled placeholder. If the registration backend is unavailable, the route should remain unregistered or intentionally gated until the approved contract exists.
- While registration is submitting, keep the panel shape stable, show loading on `Create workspace`, and prevent duplicate submissions.
- Successful registration should establish the normal app session from the approved registration response and redirect to the dashboard.
- Registration errors stay inline in the panel and should also use toast feedback for failed submission. Required mapped cases once backend support exists: duplicate email, weak password, invalid workspace name, workspace name unavailable, rate limiting, and registration service unavailable.
- Query and form tests should cover default render, required-field validation, owner acknowledgement validation, duplicate-submit prevention, successful dashboard redirect, existing-account navigation, and each mapped backend error once implementation begins.

## Invite Accept Page

- `/invites/accept?token=...` renders as a standalone unauthenticated route-level page outside the authenticated app shell.
- The invite accept page does not render the sidebar, top-bar timer surface, or in-shell workspace navigation.
- Use the approved `Invite Accept` `.pen` screen as the desktop parity source.
- The left brand panel explains the invite-only onboarding flow: use invited email, set a password from the invite email if needed, sign in to the Firebase identity, accept invite, continue to dashboard.
- The default main panel title is `Accept invite` with helper copy explaining that the user should sign in with the invited email after setting a password from the invite email if this is their first time.
- If the `token` query parameter is present, show the soft accent token notice `Invite token detected from the email link.`
- If the `token` query parameter is missing or empty, do not show the sign-in form. Render the invalid-link state with title `Invalid invite link`, helper copy that the link is missing or malformed, and a primary action to go to the login page.
- The default form is Firebase email/password sign-in with fields ordered `Email`, then `Password`, followed by the primary action `Accept invite`.
- The page MUST NOT create Firebase email/password accounts in the browser. First-time email/password invitees use the password setup/reset link sent in the invite email; backend invite delivery owns Firebase Admin SDK user provisioning and password setup/reset link generation.
- The secondary account action is `Need a password setup link? Check your invite email or ask an admin to send a fresh invite`; it preserves the invite token and does not expose a browser signup form.
- `Continue with Google` may remain available as an alternative sign-in action; it uses the same invite token and accepts the invite after Firebase returns an identity token for the invited email.
- The page MUST submit `POST /invites/accept` with `{ token, firebaseIdToken }` after Firebase sign-in, before trying to create an app API session for a first-time invited user.
- After `POST /invites/accept` returns `204`, the page signs in to the normal app session with the same Firebase identity token, then redirects to the dashboard.
- While acceptance is in progress, keep the panel shape stable, show a loading state on the active action, and prevent duplicate submissions.
- Success state copy is `Workspace access created. Redirecting to dashboard.` and may be brief because successful users are redirected.
- API errors stay inline in the panel and use the backend error message when available. Required mapped cases: `Invite not found`, `Invite has expired`, `Invite cannot be accepted`, `Invite email does not match identity`, and `User is already a workspace member`.
- Firebase sign-in errors stay inline in the panel. Required mapped cases: invalid credentials, missing password setup, too-many-requests, disabled account, popup-cancelled Google sign-in, and Google/email mismatch guidance.
- If Firebase sign-in succeeds but `POST /invites/accept` fails, do not silently discard the state. Keep the panel in a recovery state that explains that the Firebase account is signed in but workspace access was not created, and offer the correct next action based on the backend error: retry for transient failures, switch account for email mismatch, or go to login/request a fresh invite for terminal invite failures.
- For expired, missing, already-used, or not-found invite failures, show the invalid-link state and a login-page action instead of leaving the user on a retry-only form.
- For email mismatch, keep the form visible, show the exact mismatch message inline, and allow the user to retry with the correct account.
- For already-member, show a success-adjacent state that explains access already exists and offers the primary action `Sign in`.
- Keep route-level invite errors distinct from authenticated in-shell request errors.
- Use PrimeVue controls for inputs, buttons, inline messages, loading affordances, and toast feedback where applicable.
- Query-driven invite accept flows must test missing token, success redirect after email/password sign-in, success redirect after Google sign-in, invalid credentials, missing password setup guidance, email mismatch retry, invalid/expired/already-used link handling, already-member handling, sign-in-succeeded-but-accept-failed recovery, and URL cleanup after terminal outcomes.

## Invite Password Setup Page

- `/invites/password-setup?mode=resetPassword&oobCode=...&continueUrl=...` renders as a standalone unauthenticated route-level page outside the authenticated app shell.
- The invite password setup page does not render the sidebar, top-bar timer surface, or in-shell workspace navigation.
- Use the approved `Invite Password Setup` `.pen` screen as the desktop parity source.
- The page handles Firebase password reset/setup action links in app UI while still using Firebase Auth as the password authority.
- The page MUST NOT send raw passwords to GiTiempo APIs. Password validation and reset confirmation happen only through the Firebase browser SDK with `verifyPasswordResetCode` and `confirmPasswordReset`.
- The page reads the Firebase `oobCode` from the action link and validates it before showing the password form.
- If the action link contains a `continueUrl`, preserve its invite token and use it as the post-success return target. The expected success target is `/invites/accept?token=...`.
- Initial state: keep the panel shape stable while validating the action code and show copy `Checking password setup link...`.
- Valid-code state: show title `Set your password`, helper copy explaining that the user is setting a Firebase password for the invited email, the verified email as a soft accent notice, then fields ordered `New password`, `Confirm password`, followed by the primary action `Save password`.
- Password fields use PrimeVue `<Password>` and must have visible labels. Confirm password must match before calling Firebase.
- Success state copy is `Password saved. Return to your invite to sign in and accept access.` with primary action `Continue to invite`.
- Invalid or expired action-code state title is `Password setup link expired` with helper copy explaining that the link is invalid, expired, or already used, and a primary action `Back to invite` when an invite token is available or `Go to login` otherwise.
- Firebase reset errors stay inline in the panel. Required mapped cases: invalid/expired action code, weak password, mismatched confirmation, too many requests, and network failure.
- While reset confirmation is in progress, keep the panel shape stable, show loading on `Save password`, and prevent duplicate submissions.
- Query-driven password setup flows must test missing `oobCode`, invalid/expired code, valid code render, weak password, confirm-password mismatch, successful password save, invite-token preservation from `continueUrl`, success redirect to invite accept, and fallback login action when no invite token is available.

## Cross-App Navigation

- The user SPA should expose a visible entry point to the admin workspace when the admin SPA is available.
- Place the cross-link in the shared shell profile dropdown so it is available from authenticated user pages without competing with page-level actions.

## Error Pages

- 404 Not Found renders as a standalone route-level page outside the authenticated app shell when the user reaches an unknown `user-web` route.
- Standalone `user-web` 403/404 pages do not render the sidebar, top-bar timer surface, or in-shell workspace navigation.
- 404 content uses the shared centered empty/error state pattern: soft accent illustration, eyebrow `404`, title `Page not found`, concise helper copy, and primary action `Back to dashboard`.
- The 404 secondary action `Go back` renders only when the browser history contains a prior entry for the current tab. When no prior history entry exists, omit the secondary action entirely.
- 403 Forbidden renders as a standalone route-level page outside the authenticated app shell when the current user is signed in but lacks access to the requested page or workspace resource.
- 403 content uses the same centered error panel structure with eyebrow `403`, title `You do not have access`, helper copy explaining that the current workspace role cannot open the page, primary action `Back to dashboard`, and secondary action `Switch workspace` when another workspace is available.
- Keep both pages distinct from request-error states inside data cards. Route-level 403/404 pages replace the full route surface; request errors stay scoped to the feature surface that failed.
