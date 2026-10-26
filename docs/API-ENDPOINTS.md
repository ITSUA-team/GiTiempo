# API Endpoints

REST API contract for GI Tiempo. All endpoints return JSON. Authentication via `Authorization: Bearer <access_token>` header unless noted otherwise.

**Base path:** `/`

---

## 1. Authentication

| Method | Path            | Auth | Role | Description                                              |
| ------ | --------------- | ---- | ---- | -------------------------------------------------------- |
| POST   | `/auth/login`   | None | —    | Exchange Firebase ID token for JWT access/refresh tokens |
| POST   | `/auth/register`| None | —    | Register the first workspace owner and issue API tokens  |
| POST   | `/auth/refresh` | None | —    | Exchange refresh token for new access/refresh pair       |
| POST   | `/auth/switch-workspace` | JWT | Any | Switch the authenticated session to another workspace membership and issue a fresh token pair |
| POST   | `/auth/logout`  | JWT  | Any  | Invalidate current refresh token                         |

**POST /auth/login** body: `{ firebaseIdToken: string }`
**POST /auth/register** body: `{ email: string, fullName: string, workspaceName: string, password: string, ownerAcknowledgement: true }`
**POST /auth/refresh** body: `{ refreshToken: string }`
**POST /auth/switch-workspace** body: `{ refreshToken: string, workspaceId: string }`

`POST /auth/login` accepts only a verified Firebase identity. A first successful Google sign-in (`firebase.sign_in_provider = google.com` and a verified email) creates one personal foundation atomically when that local user has no workspace memberships: local user if needed, a workspace named exactly `Workspace`, its default settings, and an `admin` membership, followed by the normal token pair. It does not infer marketing or workspace-email consent. Repeating the login, including concurrent requests, reuses that same foundation. A user with memberships receives a session for the earliest `joined_at` membership (then workspace ID); refresh never provisions another workspace. The narrow exception for another provider without membership is authenticated recovery of its original manual-registration reservation by the exact reserved Firebase UID; ordinary password login does not provision a workspace.

Email-only account adoption requires proof that the incoming identity and the existing account own the same normalized verified email. A local email value, pending invitation, or creation reservation is insufficient. An unverified password account cannot be adopted by a different Google/GitHub identity merely presenting that email: the API returns `identity_proof_required` without an application session or identity binding. Existing immutable subject/provider ownership and conflicting-owner rejection remain in force.

`POST /auth/register` remains the manual first-workspace-owner path. It creates the Firebase identity, local user, workspace, owner membership, and returns the normal token pair. Existing-workspace member onboarding remains invite-only; the User SPA `/register` flow must not reuse `/invites/accept` for first-workspace-owner creation. Workspace display names are not unique: `Workspace` and any manually entered name may be used by multiple workspaces, and rename keeps the workspace ID stable.

Manual registration commits a reservation containing the exact Firebase UID and original validated non-secret foundation data before requesting Firebase creation. It never stores the password. A provider timeout or unknown outcome returns `503` with `registration_service_unavailable` and retains the attempt without granting a session. Later backend-verified authentication of that exact UID can finish the original foundation, preserving its names and explicit manual acknowledgement, or reuse a compatible committed foundation. Matching email on another UID cannot recover it. Background reconciliation updates only reservation state, and temporarily not finding the UID does not prove that late creation cannot finish. Cleanup is limited to the attempt's own unadopted identity after known failure; uncertain deletion retains provenance.

Successful registration returns the same token-pair response shape as login/refresh: `{ accessToken, refreshToken, accessTokenExpiresIn }`.

Successful workspace switching rotates the current refresh-token session into the selected workspace and returns the same token-pair response shape as login/refresh: `{ accessToken, refreshToken, accessTokenExpiresIn }`. The backend must reject target workspaces where the caller does not have an existing membership with `403 Forbidden`.

Expected frontend-visible registration error codes: `duplicate_email`, `weak_password`, `invalid_workspace_name`, `rate_limited`, and `registration_service_unavailable`. These are returned in the standard error response `code` field; `error` remains the HTTP-category label. `workspace_name_unavailable` is retired because display names are intentionally reusable.

---

## 2. User Profile

| Method | Path        | Auth | Role | Description                               |
| ------ | ----------- | ---- | ---- | ----------------------------------------- |
| GET    | `/users/me` | JWT  | Any  | Get current user profile + workspace role |
| GET    | `/users/me/workspaces` | JWT | Any | List the authenticated user's accessible workspace memberships |
| PATCH  | `/users/me` | JWT  | Any  | Update display name, avatar (setting an avatar stops identity sync from replacing it) |

**GET /users/me/workspaces** response: `{ items: Array<{ workspaceId: string, workspaceName: string, role: "admin" | "pm" | "member", isCurrent: boolean }> }`

- The user record tracks whether its avatar is owned by the identity provider or by the member. Login and invite sync fill or refresh the avatar from the verified Firebase `picture` claim only while it is provider-owned, and never clear it when a sign-in carries no picture.
- `PATCH /users/me` with a non-null `avatarUrl` makes the avatar member-owned, so later logins leave it alone. Sending `avatarUrl: null` clears it and returns ownership to the provider, letting the next login refill it. The ownership marker is internal and is not part of the public user contract.

---

## 3. GitHub Connection

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/auth/github/start` | None | Start user/admin/extension OAuth sign-in; request `user:email read:org read:project`. |
| GET | `/auth/github/callback` | Browser binding | Dispatch signed sign-in state or opaque `account_link.*` state without fallback. |
| POST | `/auth/github/session` | Single-use handoff | Commit the identity/OAuth grant and issue the unchanged token pair after initiator proof. |
| GET | `/github/connection` | JWT | Identity metadata, OAuth status/scopes, separate capabilities and server-derived disconnect eligibility. |
| GET | `/github/account/auth-url` | JWT | Start OAuth account linking with PKCE, user/session binding and generation; fixed Profile return. |
| GET | `/github/auth-url` | JWT | Authorize personal GitHub App data access for the already linked GitHub identity. |
| GET | `/github/callback` | Opaque App state | Complete personal App authorization; reject a different GitHub ID. |
| DELETE | `/github/connection` | JWT | Full personal unlink; HTTP 200 with `{disconnected:true,providerRevocation:"confirmed"|"unconfirmed"|"not_required"}`. |

`GET /github/connection` keeps `status: connected | disconnected` and safe `account` metadata. `oauth.status` is `not_authorized | authorized | reauthorization_required`; `missingScopes` contains known requested scopes only. `capabilities.organizationDiscovery` and `capabilities.personalData` independently report `ready | authorization_required | permission_required`. `disconnect` is `allowed | alternative_signin_required | verification_unavailable`. Workspace installations use their existing workspace endpoints.

Account-link clients include credentials on the auth-URL request: the API sets an encrypted, HttpOnly, SameSite=Lax session-binding cookie scoped to `/auth/github` for ten minutes. The callback validates the initiating session and active membership; logout invalidates pending authorization generations. GitHub sign-in keeps browser nonce and extension challenge/verifier behavior and configured destinations, but the callback only stages an encrypted candidate: it never creates a local user, workspace, membership, OAuth link, grant, or session. `POST /auth/github/session` performs the single-use proof exchange and atomically persists the selected identity/OAuth grant, provisions a personal foundation when the resolved user has no memberships, and issues the token pair. A linked immutable GitHub ID resolves first; otherwise only GitHub-verified emails may resolve an existing user or form a new candidate. Invalid, replayed, stale-generation, disconnected, or failed proof exchanges leave no durable candidate account or partial OAuth/session state.

The Profile callback uses `github=connected` or `github=error&code=<safe-code>`. Ownership conflict and identity mismatch do not expose another person's details. Disconnect checks an enabled Firebase account with supported password or Google sign-in on the server, including a fresh check on DELETE. Failure to verify prevents mutation. Successful unlink preserves current GiTiempo sessions, workspace/history data and installations. `unconfirmed` warns that local unlink succeeded but provider revocation could not be confirmed.

---

## 4. GitHub Data

| Method | Path                                                         | Auth | Role | Description                               |
| ------ | ------------------------------------------------------------ | ---- | ---- | ----------------------------------------- |
| GET    | `/github/organizations`                                      | JWT  | Any  | List current user's OAuth-visible active GitHub organizations before App installation for admin workspace allow-list setup; this is not filtered by the workspace allow-list |
| GET    | `/github/owners?type=all\|personal\|organization`           | JWT  | Any  | List GitHub owners available for browsing; organization owners are filtered by the workspace allow-list |
| GET    | `/github/projects?ownerType=personal\|organization&owner=<login>` | JWT  | Any  | List GitHub Projects (V2) for an owner scope |
| GET    | `/github/repos?ownerType=personal\|organization&owner=<login>` | JWT  | Any  | List repositories for an owner scope      |
| GET    | `/github/projects/:projectId/issues`                         | JWT  | Any  | List issues in a GitHub Project           |
| GET    | `/github/repos/:owner/:repo/issues`                          | JWT  | Any  | List issues in a GitHub repository        |

**Prerequisites:** Organization setup uses OAuth `read:org`; private owners/repositories/issues/Projects browsing and imports use the retained personal GitHub App grant. No token-family fallback is permitted. Installation-backed timer verification uses workspace installation tokens independently.

---

## 5. Projects

| Method | Path                           | Auth | Role     | Description                                                                                                                                      |
| ------ | ------------------------------ | ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/projects`                    | JWT  | Any      | List visible workspace projects with `description`, `visibility`, derived `source`, `totalSeconds` from completed time entries, and assigned members. |
| POST   | `/projects`                    | JWT  | Admin/PM | Create a provider-neutral project with optional `description`. PM creators are automatically assigned to the created project.                     |
| GET    | `/projects/management-summary` | JWT  | Admin/PM | Get management counts: `activeProjects`, `privateProjects`, and `publicProjects`.                                                                |
| GET    | `/projects/my-summary`         | JWT  | Any      | Get personal summary: `visibleProjects`, `trackedHoursWeek`, and `trackedHoursMonth`.                                                            |
| GET    | `/projects/:id`                | JWT  | Any      | Get project details when visible, including detail summaries for provider, tracked time, and assigned members. Admins can read all workspace projects. |
| PATCH  | `/projects/:id`                | JWT  | Admin/PM | Update project metadata including nullable `description`. Admins can update metadata and `isActive`; PMs can update visible active project metadata except `isActive`. Members cannot edit. |

`GET /projects` derives `source` as `manual | github` from `project_external_refs`; it is not stored on `projects`.

Project time totals are exposed in seconds. `totalSeconds` is derived from completed time entries by summing `duration_seconds` through project tasks and returning zero when no completed entries exist.

`GET /projects/:id` returns the list-level project fields plus `providerSummary`, `trackedSummary` (`totalSeconds`, `billableSeconds`, `billableShare`, `lastActivityAt`), and `assignedMembersSummary` (`count`, up to three `previewMembers`, `remainingCount`) for project header rendering.

Admins see all workspace projects. Non-admins see active public projects plus active assigned projects; private projects require assignment.

**PATCH /projects/:id** may archive or unarchive with `{ isActive: true | false }`. Only admins can change active state.

Summary tracked hours use completed entries, UTC ISO week windows, and UTC calendar month windows.


---

## 6. Project Assignments

| Method | Path                                | Auth | Role  | Description                                       |
| ------ | ----------------------------------- | ---- | ----- | ------------------------------------------------- |
| GET    | `/projects/:id/assignments`         | JWT  | Admin | List user assignments for a project               |
| POST   | `/projects/:id/assignments`         | JWT  | Admin | Assign a non-admin (`pm` or `member`) user to project |
| DELETE | `/projects/:id/assignments/:userId` | JWT  | Admin | Remove a `pm` or `member` assignment from project |

Assignments grant non-admin access to private projects and to any assigned active projects. Admins have implicit access to all workspace projects and do not need assignment rows.

---

## 7. Tasks

| Method | Path                       | Auth | Role | Description                                                                                      |
| ------ | -------------------------- | ---- | ---- | ------------------------------------------------------------------------------------------------ |
| GET    | `/projects/:id/tasks`      | JWT  | Any  | List active tasks for a visible active project by default. Private projects require assignment for non-admin users. |
| GET    | `/projects/:id/github/issues` | JWT | Any | List GitHub repository issues for a visible GitHub-backed project using the connected GitHub account. |
| POST   | `/projects/:id/tasks`      | JWT  | Any  | Create a provider-neutral task in a visible active project.                                      |
| GET    | `/tasks/:id`               | JWT  | Any  | Get task details when the user has visibility to the task's project.                             |
| PATCH  | `/tasks/:id`               | JWT  | Any  | Update task (title, status, isActive) when the user has visibility to the task's active project. Closing a task stops currently running timers for that task. |
| DELETE | `/tasks/:id`               | JWT  | Any  | Permanently delete a visible task only when it has no related time entries.                      |
| POST   | `/tasks/from-github`       | JWT  | Any  | Create or reuse a local task for a selected GitHub issue in a visible GitHub-backed project.     |
| POST   | `/projects/:id/tasks/sync` | JWT  | Any  | Trigger task sync from the project's configured external provider refs.                          |

**DELETE /tasks/:id** returns `204 No Content` when the task has no related time entries. If any time entry references the task, the backend returns `409 Conflict` with an explanatory message. Task responses do not include `canDelete`, `hasTimeEntries`, or other delete-eligibility metadata; clients must handle a rejected delete attempt.

**PATCH /tasks/:id** with `status: "closed"` makes the task unavailable for future manual entries and timer starts. If any users currently have running timers on that task, the backend ends those entries at the close timestamp, computes positive `durationSeconds`, and clears them from `GET /time-entries/current` responses.

**GET /projects/:id/github/issues** query: `limit?`, `state?`, `pageToken?`, `q?`

- Requires the project to be visible and GitHub-backed.
- Uses the caller's connected GitHub account to browse the mapped repository; the client does not send repository identity separately.

**POST /tasks/from-github** body: `{ projectId: string, issueNumber: number }`

- Requires the project to be visible and GitHub-backed.
- Verifies the selected open issue through the caller's connected GitHub account before creating or reusing the local task mapping.
- Rejects closed GitHub issues instead of creating local tasks for work that cannot be tracked.
- Uses provider data as the source of truth for the issue title and repository identity.

---

## 8. Time Entries

| Method | Path                                    | Auth | Role | Description                                                                                        |
| ------ | --------------------------------------- | ---- | ---- | -------------------------------------------------------------------------------------------------- |
| GET    | `/time-entries`                         | JWT  | Any  | List current user's time entries (filterable by date, project, task, task-title search)            |
| POST   | `/time-entries`                         | JWT  | Any  | Create manual time entry (start/end)                                                               |
| GET    | `/time-entries/:id`                     | JWT  | Any  | Get time entry details                                                                             |
| PATCH  | `/time-entries/:id`                     | JWT  | Any  | Update own time entry (task, description, times, billable)                                         |
| DELETE | `/time-entries/:id`                     | JWT  | Any  | Delete own time entry                                                                              |
| GET    | `/time-entries/current`                 | JWT  | Any  | Get the authenticated user's currently running timer across workspaces, if any                      |
| POST   | `/time-entries/timer/capability`        | JWT  | Any  | Read-only tracking preflight for canonical GitHub issue context; returns scope or a safe denial reason |
| POST   | `/time-entries/timer/start`             | JWT  | Any  | Start timer against an existing task                                                               |
| POST   | `/time-entries/timer/start-from-github-reference` | JWT | Any | Start from strict browser issue context; managed delegation or atomic external reference recording |
| POST   | `/time-entries/timer/start-from-github` | JWT  | Any  | Legacy managed GitHub start; requires verified workspace installation and existing authorized managed mapping |
| POST   | `/time-entries/timer/stop`              | JWT  | Any  | Stop the authenticated user's running timer across workspaces; supports conditional identity checks |

**GET /time-entries** query: `page?`, `limit?`, `dateFrom?`, `dateTo?`, `projectId?`, `taskId?`, `search?`

Time entry responses include safe display summaries for `project`, `task`, `user`, and `workspace` plus the corresponding ids. The `workspace` summary is `{ id: string, name: string }` and is required so clients can label running timers that belong to a different workspace than the active session workspace.

**POST /time-entries** body: `{ taskId: string, startedAt: string, endedAt: string, description?: string | null, isBillable?: boolean }`

- Creates a completed manual time entry, not a running timer.
- `taskId` must reference a visible active open task; closed or inactive work is rejected with `422 Unprocessable Entity`, while invisible private work remains `404 Not Found`.
- `startedAt` and `endedAt` are ISO 8601 datetimes.
- `endedAt` must be later than `startedAt`.
- `isBillable` defaults to `true` when omitted.

**PATCH /time-entries/:id** body: `{ taskId?: string, startedAt?: string, endedAt?: string, description?: string | null, isBillable?: boolean }`

- Completed entries may update `taskId`, `startedAt`, `endedAt`, `description`, and `isBillable`.
- Running entries may update `taskId` and `description` only; `startedAt`, `endedAt`, and `isBillable` still require stopping the timer first.
- `taskId` may be changed to move the entry to another visible active open task; closed or inactive targets are rejected with `422 Unprocessable Entity`, while invisible private targets remain `404 Not Found`.
- If both `startedAt` and `endedAt` are provided, `endedAt` must be later than `startedAt`.

**POST /time-entries/timer/start** body: `{ taskId: string, description?: string | null }`
**POST /time-entries/timer/start-from-github** body: `{ githubRepo: "org/repo", issueNumber: number, githubProjectId?: string }`
**POST /time-entries/timer/start-from-github-reference** body: `{ githubRepo: "org/repo", issueNumber: number, issueTitle: string, issueUrl: "https://github.com/org/repo/issues/123" }`

**POST /time-entries/timer/capability** accepts the same strict issue-context body and returns `{ canStartTracking: boolean, accessScope: "project" | "own-time" | null, reason: string | null }`. Allowed results have a null reason; denied results have a safe reason and null scope. The read-only preflight creates no projects, tasks, references, or entries and returns no protected mapping metadata. External reference tracking remains available to active workspace members without GitHub setup. Managed targets retain their authorization and installation checks. The extension refreshes this issue-bound capability before enabling Start; the start endpoint independently rechecks authorization at the write boundary.

- This strict request rejects unknown fields, unsafe/non-positive numbers, missing/overlong/control-character titles and nonmatching URLs. It accepts canonical direct HTTPS `github.com` URLs only; no queries/fragments, board URLs, credentials, port, or caller-supplied authority. Session workspace and fresh active membership determine the destination.
- Existing issue identity wins over repository identity. Managed mappings delegate to installation-backed authorization with no fallback after denial. Legacy `/start-from-github` rejects external mappings before provider access.
- Missing/external mappings atomically create/reuse a private external project and exact issue task, preserving IDs/title/state/defaults/history. Context is user-supplied, no GitHub request or provider verification occurs, and no GitHub link, customer App approval, assignment or admin toggle is required. Failed/conflicting starts roll back materialization.
- Project responses include `trackingMode`, nullable `referenceProvenance`, `accessScope: project | own-time`, and `capabilities.canManageTasks`; task responses include scope/capability. Own-time reads expose only exact tasks with owned entries and personal completed totals/activity, `members: []`, `assignedMembersSummary: null`, and no memberCount. Running entries grant visibility with zero completed duration. Management/report/export eligibility is separate.
- Manual entry creation/moves and saved external starts require current exact-task access. Last own entry deletion/move removes derived visibility; a fresh reference start can restore it. Shared task/project/billing/assignment mutations are denied for own-time-only access.


- `GET /time-entries/current` returns `{ timeEntry: TimeEntryResponse | null }`. It is user-global: it returns the caller's own running timer even when the entry belongs to a different workspace than the active JWT workspace claim.
- `/time-entries/timer/start` requires `taskId` to reference a visible active open task; closed or inactive work is rejected with `422 Unprocessable Entity`.
- For a saved managed task linked to a GitHub issue, an ordinary member must be explicitly assigned to its GiTiempo project, including public projects. This applies whether their personal GitHub account is connected, disconnected, absent, or expired. Missing assignment to a public project returns `403` with code `project_assignment_required` and message `You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time.` An invisible private target remains `404` without protected details.
- Assigned members can start saved GitHub tasks after personal disconnect. GitHub issue assignee status grants no GiTiempo project access. Administrators retain implicit project access; PMs retain visibility-based access. Eligible manual tasks, including those in GitHub-backed public projects, retain existing access rules. This start-specific rule does not change completed manual entries, historical edits, or running-task reassignment.
- `/time-entries/timer/start` remains scoped to the active JWT workspace through task visibility. If the user already has any running timer in any workspace, it rejects with `409 Conflict` and leaves the existing running timer unchanged.
- `/time-entries/timer/start-from-github` creates or reuses the local GitHub issue mapping, but an existing closed mapped task is rejected with `422 Unprocessable Entity` and no running entry is created.
- `/time-entries/timer/stop` accepts an optional `{ expectedTimerId: string }` body. Current web and extension clients send the authoritative id; the API conditionally stops only that still-running entry and returns `409 Conflict` if it changed. A bodyless request remains temporarily supported for installed legacy extension builds and retains the previous user-global stop behavior. Both forms stop only the caller's own timer and can stop a timer from another workspace while preserving its original workspace identity in the response.

**GET /projects/:id/time-entries** query: `page?`, `limit?`, `dateFrom?`, `dateTo?`, `taskId?`, `search?`

---

## 9. Team Time Entries (read-only)

| Method | Path                         | Auth | Role | Description                                                                                                                                               |
| ------ | ---------------------------- | ---- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/projects/:id/time-entries` | JWT  | Any  | List entries within the resolved project scope, with optional task-title search. Own-time external access returns owned entries and totals only; explicit project access retains established team reads. |

---

## 10. Reports

| Method | Path                   | Auth | Role     | Description                                                                                                                                                                |
| ------ | ---------------------- | ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/reports/time`        | JWT  | Admin/PM | Aggregated time report. Filters: `projectId`, `userId`, `dateFrom`, `dateTo`. PM sees assigned projects only.                                                              |
| GET    | `/reports/time/export` | JWT  | Admin/PM | Export detailed CSV rows for matching report data. Uses the same filters, sorting parameters, and scope as `/reports/time`, but rows aggregate by project, task, and user. |

---

## 11. Invoices

| Method | Path            | Auth | Role     | Description                                |
| ------ | --------------- | ---- | -------- | ------------------------------------------ |
| GET    | `/invoices`     | JWT  | Admin/PM | List invoices (PM: assigned projects only) |
| POST   | `/invoices`     | JWT  | Admin/PM | Create invoice from eligible time entries  |
| GET    | `/invoices/eligible-entries` | JWT  | Admin/PM | Preview eligible time entries for a potential invoice |
| GET    | `/invoices/stats`            | JWT  | Admin/PM | Get invoice stats (counts by status, this month summary) |
| GET    | `/invoices/:id` | JWT  | Admin/PM | Get invoice details                        |
| PATCH  | `/invoices/:id` | JWT  | Admin/PM | Update invoice (status, notes, title)      |
| DELETE | `/invoices/:id` | JWT  | Admin    | Delete invoice                             |

**GET /invoices** query: `page?`, `limit?`, `projectId?`, `status?`, `dateFrom?`, `dateTo?`, `search?`

- PMs see only invoices scoped to active public projects or private projects assigned to them. Workspace-wide invoices (no project scope) are admin-only.

**POST /invoices** body: `{ title: string, dateFrom: string (YYYY-MM-DD), dateTo: string (YYYY-MM-DD), projectId?: string, hourlyRate?: number, currency?: string, discountPercent?: number (0–100, step 0.01, default 0), notes?: string | null }`

- Creates an invoice from eligible time entries in the requested workspace, project, and date range.
- **Eligibility:** only completed, billable time entries with a finalized duration that are not already linked to another invoice are selected. Running, non-billable, and already-invoiced entries are excluded.
- **Atomicity:** entry selection, invoice insert, and `time_entries.invoice_id` association happen in a single transaction with `SELECT ... FOR UPDATE`, so concurrent requests cannot bill the same entry twice.
- **Totals:** `totalHours = SUM(duration_seconds) / 3600`, `totalAmount = totalHours × hourlyRate × (1 − discountPercent / 100)`. Both are stored as snapshot values at creation time.
- **Rate fallback:** when `hourlyRate` is omitted, the workspace `default_hourly_rate` is used. When `currency` is omitted, the workspace `currency` is used. If neither is configured and no rate is supplied, the request is rejected with `422`.
- PMs must scope invoice creation to a project they can see (active public project or private project assigned to them); workspace-wide invoices (no `projectId`) are admin-only.

**GET /invoices/eligible-entries** query: `dateFrom: string (YYYY-MM-DD), dateTo: string (YYYY-MM-DD), projectId?: string`

- Returns the set of completed, billable, not-yet-invoiced time entries matching the date range and optional project scope, along with computed total hours — without creating an invoice or modifying any data.
- PMs must scope the preview to a project they can see (active public project or private project assigned to them); a request without `projectId` from a PM is rejected with `403`.
- `dateTo` must be later than or equal to `dateFrom`; reversed bounds are rejected with a validation error.
- Response: `{ count: number, totalHours: number, entries: InvoiceTimeEntrySummary[], defaultHourlyRate: number | null, defaultCurrency: string | null }`
- Each entry summary includes `id`, `taskId`, `userId`, `userName`, `taskName`, `startedAt`, `endedAt`, `durationSeconds`, `isBillable`, `description`.

**GET /invoices/stats**

- Returns aggregate invoice counts grouped by status (`draft`, `sent`, `paid`) and a summary of invoices created in the current calendar month, scoped to the caller's visibility.
- The current month starts at midnight on its first day in the workspace's configured timezone, independently of the database session timezone.
- Admins see all workspace invoices; PMs see only invoices for active public projects or private projects assigned to them. Workspace-wide invoices (null `projectId`) are excluded from PM counts.
- Response: `{ byStatus: { draft: number, sent: number, paid: number }, thisMonth: { invoiceCount: number, projectCount: number, totalAmount: number, currency: string } }`
- `thisMonth.totalAmount` sums all currencies without conversion; the workspace default currency is returned for display purposes. The UI should note that totals are approximate when multiple currencies are present.

**PATCH /invoices/:id** body: `{ title?: string, status?: "draft" | "sent" | "paid", notes?: string | null }`

- Updates only editable fields (`title`, `status`, `notes`). Snapshot fields (`hourlyRate`, `currency`, `discountPercent`, `totalHours`, `totalAmount`, `dateFrom`, `dateTo`) and the linked time-entry set are immutable after creation. Totals are never recomputed by an update.
- Status can advance from `draft` to `sent` or `paid`, and from `sent` to `paid`; backward transitions return `409 Conflict`. An update also returns `409` if the status changed concurrently after it was read; none of that request's fields are applied, and the client should reload the invoice before retrying.

**DELETE /invoices/:id** (Admin only)

- Only `draft` invoices can be deleted. `sent` or `paid` invoices are locked (409 Conflict) to prevent re-billing of already invoiced time entries.
- Deleting a draft invoice unlinks its time entries via `time_entries.invoice_id` `ON DELETE SET NULL`, making them eligible for a later invoice. Time entries themselves are not deleted.

**Invoice list response** items include snapshot fields (`hourlyRate`, `currency`, `totalHours`, `totalAmount`, `discountPercent`), `status`, billing date range, optional `project` summary, and `timeEntryCount` (no `timeEntries` array in list items).

**Invoice detail response** (`GET /invoices/:id`) includes all list fields plus the `timeEntries` array with linked entry summaries.

**Eligible entries response** (`GET /invoices/eligible-entries`) returns `{ count, totalHours, entries, defaultHourlyRate, defaultCurrency }` where `entries` is an array of time-entry summaries with `userName` and `taskName` for display.

**Invoice stats response** (`GET /invoices/stats`) returns `{ byStatus: { draft, sent, paid }, thisMonth: { invoiceCount, projectCount, totalAmount, currency } }`.

**Time entry responses** include an `invoiceId` field (nullable) so clients can surface billed state.

---

## 12. Members (Workspace)

| Method | Path                | Auth | Role  | Description                  |
| ------ | ------------------- | ---- | ----- | ---------------------------- |
| GET    | `/members`          | JWT  | Admin | List workspace members       |
| PATCH  | `/members/:id/role` | JWT  | Admin | Update member role           |
| DELETE | `/members/:id`      | JWT  | Admin | Remove member from workspace |

---

## 13. Invites

| Method | Path                   | Auth | Role  | Description                                                          |
| ------ | ---------------------- | ---- | ----- | -------------------------------------------------------------------- |
| GET    | `/invites`             | JWT  | Admin | List pending invites                                                 |
| POST   | `/invites`             | JWT  | Admin | Create invite (send email)                                           |
| POST   | `/invites/:id/resend`  | JWT  | Admin | Resend pending invite delivery without changing token or expiration  |
| DELETE | `/invites/:id`         | JWT  | Admin | Cancel pending invite                                                |
| POST   | `/invites/accept`      | None | —     | Accept invite by token: `{ token: string, firebaseIdToken: string }` |

`POST /invites/accept` returns `204 No Content` on success. Expected frontend-visible failure messages include `Invite not found` (`404`), `Invite has expired` (`410`), `Invite cannot be accepted` (`409`), `Invite email does not match identity` (`403`), and `User is already a workspace member` (`409`). The User SPA invite accept page must call this endpoint after Firebase sign-in and before calling normal app login for a first-time invited user. Email/password account creation is not performed by the browser; invite delivery reserves/provisions the Firebase identity and sends Firebase password setup/reset link delivery. A pending invite never blocks a verified social user from receiving their own personal `Workspace`, and normal login never accepts that invitation implicitly; explicit acceptance later adds the invited membership. The API must not receive raw passwords.

`POST /invites/:id/resend` is admin-only and accepts no body. It returns the existing invite response on success after redelivering invite email content for the same pending invite token and expiration. It must reject missing, accepted, canceled, or cross-workspace invites with `404 Pending invite not found`, reject expired pending invites with `410 Invite has expired`, and return `503` with the delivery/Firebase failure message when resend cannot complete after the pending invite is found. Resend generates fresh Firebase password setup/reset link content for delivery, but it must not create a new invite row, extend expiration, or create workspace membership.

---

## 14. Workspace Settings

| Method | Path                  | Auth | Role  | Description                                             |
| ------ | --------------------- | ---- | ----- | ------------------------------------------------------- |
| GET    | `/workspace`          | JWT  | Any   | Get current workspace info                              |
| PATCH  | `/workspace`          | JWT  | Admin | Update workspace settings (name)                        |
| GET    | `/workspace/settings` | JWT  | Admin | Get workspace settings (currency, default hourly rate, time zone)  |
| PATCH  | `/workspace/settings` | JWT  | Admin | Update workspace settings (currency, defaultHourlyRate, timeZone) |
| GET    | `/workspace/github/organizations` | JWT | Admin | List workspace allowed GitHub organizations |
| POST   | `/workspace/github/organizations` | JWT | Admin | Add an allowed GitHub organization after validating it through the admin's connected GitHub account |
| DELETE | `/workspace/github/organizations/:organizationId` | JWT | Admin | Remove an allowed GitHub organization policy row |

**GET /workspace/settings** response includes `{ id, workspaceId, currency, defaultHourlyRate, timeZone, createdAt, updatedAt }`.

`GET /workspace` always returns the currently active workspace bound to the caller's active JWT session. It does not list alternate workspace memberships.

`PATCH /workspace` changes only the current workspace's display name. The name can duplicate another workspace name and the workspace ID does not change. The endpoint remains admin-only.

**PATCH /workspace/settings** body: `{ currency?: string, defaultHourlyRate?: number | null, timeZone?: string }`

- `timeZone` must be a valid IANA time-zone identifier such as `UTC` or `Europe/Kyiv`.
- `defaultHourlyRate` is a nullable workspace billing default for invoice creation; invoice records store their own hourly-rate snapshot after creation.

**GET /workspace/github/organizations** response: `{ items: Array<{ id, workspaceId, organizationLogin, createdAt, createdByUserId }> }`.

**POST /workspace/github/organizations** body: `{ organizationLogin: string }`. The backend validates the organization through the requesting admin's connected GitHub account before saving it. Recoverable GitHub connection or provider-access failures return a stable `code` and structured `recovery` payload for the admin Settings GitHub App access cards without exposing GitHub token material.

**DELETE /workspace/github/organizations/:organizationId** returns `204 No Content` on success and scopes removal to the current workspace.

---

## 15. Health & Metrics

| Method | Path       | Auth | Role | Description                            |
| ------ | ---------- | ---- | ---- | -------------------------------------- |
| GET    | `/health`  | None | —    | Health check (DB connectivity, uptime) |
| GET    | `/metrics` | None | —    | Prometheus-format metrics              |

---

## Common Query Parameters

| Parameter   | Used in                         | Description                             |
| ----------- | ------------------------------- | --------------------------------------- |
| `page`      | List endpoints                  | Page number (1-based, default: 1)       |
| `limit`     | List endpoints                  | Items per page (default: 20, max: 100)  |
| `dateFrom`  | Time entries, reports, invoices | Filter start date (ISO 8601)            |
| `dateTo`    | Time entries, reports, invoices | Filter end date (ISO 8601)              |
| `projectId` | Time entries, reports, invoices | Filter by project                       |
| `taskId`    | Time entries                    | Filter by task                          |
| `search`    | Time entries, invoices          | Text search filter (task/invoice title) |

## Standard Error Response

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "An account already exists for that email.",
  "code": "duplicate_email",
  "requestId": "req_123"
}
```

`code` is optional unless an endpoint defines stable machine-readable error identifiers. When present, clients should branch on `code` and treat `message` as display text rather than as the parsing contract.
