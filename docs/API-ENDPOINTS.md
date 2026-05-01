# API Endpoints

REST API contract for GI Tiempo. All endpoints return JSON. Authentication via `Authorization: Bearer <access_token>` header unless noted otherwise.

**Base path:** `/`

---

## 1. Authentication

| Method | Path            | Auth | Role | Description                                              |
| ------ | --------------- | ---- | ---- | -------------------------------------------------------- |
| POST   | `/auth/login`   | None | —    | Exchange Firebase ID token for JWT access/refresh tokens |
| POST   | `/auth/refresh` | None | —    | Exchange refresh token for new access/refresh pair       |
| POST   | `/auth/logout`  | JWT  | Any  | Invalidate current refresh token                         |

**POST /auth/login** body: `{ firebaseIdToken: string }`
**POST /auth/refresh** body: `{ refreshToken: string }`

---

## 2. User Profile

| Method | Path        | Auth | Role | Description                               |
| ------ | ----------- | ---- | ---- | ----------------------------------------- |
| GET    | `/users/me` | JWT  | Any  | Get current user profile + workspace role |
| PATCH  | `/users/me` | JWT  | Any  | Update display name, avatar               |

---

## 3. GitHub Connection

| Method | Path                 | Auth | Role | Description                                                                                                                                                                                             |
| ------ | -------------------- | ---- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/github/connection` | JWT  | Any  | Get current GitHub connection status                                                                                                                                                                    |
| GET    | `/github/auth-url`   | JWT  | Any  | Get GitHub OAuth authorization URL (includes signed `state` param with userId)                                                                                                                          |
| GET    | `/github/callback`   | None | —    | GitHub OAuth callback (browser redirect from GitHub). Validates signed `state` param to identify user, exchanges `code` for GitHub tokens, stores in GitHubConnection. Redirects user back to frontend. |
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

| Method | Path            | Auth | Role     | Description                                                                                                                                 |
| ------ | --------------- | ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/projects`     | JWT  | Any      | List workspace projects. Admins: all projects, with optional `assignedUserId` filter returning all projects assigned to that user (active and inactive). PMs/members: assigned active projects only. |
| POST   | `/projects`     | JWT  | Admin/PM | Create a provider-neutral project. PM creators are automatically assigned to the created project.                                           |
| GET    | `/projects/:id` | JWT  | Any      | Get project details. Admins can read active or inactive projects. PMs/members can read assigned active projects only.                       |
| PATCH  | `/projects/:id` | JWT  | Admin/PM | Update project. Admins can update name, color, and isActive on any project; PMs can update name and color on assigned active projects only. |

---

## 6. Project Assignments

| Method | Path                                | Auth | Role  | Description                                       |
| ------ | ----------------------------------- | ---- | ----- | ------------------------------------------------- |
| GET    | `/projects/:id/assignments`         | JWT  | Admin | List user assignments for a project               |
| POST   | `/projects/:id/assignments`         | JWT  | Admin | Assign a non-admin (`pm` or `member`) user to project |
| DELETE | `/projects/:id/assignments/:userId` | JWT  | Admin | Remove a `pm` or `member` assignment from project |

Assignments control project visibility for non-admin users. Admins have implicit access to all projects and do not need assignment rows.

---

## 7. Tasks

| Method | Path                       | Auth | Role | Description                                                                                      |
| ------ | -------------------------- | ---- | ---- | ------------------------------------------------------------------------------------------------ |
| GET    | `/projects/:id/tasks`      | JWT  | Any  | List tasks for a visible project. Non-admin users need assignment to an active project.          |
| POST   | `/projects/:id/tasks`      | JWT  | Any  | Create a provider-neutral task in a visible active project.                                      |
| GET    | `/tasks/:id`               | JWT  | Any  | Get task details when the user has visibility to the task's project.                             |
| PATCH  | `/tasks/:id`               | JWT  | Any  | Update task (title, status, isActive) when the user has visibility to the task's active project. |
| POST   | `/projects/:id/tasks/sync` | JWT  | Any  | Trigger task sync from the project's configured external provider refs.                          |

---

## 8. Time Entries

| Method | Path                                    | Auth | Role | Description                                                                                        |
| ------ | --------------------------------------- | ---- | ---- | -------------------------------------------------------------------------------------------------- |
| GET    | `/time-entries`                         | JWT  | Any  | List current user's time entries (filterable by date, project, task)                               |
| POST   | `/time-entries`                         | JWT  | Any  | Create manual time entry (start/end)                                                               |
| GET    | `/time-entries/:id`                     | JWT  | Any  | Get time entry details                                                                             |
| PATCH  | `/time-entries/:id`                     | JWT  | Any  | Update own time entry (description, times, billable)                                               |
| DELETE | `/time-entries/:id`                     | JWT  | Any  | Delete own time entry                                                                              |
| GET    | `/time-entries/current`                 | JWT  | Any  | Get currently running timer (if any)                                                               |
| POST   | `/time-entries/timer/start`             | JWT  | Any  | Start timer against an existing task                                                               |
| POST   | `/time-entries/timer/start-from-github` | JWT  | Any  | Start timer from GitHub issue — auto-creates project and task if needed (used by Chrome extension) |
| POST   | `/time-entries/timer/stop`              | JWT  | Any  | Stop running timer                                                                                 |

**POST /time-entries/timer/start** body: `{ taskId: string }`
**POST /time-entries/timer/start-from-github** body: `{ githubRepo: "org/repo", issueNumber: number, issueTitle: string }`

---

## 9. Team Time Entries (read-only)

| Method | Path                         | Auth | Role | Description                                                                                                                                               |
| ------ | ---------------------------- | ---- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/projects/:id/time-entries` | JWT  | Any  | List all time entries for a project. Admins: all projects. PMs/members: assigned active projects only. Members remain read-only for other users' entries. |

---

## 10. Reports

| Method | Path                   | Auth | Role     | Description                                                                                                   |
| ------ | ---------------------- | ---- | -------- | ------------------------------------------------------------------------------------------------------------- |
| GET    | `/reports/time`        | JWT  | Admin/PM | Aggregated time report. Filters: `projectId`, `userId`, `dateFrom`, `dateTo`. PM sees assigned projects only. |
| GET    | `/reports/time/export` | JWT  | Admin/PM | Export report as CSV                                                                                          |

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

| Method | Path              | Auth | Role  | Description                                                          |
| ------ | ----------------- | ---- | ----- | -------------------------------------------------------------------- |
| GET    | `/invites`        | JWT  | Admin | List pending invites                                                 |
| POST   | `/invites`        | JWT  | Admin | Create invite (send email)                                           |
| DELETE | `/invites/:id`    | JWT  | Admin | Cancel pending invite                                                |
| POST   | `/invites/accept` | None | —     | Accept invite by token: `{ token: string, firebaseIdToken: string }` |

---

## 14. Workspace Settings

| Method | Path                  | Auth | Role  | Description                                             |
| ------ | --------------------- | ---- | ----- | ------------------------------------------------------- |
| GET    | `/workspace`          | JWT  | Any   | Get current workspace info                              |
| PATCH  | `/workspace`          | JWT  | Admin | Update workspace settings (name)                        |
| GET    | `/workspace/settings` | JWT  | Admin | Get workspace settings (currency, default hourly rate)  |
| PATCH  | `/workspace/settings` | JWT  | Admin | Update workspace settings (currency, defaultHourlyRate) |

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
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Access token expired"
}
```
