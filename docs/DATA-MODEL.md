# Data Model

Entity definitions and relationships for GI Tiempo.

**MVP scope:** Single-tenant. A default workspace is seeded on deployment. All entities reference `workspace_id` to simplify future multi-tenant migration.

---

## Entity-Relationship Diagram

```
┌──────────────┐       ┌─────────────────────┐       ┌──────────────┐       ┌───────────────────┐
│  workspaces  │──1:N──│ workspace_members   │──N:1──│    users     │──1:0..1│github_connections│
└──────┬───────┘       └─────────────────────┘       └──────┬───────┘       └───────────────────┘
       │                                                    │
       │ 1:N                                                │ 1:N
       ▼                                                    ▼
┌──────────────┐       ┌───────────────────┐       ┌──────────────┐
│   projects   │──1:N──│project_assignments│──N:1──│ time_entries  │
└──────┬───────┘       │ (User → Project)  │       └──────┬───────┘
       │               │has workspace_id   │              │ │
       │ 1:N           └───────────────────┘              │ │ N:0..1
       ▼                                                  │ │
┌──────────────┐                                          │ ▼
│    tasks     │──────────────────────────────────────────┘ ┌──────────────┐
│has workspace_id│     (N:1)                                │   invoices   │
└──────┬───────┘                                            └──────────────┘
       │
       │ 1:N
       ▼
┌─────────────────────┐
│ task_external_refs  │
└─────────────────────┘

┌────────────────────────┐
│ project_external_refs  │──N:1── projects
└────────────────────────┘

┌──────────────┐       ┌────────────────────┐
│   invites    │       │workspace_settings  │──1:1── workspaces
└──────────────┘       └────────────────────┘

  workspaces owns: projects, invoices, invites, workspace_settings, workspace_members
  Denormalized workspace_id on: tasks, time_entries, project_assignments, external refs
  github_connections belongs to users (workspace-independent)
```

---

## Entities

### User (`users`)

A person authenticated via Firebase Auth (Google SSO or email/password). GitHub connection is optional and stored separately in `github_connections`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | Internal identifier |
| `firebase_uid` | VARCHAR(128) | UNIQUE, NOT NULL | Firebase Auth UID |
| `email` | VARCHAR(255) | NOT NULL | Email from Firebase Auth |
| `display_name` | VARCHAR(255) | | Display name |
| `avatar_url` | TEXT | | Avatar URL (from Google or uploaded) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `users_firebase_uid_unique` UNIQUE on `firebase_uid`
- `users_email_lookup_unique` UNIQUE on `lower(btrim(email))`

---

### GitHubConnection (`github_connections`)

Stores the user's GitHub App connection. Optional — users can work with manual tasks without GitHub. Connected via user-to-server OAuth flow in profile settings.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `user_id` | UUID | FK → `users.id`, UNIQUE, NOT NULL | One connection per user |
| `github_user_id` | BIGINT | NOT NULL | GitHub user ID |
| `login` | VARCHAR(255) | NOT NULL | GitHub username |
| `avatar_url` | TEXT | | GitHub avatar URL |
| `access_token_encrypted` | TEXT | | AES-encrypted GitHub user access token (prefix `ghu_`) |
| `refresh_token_encrypted` | TEXT | | AES-encrypted GitHub refresh token (prefix `ghr_`) |
| `token_expires_at` | TIMESTAMPTZ | | When the current access token expires |
| `connected` | BOOLEAN | NOT NULL, default `true` | `false` if user disconnected or token revoked |
| `connected_at` | TIMESTAMPTZ | NOT NULL, default `now()` | When GitHub was first connected |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `github_connections_user_id_unique` UNIQUE on `user_id`
- `github_connections_github_user_id_idx` on `github_user_id`

---

### Workspace (`workspaces`)

A grouping container. In MVP, a single default workspace is seeded on deployment. All data belongs to it. Future SaaS will allow multiple workspaces per deployment.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `name` | VARCHAR(255) | NOT NULL | Workspace display name |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `workspaces_name_lookup_unique` UNIQUE on `lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))`

**Notes:**
- Workspace-name availability is global for MVP and is checked against the normalized lookup value above, not the raw display string.

---

### WorkspaceSettings (`workspace_settings`)

Per-workspace configuration. One settings record per workspace, created automatically with the workspace.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `workspace_id` | UUID | FK → `workspaces.id`, UNIQUE, NOT NULL | One settings record per workspace |
| `currency` | VARCHAR(3) | NOT NULL, default `'USD'` | ISO 4217 currency code |
| `default_hourly_rate` | DECIMAL(10,2) | nullable | Nullable workspace billing default for invoice creation |
| `time_zone` | VARCHAR(64) | NOT NULL, default `'UTC'` | IANA time-zone identifier for workspace calendar periods |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Notes:**

- `default_hourly_rate` is a default only. Invoice creation copies the selected hourly rate into `invoices.hourly_rate`; later workspace setting changes do not retroactively update existing invoices.
- `time_zone` defines how workspace calendar periods such as days, weeks, report ranges, and invoice date ranges are interpreted. Stored timestamps remain timestamptz values.

**Indexes:**
- `workspace_settings_workspace_id_unique` UNIQUE on `workspace_id`

---

### WorkspaceMember (`workspace_members`)

Joins users to workspaces with a role. In single-tenant MVP, each user has exactly one membership (in the default workspace).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `workspace_id` | UUID | FK → `workspaces.id`, NOT NULL | |
| `user_id` | UUID | FK → `users.id`, NOT NULL | |
| `role` | VARCHAR(20) | NOT NULL, default `'member'` | `'admin'`, `'pm'`, or `'member'` |
| `joined_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `workspace_members_workspace_id_user_id_unique` UNIQUE on `(workspace_id, user_id)`
- `workspace_members_user_id_idx` on `user_id`

---

### Project (`projects`)

Groups tasks within a workspace. Projects are provider-neutral core records: a project may be purely local, or it may be linked to one or more external providers through `project_external_refs`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `workspace_id` | UUID | FK → `workspaces.id`, NOT NULL | |
| `name` | VARCHAR(255) | NOT NULL | Project display name |
| `color` | VARCHAR(7) | | Hex color code (e.g. `#FF5733`) |
| `visibility` | VARCHAR(20) | NOT NULL, default `'private'` | `'public'` or `'private'` |
| `is_active` | BOOLEAN | NOT NULL, default `true` | Soft-disable project |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `projects_workspace_id_idx` on `workspace_id`
- `projects_workspace_id_active_idx` on `(workspace_id, is_active)`
- `projects_workspace_active_visibility_idx` on `(workspace_id, is_active, visibility)`

**Notes:**
- New projects are private by default.
- Local/manual projects have no external reference rows.
- Provider-specific identifiers, URLs, and sync metadata live in `project_external_refs`.
- API `source` values are derived from `project_external_refs`; provider-specific source columns do not belong in `projects`.

---

### ProjectExternalRef (`project_external_refs`)

Links a core project to an external provider object, such as a GitHub repository or GitHub Project V2 board. This keeps the project table stable when future integrations such as Jira or Trello are added.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `workspace_id` | UUID | FK → `workspaces.id`, NOT NULL | Denormalized from project for multi-tenant queries |
| `project_id` | UUID | FK → `projects.id`, NOT NULL | Linked core project |
| `provider` | VARCHAR(50) | NOT NULL | Integration provider, e.g. `github` |
| `external_type` | VARCHAR(50) | NOT NULL | Provider object type, e.g. `repository`, `project_v2` |
| `external_id` | VARCHAR(255) | nullable | Stable provider ID when available; stored as string to avoid numeric precision issues |
| `external_key` | VARCHAR(500) | NOT NULL | Human-readable lookup key, e.g. `owner/repo` |
| `external_url` | TEXT | nullable | Canonical provider URL |
| `metadata` | JSONB | NOT NULL, default `'{}'` | Provider-specific fields not needed for core queries |
| `synced_at` | TIMESTAMPTZ | nullable | Last successful sync from the provider |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `project_external_refs_project_id_idx` on `project_id`
- `project_external_refs_workspace_provider_key_unique` UNIQUE on `(workspace_id, provider, external_type, external_key)`
- `project_external_refs_workspace_provider_id_idx` on `(workspace_id, provider, external_type, external_id)` where `external_id` is not null

**Notes:**
- GitHub repository auto-create uses `provider = 'github'`, `external_type = 'repository'`, and `external_key = 'owner/repo'`.
- GitHub-specific fields such as repository ID, project number, or organization login belong here or in `metadata`, not in `projects`.

---

### ProjectAssignment (`project_assignments`)

Links workspace users to specific projects. Assignments grant non-admin access to private projects and to any assigned active projects. Admins have implicit access to all projects and are not listed here.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `project_id` | UUID | FK → `projects.id`, NOT NULL | |
| `user_id` | UUID | FK → `users.id`, NOT NULL | Must be an active workspace member with role `pm` or `member` at assignment time |
| `workspace_id` | UUID | FK → `workspaces.id`, NOT NULL | Denormalized from project for multi-tenant queries |
| `assigned_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `assigned_by` | UUID | FK → `users.id`, NOT NULL | Admin who assigned |

**Indexes:**
- `project_assignments_project_id_user_id_unique` UNIQUE on `(project_id, user_id)`
- `project_assignments_user_id_idx` on `user_id`
- `project_assignments_workspace_id_idx` on `workspace_id`

**Notes:**
- Active public projects are visible to non-admin users without assignment.
- Private projects require assignment for `pm` and `member` users.
- Assignments remain valid when a user changes between `pm` and `member`; the role controls allowed actions, while the assignment controls private-project access.
- Admins manage assignments but do not need assignment rows for project access.

---

### Task (`tasks`)

A trackable unit of work. Every task belongs to a project. Tasks are provider-neutral core records: a task may be purely local, or it may be linked to one or more external provider work items through `task_external_refs`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `project_id` | UUID | FK → `projects.id`, NOT NULL | |
| `workspace_id` | UUID | FK → `workspaces.id`, NOT NULL | Denormalized from project for multi-tenant queries |
| `title` | TEXT | NOT NULL | Task title |
| `status` | VARCHAR(20) | NOT NULL, default `'open'` | `'open'` or `'closed'` |
| `is_active` | BOOLEAN | NOT NULL, default `true` | Soft-disable task |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `tasks_project_id_idx` on `project_id`
- `tasks_workspace_id_idx` on `workspace_id`
- `tasks_workspace_project_active_idx` on `(workspace_id, project_id, is_active)`

**Notes:**
- Local/manual tasks have no external reference rows.
- Provider-specific issue, card, ticket, URL, and sync metadata live in `task_external_refs`.

---

### TaskExternalRef (`task_external_refs`)

Links a core task to an external provider work item, such as a GitHub issue. This keeps task tracking independent from any single integration provider.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `workspace_id` | UUID | FK → `workspaces.id`, NOT NULL | Denormalized from task/project for multi-tenant queries |
| `project_id` | UUID | FK → `projects.id`, NOT NULL | Denormalized for provider lookups within project scope |
| `task_id` | UUID | FK → `tasks.id`, NOT NULL | Linked core task |
| `provider` | VARCHAR(50) | NOT NULL | Integration provider, e.g. `github` |
| `external_type` | VARCHAR(50) | NOT NULL | Provider object type, e.g. `issue` |
| `external_id` | VARCHAR(255) | nullable | Stable provider ID when available; stored as string to avoid numeric precision issues |
| `external_key` | VARCHAR(500) | NOT NULL | Human-readable lookup key, e.g. `owner/repo#123` |
| `external_url` | TEXT | nullable | Canonical provider URL |
| `metadata` | JSONB | NOT NULL, default `'{}'` | Provider-specific fields not needed for core queries |
| `synced_at` | TIMESTAMPTZ | nullable | Last successful sync from the provider |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `task_external_refs_task_id_idx` on `task_id`
- `task_external_refs_workspace_provider_key_unique` UNIQUE on `(workspace_id, provider, external_type, external_key)`
- `task_external_refs_workspace_provider_id_idx` on `(workspace_id, provider, external_type, external_id)` where `external_id` is not null

**Notes:**
- GitHub issue auto-create uses `provider = 'github'`, `external_type = 'issue'`, and `external_key = 'owner/repo#123'`.
- GitHub-specific fields such as issue number, issue node ID, or repository full name belong here or in `metadata`, not in `tasks`.

---

### TimeEntry (`time_entries`)

The core record. Represents a period of tracked time.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `task_id` | UUID | FK → `tasks.id`, NOT NULL | |
| `user_id` | UUID | FK → `users.id`, NOT NULL | Who tracked this time |
| `workspace_id` | UUID | FK → `workspaces.id`, NOT NULL | Denormalized from task→project for multi-tenant queries |
| `started_at` | TIMESTAMPTZ | NOT NULL | Timer start or manual start |
| `ended_at` | TIMESTAMPTZ | nullable | null = timer currently running |
| `duration_seconds` | INT | nullable | Computed: `ended_at - started_at` in seconds. null if running. |
| `description` | TEXT | nullable | Optional note |
| `is_billable` | BOOLEAN | NOT NULL, default `true` | |
| `source` | VARCHAR(20) | NOT NULL, default `'web'` | `'web'`, `'extension'`, or `'manual'` |
| `invoice_id` | UUID | FK → `invoices.id`, nullable | Linked invoice (set when invoice is generated) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `time_entries_task_id_idx` on `task_id`
- `time_entries_user_id_idx` on `user_id`
- `time_entries_workspace_id_idx` on `workspace_id`
- `time_entries_invoice_id_idx` on `invoice_id` (where not null)
- `time_entries_date_range_idx` on `(workspace_id, user_id, started_at, ended_at)`
- `time_entries_running_unique` UNIQUE on `(user_id)` where `ended_at IS NULL` (partial unique index — enforces one running timer per user at DB level)

**Constraints:**
- A user can have at most **one** running timer (`ended_at IS NULL`) at a time (enforced at database level via partial unique index `time_entries_running_unique`).

---

### Invoice (`invoices`)

Billing record generated from time entries. MVP: data only, no document generation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `workspace_id` | UUID | FK → `workspaces.id`, NOT NULL | |
| `project_id` | UUID | FK → `projects.id`, nullable | Optional project scope |
| `title` | VARCHAR(255) | NOT NULL | Invoice title/reference |
| `status` | VARCHAR(20) | NOT NULL, default `'draft'` | `'draft'`, `'sent'`, `'paid'` |
| `date_from` | DATE | NOT NULL | Start of billing period |
| `date_to` | DATE | NOT NULL | End of billing period |
| `hourly_rate` | DECIMAL(10,2) | NOT NULL | Rate per hour (snapshot from user input or `workspace_settings.default_hourly_rate`) |
| `currency` | VARCHAR(3) | NOT NULL | ISO 4217 currency code (snapshot from `workspace_settings` at creation) |
| `discount_percent` | DECIMAL(5,2) | NOT NULL, default `0` | Optional discount (0–100) |
| `total_hours` | DECIMAL(10,2) | NOT NULL, default `0` | Aggregated from time entries |
| `total_amount` | DECIMAL(12,2) | NOT NULL, default `0` | Computed: hours x rate - discount |
| `notes` | TEXT | nullable | |
| `created_by` | UUID | FK → `users.id`, NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:** `invoices_workspace_id_idx` on `workspace_id`

**Note:** Invoice stores `hourly_rate`, `currency`, `total_hours`, and `total_amount` as snapshot values at creation time. Individual time entries are linked back to the invoice via `time_entries.invoice_id`. If time entries are edited after invoice creation, the invoice totals are **not** automatically recalculated — this is an explicit MVP limitation.

---

### Invite (`invites`)

Pending workspace invitation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | |
| `workspace_id` | UUID | FK → `workspaces.id`, NOT NULL | |
| `email` | VARCHAR(255) | NOT NULL | Invited email address |
| `token` | VARCHAR(255) | UNIQUE, NOT NULL | One-time invitation token |
| `invited_by` | UUID | FK → `users.id`, NOT NULL | Admin who sent invite |
| `role` | VARCHAR(20) | NOT NULL, default `'member'` | Role to assign on acceptance (`admin`, `pm`, `member`) |
| `status` | VARCHAR(20) | NOT NULL, default `'pending'` | `'pending'`, `'accepted'`, `'expired'` |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Token expiration (default 7 days) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `invites_token_unique` UNIQUE on `token`
- `invites_workspace_id_idx` on `workspace_id`
- `invites_email_status_idx` on `(workspace_id, email, status)`

---

## Enums and Status Values

| Table | Field | Values |
|---|---|---|
| `workspace_members` | `role` | `admin`, `pm`, `member` |
| `invites` | `role` | `admin`, `pm`, `member` |
| `tasks` | `status` | `open`, `closed` |
| `time_entries` | `source` | `web`, `extension`, `manual` |
| `invoices` | `status` | `draft`, `sent`, `paid` |
| `invites` | `status` | `pending`, `accepted`, `expired` |
| `github_connections` | `connected` | `true`, `false` |
| `project_external_refs`, `task_external_refs` | `provider` | application-validated integration key, e.g. `github` |

All enums are stored as `VARCHAR` with application-level validation via Zod schemas in `packages/shared`.

---

## Cascading Behavior

| Parent → Child | On Delete |
|---|---|
| `workspaces` → `workspace_members` | CASCADE |
| `workspaces` → `workspace_settings` | CASCADE |
| `workspaces` → `projects` | RESTRICT (must delete projects first) |
| `workspaces` → `invoices` | RESTRICT |
| `workspaces` → `invites` | CASCADE |
| `projects` → `tasks` | RESTRICT (must delete/archive tasks first) |
| `projects` → `project_assignments` | CASCADE |
| `projects` → `project_external_refs` | CASCADE |
| `tasks` → `task_external_refs` | CASCADE |
| `tasks` → `time_entries` | RESTRICT (must delete time entries first) |
| `invoices` → `time_entries` | SET NULL (deleting invoice unlinks entries) |
| `users` → `time_entries` | RESTRICT |
| `users` → `workspace_members` | CASCADE |
| `users` → `github_connections` | CASCADE |
| `users` → `project_assignments` | CASCADE through workspace membership removal |

**Delete behavior:** Projects use `is_active` for archive/unarchive behavior. Tasks may be permanently deleted only when no `time_entries` row references them; this hard-delete rule overrides the previous task soft-delete default for unused tasks. Tasks that have related time entries must remain stored and may only be deactivated with `is_active = false`. Time entries are never deleted by cascade — admins can manually remove them.

---

## Seed Data (Single-Tenant MVP)

On first deployment, a seed migration creates:

1. **Default workspace** — `name: "Default Workspace"`
2. **Default workspace settings** — `currency: "USD"`, `default_hourly_rate: null`, `time_zone: "UTC"`
3. **Initial admin user** — seeded with a preconfigured email and Firebase UID. This admin is the first user in the system.

**Post-deployment flow:**

1. The seeded admin signs in via Firebase Auth (using the preconfigured email).
2. Admin invites other users by email, assigning roles (`member`, `pm`, or `admin`).
3. Invited users sign in via Firebase Auth → `users` record created → `workspace_members` record created with the assigned role.

All subsequent users are added exclusively via the invite flow.
