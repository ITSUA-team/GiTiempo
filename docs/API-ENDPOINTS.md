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
**POST /auth/switch-workspace** body: `{ workspaceId: string }`

`POST /auth/register` is the only public first-workspace-owner registration path. It creates the Firebase identity, local user, workspace, owner membership, and returns the normal token pair. Existing-workspace member onboarding remains invite-only; the User SPA `/register` flow must not reuse `/auth/login` or `/invites/accept` for first-workspace-owner creation.

Successful registration returns the same token-pair response shape as login/refresh: `{ accessToken, refreshToken, accessTokenExpiresIn }`.

Successful workspace switching returns the same token-pair response shape as login/refresh: `{ accessToken, refreshToken, accessTokenExpiresIn }`. The backend must reject target workspaces where the caller does not have an existing membership with `403 Forbidden`.

Expected frontend-visible registration error codes: `duplicate_email`, `weak_password`, `invalid_workspace_name`, `workspace_name_unavailable`, `rate_limited`, and `registration_service_unavailable`. These are returned in the standard error response `code` field; `error` remains the HTTP-category label.

---

## 2. User Profile

| Method | Path        | Auth | Role | Description                               |
| ------ | ----------- | ---- | ---- | ----------------------------------------- |
| GET    | `/users/me` | JWT  | Any  | Get current user profile + workspace role |
| GET    | `/users/me/workspaces` | JWT | Any | List the authenticated user's accessible workspace memberships |
| PATCH  | `/users/me` | JWT  | Any  | Update display name, avatar               |

**GET /users/me/workspaces** response: `{ items: Array<{ workspaceId: string, workspaceName: string, role: "admin" | "pm" | "member", isCurrent: boolean }> }`

---

## 3. GitHub Connection

| Method | Path                 | Auth | Role | Description                                                                                                                                                                                             |
| ------ | -------------------- | ---- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/github/connection` | JWT  | Any  | Get current GitHub connection status. When connected, the public account payload includes `githubUserId`, `login`, `avatarUrl`, `connectedAt`, and `updatedAt`.                                     |
| GET    | `/github/auth-url`   | JWT  | Any  | Get GitHub OAuth authorization URL (includes an opaque state id backed by server-side state and PKCE)                                                                                                    |
| GET    | `/github/callback`   | None | —    | GitHub OAuth callback (browser redirect from GitHub). Validates the opaque server-side state id, consumes it once, exchanges `code` with PKCE, stores GitHubConnection, and redirects user to `USER_SPA_URL/profile`. Success redirects append `?github=connected`. Failure redirects append `?github=error&code=<safe-error-code>` where the safe error code is backend-controlled (`invalid_state`, `github_exchange_failed`, `github_config`, etc.). The SPA surfaces redirect outcomes with toast notifications only. |
| DELETE | `/github/connection` | JWT  | Any  | Disconnect GitHub account                                                                                                                                                                               |

---

## 4. GitHub Data (for task selector)

| Method | Path                                 | Auth | Role | Description                               |
| ------ | ------------------------------------ | ---- | ---- | ----------------------------------------- |
| GET    | `/github/orgs`                       | JWT  | Any  | List user's GitHub organizations          |
| GET    | `/github/orgs/:org/projects`         | JWT  | Any  | List GitHub Projects (V2) in organization |
| GET    | `/github/orgs/:org/repos`            | JWT  | Any  | List repositories in organization         |
| GET    | `/github/projects/:projectId/issues` | JWT  | Any  | List issues in a GitHub Project           |
| GET    | `/github/repos/:owner/:repo/issues`  | JWT  | Any  | List issues in a GitHub repository        |

**Prerequisite:** User must have a connected GitHub account.

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
| GET    | `/time-entries/current`                 | JWT  | Any  | Get currently running timer (if any)                                                               |
| POST   | `/time-entries/timer/start`             | JWT  | Any  | Start timer against an existing task                                                               |
| POST   | `/time-entries/timer/start-from-github` | JWT  | Any  | Start timer from GitHub issue — auto-creates project and task if needed (used by Chrome extension) |
| POST   | `/time-entries/timer/stop`              | JWT  | Any  | Stop running timer                                                                                 |

**GET /time-entries** query: `page?`, `limit?`, `dateFrom?`, `dateTo?`, `projectId?`, `taskId?`, `search?`

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
**POST /time-entries/timer/start-from-github** body: `{ githubRepo: "org/repo", issueNumber: number, issueTitle: string }`

- `/time-entries/timer/start` requires `taskId` to reference a visible active open task; closed or inactive work is rejected with `422 Unprocessable Entity`.
- `/time-entries/timer/start-from-github` creates or reuses the local GitHub issue mapping, but an existing closed mapped task is rejected with `422 Unprocessable Entity` and no running entry is created.

**GET /projects/:id/time-entries** query: `page?`, `limit?`, `dateFrom?`, `dateTo?`, `taskId?`, `search?`

---

## 9. Team Time Entries (read-only)

| Method | Path                         | Auth | Role | Description                                                                                                                                               |
| ------ | ---------------------------- | ---- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/projects/:id/time-entries` | JWT  | Any  | List all time entries for a visible project, with optional task-title search. Private projects require assignment for non-admin users. Members remain read-only for other users' entries. |

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
| POST   | `/invoices`     | JWT  | Admin/PM | Create invoice from time report data       |
| GET    | `/invoices/:id` | JWT  | Admin/PM | Get invoice details                        |
| PATCH  | `/invoices/:id` | JWT  | Admin/PM | Update invoice (status, notes, rates)      |
| DELETE | `/invoices/:id` | JWT  | Admin    | Delete invoice                             |

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

`POST /invites/accept` returns `204 No Content` on success. Expected frontend-visible failure messages include `Invite not found` (`404`), `Invite has expired` (`410`), `Invite cannot be accepted` (`409`), `Invite email does not match identity` (`403`), and `User is already a workspace member` (`409`). The User SPA invite accept page must call this endpoint after Firebase sign-in and before calling normal app login for a first-time invited user. Email/password account creation is not performed by the browser; invite delivery is responsible for backend Firebase Admin SDK provisioning plus Firebase password setup/reset link delivery. The API must not receive raw passwords.

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

| Parameter   | Used in               | Description                            |
| ----------- | --------------------- | -------------------------------------- |
| `page`      | List endpoints        | Page number (1-based, default: 1)      |
| `limit`     | List endpoints        | Items per page (default: 20, max: 100) |
| `dateFrom`  | Time entries, reports | Filter start date (ISO 8601)           |
| `dateTo`    | Time entries, reports | Filter end date (ISO 8601)             |
| `projectId` | Time entries, reports | Filter by project                      |
| `taskId`    | Time entries          | Filter by task                         |

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
