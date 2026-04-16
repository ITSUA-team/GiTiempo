# Data Model

Entity definitions and relationships for GI Tiempo.

**MVP scope:** Single-tenant. A default workspace is seeded on deployment. All entities reference `workspaceId` to simplify future multi-tenant migration.

---

## Entity-Relationship Diagram

```
┌──────────────┐       ┌─────────────────────┐       ┌──────────────┐       ┌───────────────────┐
│   Workspace  │──1:N──│   WorkspaceMember   │──N:1──│     User     │──1:0..1│ GitHubConnection │
└──────┬───────┘       └─────────────────────┘       └──────┬───────┘       └───────────────────┘
       │                                                    │
       │ 1:N                                                │ 1:N
       ▼                                                    ▼
┌──────────────┐       ┌───────────────────┐       ┌──────────────┐
│   Project    │──1:N──│ProjectAssignment  │──N:1──│  TimeEntry   │
└──────┬───────┘       │  (PM → Project)   │       └──────┬───────┘
       │               │ has workspaceId   │              │ │
       │ 1:N           └───────────────────┘              │ │ N:0..1
       ▼                                                  │ │
┌──────────────┐                                          │ ▼
│     Task     │──────────────────────────────────────────┘ ┌──────────────┐
│has workspaceId│      (N:1)                                │   Invoice    │
└──────────────┘                                            └──────────────┘

┌──────────────┐       ┌────────────────────┐
│   Invite     │       │ WorkspaceSettings  │──1:1── Workspace
└──────────────┘       └────────────────────┘

  Workspace owns: Project, Invoice, Invite, WorkspaceSettings, WorkspaceMember
  Denormalized workspaceId on: Task, TimeEntry, ProjectAssignment
  GitHubConnection belongs to User (workspace-independent)
```

---

## Entities

### User

A person authenticated via Firebase Auth (Google SSO or email/password). GitHub connection is optional and stored separately in `GitHubConnection`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | Internal identifier |
| `firebaseUid` | VARCHAR(128) | UNIQUE, NOT NULL | Firebase Auth UID |
| `email` | VARCHAR(255) | NOT NULL | Email from Firebase Auth |
| `displayName` | VARCHAR(255) | | Display name |
| `avatarUrl` | TEXT | | Avatar URL (from Google or uploaded) |
| `createdAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:** `User_firebaseUid_unique` on `firebaseUid`

---

### GitHubConnection

Stores the user's GitHub App connection. Optional — users can work with manual tasks without GitHub. Connected via user-to-server OAuth flow in profile settings.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `userId` | UUID | FK → `User.id`, UNIQUE, NOT NULL | One connection per user |
| `githubUserId` | BIGINT | NOT NULL | GitHub user ID |
| `login` | VARCHAR(255) | NOT NULL | GitHub username |
| `avatarUrl` | TEXT | | GitHub avatar URL |
| `accessTokenEncrypted` | TEXT | | AES-encrypted GitHub user access token (prefix `ghu_`) |
| `refreshTokenEncrypted` | TEXT | | AES-encrypted GitHub refresh token (prefix `ghr_`) |
| `tokenExpiresAt` | TIMESTAMPTZ | | When the current access token expires |
| `connected` | BOOLEAN | NOT NULL, default `true` | `false` if user disconnected or token revoked |
| `connectedAt` | TIMESTAMPTZ | NOT NULL, default `now()` | When GitHub was first connected |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `GitHubConnection_userId_unique` UNIQUE on `userId`
- `GitHubConnection_githubUserId_idx` on `githubUserId`

---

### Workspace

A grouping container. In MVP, a single default workspace is seeded on deployment. All data belongs to it. Future SaaS will allow multiple workspaces per deployment.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `name` | VARCHAR(255) | NOT NULL | Workspace display name |
| `createdAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |

---

### WorkspaceSettings

Per-workspace configuration. One settings record per workspace, created automatically with the workspace.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `workspaceId` | UUID | FK → `Workspace.id`, UNIQUE, NOT NULL | One settings record per workspace |
| `currency` | VARCHAR(3) | NOT NULL, default `'USD'` | ISO 4217 currency code |
| `defaultHourlyRate` | DECIMAL(10,2) | nullable | Default hourly rate for new invoices |
| `createdAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `WorkspaceSettings_workspaceId_unique` UNIQUE on `workspaceId`

---

### WorkspaceMember

Joins users to workspaces with a role. In single-tenant MVP, each user has exactly one membership (in the default workspace).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `workspaceId` | UUID | FK → `Workspace.id`, NOT NULL | |
| `userId` | UUID | FK → `User.id`, NOT NULL | |
| `role` | VARCHAR(20) | NOT NULL, default `'member'` | `'admin'`, `'pm'`, or `'member'` |
| `joinedAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `WorkspaceMember_workspaceId_userId_unique` UNIQUE on `(workspaceId, userId)`
- `WorkspaceMember_userId_idx` on `userId`

---

### Project

Groups tasks within a workspace. A project can map to a **GitHub Project (V2)** (board with issues from multiple repos), a **GitHub Repository** (issues within a single repo), or be created manually (no GitHub link).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `workspaceId` | UUID | FK → `Workspace.id`, NOT NULL | |
| `name` | VARCHAR(255) | NOT NULL | Project display name |
| `color` | VARCHAR(7) | | Hex color code (e.g. `#FF5733`) |
| `sourceType` | VARCHAR(20) | NOT NULL, default `'github_project'` | `'github_project'`, `'github_repo'`, or `'manual'` |
| `githubProjectId` | BIGINT | UNIQUE, nullable | GitHub Project V2 ID (if `sourceType = 'github_project'`) |
| `githubProjectNumber` | INT | nullable | GitHub Project number within org |
| `githubOrgLogin` | VARCHAR(255) | nullable | GitHub organization login |
| `githubRepoId` | BIGINT | UNIQUE, nullable | GitHub repository ID (if `sourceType = 'github_repo'`) |
| `githubRepoFullName` | VARCHAR(500) | UNIQUE, nullable | `owner/repo` slug (if `sourceType = 'github_repo'`) |
| `isActive` | BOOLEAN | NOT NULL, default `true` | Soft-disable project |
| `syncedAt` | TIMESTAMPTZ | nullable | Last successful sync from GitHub |
| `createdAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `Project_workspaceId_idx` on `workspaceId`
- `Project_githubProjectId_unique` UNIQUE on `githubProjectId` (where not null)
- `Project_githubRepoId_unique` UNIQUE on `githubRepoId` (where not null)
- `Project_githubRepoFullName_idx` on `githubRepoFullName` (for extension auto-create lookups)

**Notes:**
- `sourceType = 'github_project'`: `githubProjectId`, `githubProjectNumber`, `githubOrgLogin` are set. Repo fields are null.
- `sourceType = 'github_repo'`: `githubRepoId`, `githubRepoFullName`, `githubOrgLogin` are set. Project fields are null.
- `sourceType = 'manual'`: all GitHub fields are null.
- Extension auto-creation uses `sourceType = 'github_repo'` — when a timer is started from the extension, the repo becomes the project.

---

### ProjectAssignment

Links Project Managers to specific projects. Determines which projects a PM can view and manage in the admin frontend. Admins have implicit access to all projects and are not listed here.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `projectId` | UUID | FK → `Project.id`, NOT NULL | |
| `userId` | UUID | FK → `User.id`, NOT NULL | Must be a user with `role = 'pm'` |
| `workspaceId` | UUID | FK → `Workspace.id`, NOT NULL | Denormalized from project for multi-tenant queries |
| `assignedAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `assignedBy` | UUID | FK → `User.id`, NOT NULL | Admin who assigned |

**Indexes:**
- `ProjectAssignment_projectId_userId_unique` UNIQUE on `(projectId, userId)`
- `ProjectAssignment_userId_idx` on `userId`
- `ProjectAssignment_workspaceId_idx` on `workspaceId`

---

### Task

A trackable unit of work. Every task belongs to a project. Synced from a GitHub issue (from any repo within the GitHub Project, or from a single repo) or created manually with optional push to GitHub.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `projectId` | UUID | FK → `Project.id`, NOT NULL | |
| `workspaceId` | UUID | FK → `Workspace.id`, NOT NULL | Denormalized from project for multi-tenant queries |
| `title` | TEXT | NOT NULL | Task title |
| `isManual` | BOOLEAN | NOT NULL, default `false` | `true` = created locally |
| `githubIssueNumber` | INT | nullable | GitHub issue number |
| `githubIssueId` | BIGINT | nullable | GitHub issue node ID |
| `githubRepoFullName` | VARCHAR(500) | nullable | `owner/repo` — issue can be from any repo |
| `status` | VARCHAR(20) | NOT NULL, default `'open'` | `'open'` or `'closed'` |
| `isActive` | BOOLEAN | NOT NULL, default `true` | Soft-disable task |
| `syncedAt` | TIMESTAMPTZ | nullable | Last sync from GitHub |
| `createdAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `Task_projectId_idx` on `projectId`
- `Task_workspaceId_idx` on `workspaceId`
- `Task_githubIssue_unique` UNIQUE on `(githubRepoFullName, githubIssueNumber)` (where `isManual = false`)

**Note:** The unique constraint on GitHub issue is global (not workspace-scoped). In single-tenant MVP this is correct. For future multi-tenant migration, this constraint must be extended to include the workspace scope (via project).

**Notes:**
- GitHub-synced tasks: `isManual = false`, `githubIssueNumber`, `githubIssueId`, and `githubRepoFullName` are set.
- Manual tasks: `isManual = true`, GitHub fields are null. User can optionally push to GitHub (creating an issue in a selected repo), at which point GitHub fields are populated.
- Extension auto-creation creates tasks with `isManual = false` and populates GitHub fields from the issue page.

---

### TimeEntry

The core record. Represents a period of tracked time.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `taskId` | UUID | FK → `Task.id`, NOT NULL | |
| `userId` | UUID | FK → `User.id`, NOT NULL | Who tracked this time |
| `workspaceId` | UUID | FK → `Workspace.id`, NOT NULL | Denormalized from task→project for multi-tenant queries |
| `startedAt` | TIMESTAMPTZ | NOT NULL | Timer start or manual start |
| `endedAt` | TIMESTAMPTZ | nullable | null = timer currently running |
| `durationSeconds` | INT | nullable | Computed: `endedAt - startedAt` in seconds. null if running. |
| `description` | TEXT | nullable | Optional note |
| `isBillable` | BOOLEAN | NOT NULL, default `true` | |
| `source` | VARCHAR(20) | NOT NULL, default `'web'` | `'web'`, `'extension'`, or `'manual'` |
| `invoiceId` | UUID | FK → `Invoice.id`, nullable | Linked invoice (set when invoice is generated) |
| `createdAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `TimeEntry_taskId_idx` on `taskId`
- `TimeEntry_userId_idx` on `userId`
- `TimeEntry_workspaceId_idx` on `workspaceId`
- `TimeEntry_invoiceId_idx` on `invoiceId` (where not null)
- `TimeEntry_dateRange_idx` on `(workspaceId, userId, startedAt, endedAt)`
- `TimeEntry_running_unique` UNIQUE on `(userId)` where `endedAt IS NULL` (partial unique index — enforces one running timer per user at DB level)

**Constraints:**
- A user can have at most **one** running timer (`endedAt IS NULL`) at a time (enforced at database level via partial unique index `TimeEntry_running_unique`).

---

### Invoice

Billing record generated from time entries. MVP: data only, no document generation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `workspaceId` | UUID | FK → `Workspace.id`, NOT NULL | |
| `projectId` | UUID | FK → `Project.id`, nullable | Optional project scope |
| `title` | VARCHAR(255) | NOT NULL | Invoice title/reference |
| `status` | VARCHAR(20) | NOT NULL, default `'draft'` | `'draft'`, `'sent'`, `'paid'` |
| `dateFrom` | DATE | NOT NULL | Start of billing period |
| `dateTo` | DATE | NOT NULL | End of billing period |
| `hourlyRate` | DECIMAL(10,2) | NOT NULL | Rate per hour |
| `currency` | VARCHAR(3) | NOT NULL | ISO 4217 currency code (snapshot from WorkspaceSettings at creation) |
| `discountPercent` | DECIMAL(5,2) | NOT NULL, default `0` | Optional discount (0–100) |
| `totalHours` | DECIMAL(10,2) | NOT NULL, default `0` | Aggregated from time entries |
| `totalAmount` | DECIMAL(12,2) | NOT NULL, default `0` | Computed: hours × rate − discount |
| `notes` | TEXT | nullable | |
| `createdBy` | UUID | FK → `User.id`, NOT NULL | |
| `createdAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updatedAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:** `Invoice_workspaceId_idx` on `workspaceId`

**Note:** Invoice stores `totalHours` and `totalAmount` as snapshot values at creation time. Individual time entries are linked back to the invoice via `TimeEntry.invoiceId`. If time entries are edited after invoice creation, the invoice totals are **not** automatically recalculated — this is an explicit MVP limitation.

---

### Invite

Pending workspace invitation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `workspaceId` | UUID | FK → `Workspace.id`, NOT NULL | |
| `email` | VARCHAR(255) | NOT NULL | Invited email address |
| `token` | VARCHAR(255) | UNIQUE, NOT NULL | One-time invitation token |
| `invitedBy` | UUID | FK → `User.id`, NOT NULL | Admin who sent invite |
| `role` | VARCHAR(20) | NOT NULL, default `'member'` | Role to assign on acceptance (`admin`, `pm`, `member`) |
| `status` | VARCHAR(20) | NOT NULL, default `'pending'` | `'pending'`, `'accepted'`, `'expired'` |
| `expiresAt` | TIMESTAMPTZ | NOT NULL | Token expiration (default 7 days) |
| `createdAt` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `Invite_token_unique` UNIQUE on `token`
- `Invite_workspaceId_idx` on `workspaceId`
- `Invite_email_status_idx` on `(workspaceId, email, status)`

---

## Enums and Status Values

| Entity | Field | Values |
|---|---|---|
| WorkspaceMember | `role` | `admin`, `pm`, `member` |
| Invite | `role` | `admin`, `pm`, `member` |
| Project | `sourceType` | `github_project`, `github_repo`, `manual` |
| Task | `status` | `open`, `closed` |
| Task | `isManual` | `true` (local), `false` (GitHub-synced) |
| TimeEntry | `source` | `web`, `extension`, `manual` |
| Invoice | `status` | `draft`, `sent`, `paid` |
| Invite | `status` | `pending`, `accepted`, `expired` |
| GitHubConnection | `connected` | `true`, `false` |

All enums are stored as `VARCHAR` with application-level validation via Zod schemas in `packages/shared`.

---

## Cascading Behavior

| Parent → Child | On Delete |
|---|---|
| Workspace → WorkspaceMember | CASCADE |
| Workspace → WorkspaceSettings | CASCADE |
| Workspace → Project | RESTRICT (must delete projects first) |
| Workspace → Invoice | RESTRICT |
| Workspace → Invite | CASCADE |
| Project → Task | RESTRICT (must delete/archive tasks first) |
| Project → ProjectAssignment | CASCADE |
| Task → TimeEntry | RESTRICT (must delete time entries first) |
| Invoice → TimeEntry | SET NULL (deleting invoice unlinks entries) |
| User → TimeEntry | RESTRICT |
| User → WorkspaceMember | CASCADE |
| User → GitHubConnection | CASCADE |
| User → ProjectAssignment | CASCADE |

**Soft deletes:** Projects and Tasks use `isActive` flag instead of hard deletes. Time entries are never deleted by cascade — admins can manually remove them.

---

## Seed Data (Single-Tenant MVP)

On first deployment, a seed migration creates:

1. **Default workspace** — `name: "Default Workspace"`
2. **Default workspace settings** — `currency: "USD"`, `defaultHourlyRate: null`
3. **Initial admin user** — seeded with a preconfigured email and Firebase UID. This admin is the first user in the system.

**Post-deployment flow:**

1. The seeded admin signs in via Firebase Auth (using the preconfigured email).
2. Admin invites other users by email, assigning roles (`member`, `pm`, or `admin`).
3. Invited users sign in via Firebase Auth → User record created → WorkspaceMember created with the assigned role.

All subsequent users are added exclusively via the invite flow.
