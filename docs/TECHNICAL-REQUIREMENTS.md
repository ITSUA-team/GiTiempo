# Technical Requirements

Build-ready engineering constraints derived from [PROPOSAL.md](./PROPOSAL.md).

---

## 1. Monorepo Structure

```

├── apps/
│   ├── api/              ← NestJS backend
│   ├── user-web/         ← Vue 3 SPA for all users (timer, time entries, profile)
│   ├── admin-web/        ← Vue 3 SPA for admins + PMs (reports, invoices, management)
│   └── chrome-ext/       ← Reserved placeholder for a future browser extension
├── packages/
│   └── shared/           ← shared TypeScript types, constants, Zod schemas
├── turbo.json
├── pnpm-workspace.yaml
└── package.json          ← root workspace scripts only
```

- `pnpm-workspace.yaml` declares `apps/*` and `packages/*`.
- Turborepo orchestrates build pipelines across packages.
- The workspace root owns shared scripts for `dev`, `build`, `typecheck`, `test`, and `lint`.
- TypeScript base compiler settings live in `tsconfig.base.json` and are extended by each app/package.
- OpenSpec lives at the repo root in `openspec/` and organizes behavior specs by domain under `openspec/specs/<domain>/`. See [OPENSPEC.md](./OPENSPEC.md).

---

## 2. Backend — NestJS API

### 2.1 Stack

| Aspect            | Decision                                                       |
| ----------------- | -------------------------------------------------------------- |
| Runtime           | Node.js 22+ with TypeScript                                    |
| Framework         | NestJS (modular monolith)                                      |
| Query builder     | Drizzle ORM (type-safe SQL, schema-as-code)                    |
| Database          | PostgreSQL 16                                                  |
| Validation        | Zod schemas (shared via `packages/shared`)                     |
| API documentation | Swagger / OpenAPI (implemented in `apps/api`, not in web apps) |
| Auth              | Firebase Auth (identity provider) + JWT (API auth)             |
| GitHub            | GitHub App (user-to-server), connected per-user in profile     |

### 2.2 Authentication — JWT Token-Based

All users authenticate via **Firebase Auth** (Google SSO or email/password) on the frontend. The backend **does not handle login UI** — it verifies Firebase ID tokens and issues its own JWT token pair.

See [ADR 002](./adr/002-jwt-authentication.md) for rationale.

**Auth flow:**

```
User → Firebase Auth (Google SSO or email/password) on frontend
                               ↓
                           Frontend receives Firebase ID token (JWT)
                               ↓
                           Frontend sends Firebase ID token to POST /auth/login
                               ↓
                           Backend verifies Firebase ID token via Firebase Admin SDK
                               ↓
                           Backend resolves local user and active workspace membership
                               ↓
                           If no active membership → 401 Unauthorized
                               ↓
                           Backend issues JWT access token (short-lived) + refresh token (long-lived)
                           Access token carries: sub, email, firebaseUid, workspaceId, role
                               ↓
                           Frontend stores tokens in memory (access) and localStorage (refresh)
                               ↓
                           All API requests include: Authorization: Bearer <access_token>
```

**Onboarding model:** Application access is invite-only. New users are added exclusively through the invite-acceptance flow (`POST /invites/accept`). The login endpoint does not create users or memberships - it only issues sessions for users who already have an existing local user record and an active workspace membership.

**Token lifecycle:**

| Token              | Lifetime   | Storage                                               |
| ------------------ | ---------- | ----------------------------------------------------- |
| Access token (JWT) | 15 minutes | Memory (frontend), `chrome.storage` (extension)       |
| Refresh token      | 7 days     | localStorage (frontend), `chrome.storage` (extension) |

**Refresh flow:** When the access token expires, the frontend calls `POST /auth/refresh` with the refresh token. The backend validates the refresh token, rotates it (invalidates old, issues new), and returns a new access/refresh pair.

**CORS:** The backend configures CORS with allowed origins from the `ALLOWED_ORIGINS` environment variable (comma-separated list of frontend URLs).

### 2.3 GitHub Integration — GitHub App (User-to-Server)

GitHub is an **optional integration** that users connect in their profile. It uses a **GitHub App** with user-to-server authentication, following [GitHub's official recommendation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app).

See [ADR 003](./adr/003-github-app-user-to-server.md) for rationale.

**OAuth connection flow:**

```
User → clicks "Connect GitHub" in profile settings
                               ↓
                           Frontend calls GET /github/auth-url (with JWT)
                               ↓
                           Backend creates an unguessable opaque state id backed by
                           github_oauth_states with user binding, PKCE verifier,
                           expiry, and unconsumed status
                           Backend returns GitHub OAuth authorization URL with state id
                           and PKCE challenge
                               ↓
                          Browser navigates to GitHub → user authorizes the app
                               ↓
                           GitHub redirects to GET /github/callback?code=...&state=...
                          (browser redirect — no Authorization header)
                               ↓
                           Backend validates the opaque state id against github_oauth_states,
                           checks expiry, consumes it once, and identifies the bound user
                          Backend exchanges `code` for GitHub user access token + refresh token
                          Backend stores encrypted tokens in GitHubConnection
                               ↓
                           Backend redirects user to USER_SPA_URL/profile
```

**Note:** The callback endpoint is unauthenticated (browser redirect from GitHub). User identification relies on the validated server-side OAuth state row, not on the GiTiempo JWT or a self-contained signed state JWT.

**Token lifecycle (per GitHub docs):**

| Token type        | Prefix | Lifetime                    |
| ----------------- | ------ | --------------------------- |
| User access token | `ghu_` | 8 hours (28800 seconds)     |
| Refresh token     | `ghr_` | 6 months (15897600 seconds) |

**On-demand sync (lazy):**

- Projects and tasks are provider-neutral core records. External provider identity is stored in external reference tables, not as `github_*` fields on core records.
- GitHub is the MVP sync adapter and populates `project_external_refs` / `task_external_refs` with `provider = 'github'`.
- The backend maintains a local cache. Stale data is refreshed on the next request.
- No background jobs or webhooks for sync in MVP — the user's action triggers the refresh.

### 2.4 Role-Based Access Control

Three roles: `admin`, `pm`, `member`.

| Guard               | Logic                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `AuthGuard`         | Verifies JWT access token from `Authorization` header. Attaches `user` to request.                         |
| `RoleGuard`         | Checks `WorkspaceMember.role` against required roles.                                                      |
| `ProjectScopeGuard` | For project-scoped endpoints: admins have implicit access; `pm` and `member` users need assignment to an active project. |

**Admin endpoints** require `role = 'admin'`.
**PM management endpoints** require `role IN ('admin', 'pm')`; PMs are limited to assigned projects.
**Member project endpoints** require any authenticated user with project visibility.
**Project assignment endpoints** are admin-only; assignment targets may be `pm` or `member` users. Assignments remain valid if a user changes between `pm` and `member`.

### 2.5 API Design Principles

- RESTful endpoints, JSON request/response.
- All validation uses Zod schemas from `packages/shared`.
- Role-based access control via NestJS guards.
- Standard error response format: `{ error: string, message: string, statusCode: number }`.
- Full endpoint contract: see [API-ENDPOINTS.md](./API-ENDPOINTS.md).

### 2.6 Migration & Seed Rules

- Each migration is a single `.ts` file exporting `up()` and `down()`.
- Migrations run automatically on API startup (configurable).
- **Seed data** in `apps/api/src/db/seeds/` — only for development/staging.
- Production seed: default workspace + initial admin user (preconfigured email/Firebase UID).

### 2.7 Swagger / OpenAPI Plan

- Swagger is an API concern and will be added when `apps/api` is initialized.
- The web apps do not install Swagger dependencies.
- During the current frontend bootstrap phase, the source of truth for shared contracts is `packages/shared`.
- `packages/shared` exports TypeScript types and Zod schemas that can be consumed by both SPAs and the future API.
- Frontend-only theme/bootstrap code lives in `packages/web-config` so the API is not coupled to PrimeVue or Tailwind setup.
- When the NestJS API is bootstrapped, it should publish Swagger / OpenAPI docs for external API documentation while continuing to reuse the shared contracts where practical.

---

## 3. Frontend — Vue 3 SPAs

Both User SPA and Admin SPA share the same stack:

| Aspect            | Decision                                              |
| ----------------- | ----------------------------------------------------- |
| Framework         | Vue 3 Composition API + `<script setup>`              |
| State management  | Pinia (stores in `src/stores/`)                       |
| Composables       | VueUse for browser APIs, timers, async state          |
| Component library | PrimeVue (forms, tables, overlays, dialogs)           |
| Styling           | Tailwind CSS (utility-first)                          |
| Router            | Vue Router                                            |
| HTTP client       | Axios (or fetch wrapper from shared package)          |
| Auth              | Firebase Auth SDK (client-side) → JWT tokens from API |

### 3.0 Frontend Platform Baseline

The current web frontend baseline includes:

- Vite + Vue 3 + TypeScript for both `apps/user-web` and `apps/admin-web`
- Tailwind CSS v4 using CSS-first `@theme` setup
- PrimeVue v4 styled mode with a shared Aura-derived preset
- Pinia, Vue Router, VueUse, Heroicons, and PrimeIcons installed and connected
- Shared contract exports from `packages/shared`
- Shared frontend theme/bootstrap exports from `packages/web-config`
- Both SPAs are expected to use the same frontend auth model: Firebase sign-in, backend token exchange, refresh-token bootstrap, and logout cleanup
- `apps/user-web` currently has route structure for login and authenticated pages mounted through an app shell
- `apps/user-web` currently has the frontend auth wiring in place: Firebase email/password or Google sign-in, `POST /auth/login` token exchange, `GET /users/me` profile bootstrap, `POST /auth/refresh` session restore, and `POST /auth/logout` cleanup
- Focused Vitest coverage in `apps/user-web` for auth store and router-guard behavior
- `apps/admin-web` follows the same JWT session direction as `apps/user-web`, even where concrete route/screen implementation is still catching up

### 3.1 User SPA (`apps/user-web/`)

**Pages:**

- Dashboard — active timer, recent time entries
- Timer — task selector (visible project → task), start/stop
- Time Entries — list, edit, delete own entries
- Project View — visible project members' time entries (read-only)
- Profile — display name, GitHub connection (connect/disconnect)

### 3.2 Admin SPA (`apps/admin-web/`)

**Pages:**

- Dashboard — workspace overview, summary stats
- Reports — filter by project/user/date range, aggregated tables (PM: assigned projects only)
- Invoices — create, view status, list (PM: assigned projects only)
- Members — invite, manage roles, assign users to projects (Admin only)
- Projects — manage project visibility, member assignments, and assigned-member filtering (Admin only)
- Settings — workspace config: name, currency, default hourly rate (Admin only)

### 3.3 Shared UI Patterns

- Both SPAs import `packages/shared` for types and validation schemas.
- Both SPAs import `packages/web-config` for shared PrimeVue and Tailwind bootstrap configuration.
- Common UI patterns (avatars, date pickers, task selectors) can be extracted to a shared UI package later if duplication becomes problematic.
- Both SPAs use the same JWT-based auth flow - Firebase Auth login, exchange the Firebase ID token at `POST /auth/login`, then use the returned JWT access token for API requests.
- Both SPAs should expose visible cross-links to the counterpart workspace so users can switch between `user-web` and `admin-web` from the shell/login surfaces rather than relying on manual URL changes.

---

## 4. Chrome Extension (`apps/chrome-ext/`)

**Architecture:**

- Manifest V3 extension.
- Content script injected on `github.com/*/issues/*` pages.
- Detects issue from page URL (`org/repo/issues/123`).
- Authenticates via a popup login flow (Firebase Auth), stores JWT tokens in `chrome.storage`.
- Sends JWT access token in `Authorization` header on all API requests.

**Auto-create flow (lazy creation):**

When the user clicks "Start Timer" on a GitHub issue page, the extension sends a single API request. The backend handles creation automatically:

```
POST /api/time-entries/timer/start-from-github
Body: { githubRepo: "org/repo", issueNumber: 123, issueTitle: "Bug fix..." }

Backend logic:
1. Find or create Project for "org/repo" and link it through `project_external_refs` (`provider: 'github'`, `external_type: 'repository'`, `external_key: 'org/repo'`)
2. Find or create Task for issue #123 within that project and link it through `task_external_refs` (`provider: 'github'`, `external_type: 'issue'`, `external_key: 'org/repo#123'`)
3. Create TimeEntry (running timer) linked to the task and user
4. Return the time entry
```

This means the **first person to start a timer on any GitHub issue** automatically creates provider-neutral project and task records plus GitHub external refs. Subsequent users on the same issue will find the existing records through those refs. No manual setup required.

---

## 5. Shared Package (`packages/shared/`)

Contains:

- **TypeScript interfaces** — all API request/response shapes (`TimeEntry`, `Workspace`, `Task`, etc.).
- **Zod schemas** — runtime validation matching the TypeScript types.
- **Constants** — status enums, role definitions, error codes.
- **Utility functions** — date formatting, duration calculations.

Both the API and both SPAs depend on this package.

Current bootstrap contents include:

- `src/contracts/` for shared TypeScript + Zod definitions

## 5.1 Web Config Package (`packages/web-config/`)

Contains frontend-only bootstrap configuration shared by `user-web` and `admin-web`:

- PrimeVue preset and app install options
- Shared Tailwind token stylesheet

Only frontend applications should depend on this package.

---

## 6. Deployment

| Component        | Strategy                                                            |
| ---------------- | ------------------------------------------------------------------- |
| API              | Docker container, deployed via Docker Compose on VPS                |
| User SPA         | Cloudflare Workers Static Assets                                    |
| Admin SPA        | Cloudflare Workers Static Assets                                    |
| Chrome Extension | Chrome Web Store (manual publish)                                   |
| Database         | PostgreSQL on VPS (Docker Compose service)                          |
| Firebase         | Firebase project (Auth service only, free tier)                     |
| GitHub App       | Configured in GitHub Developer Settings, callback URL points to API |

Deployment workflows are defined in [deployment.md](./deployment.md). Frontend hosting is recorded in [ADR 005](./adr/005-cloudflare-workers-static-assets.md), and API hosting is recorded in [ADR 006](./adr/006-api-vps-docker-compose.md).

---

## 7. Task Sync Adapter Architecture

The codebase uses an adapter interface for task synchronization so that future integrations (Jira, Trello, etc.) only require a new adapter implementation.

```
TaskSyncAdapter (interface)
├── GitHubAdapter      ← MVP: syncs GitHub issues via user-to-server token
├── (future) JiraAdapter
├── (future) TrelloAdapter
└── ManualAdapter      ← local tasks with no external sync
```

Each adapter implements:

- `syncTasks(projectId, userToken)` — pull tasks from external system into the project
- `createTask(projectId, data, userToken)` — create task in external system (if supported)
- `resolveTask(externalRef)` — find or create a local task from an external reference (used by Chrome Extension auto-create)

Adapters MUST keep provider-specific identifiers, URLs, and raw metadata in `project_external_refs` and `task_external_refs`. Core `projects` and `tasks` remain integration-neutral so future providers do not require schema changes to the core work-tracking model.

---

## 8. Testing Strategy

**Unit tests:** Vitest for all packages. Business logic, Zod schemas, utility functions.

**Integration tests:** NestJS testing utilities + ephemeral PostgreSQL in Docker. Cover auth flows, RBAC guards, time entry CRUD, GitHub sync adapter. API integration/e2e tests must not use a developer local database, staging database, production database, or any shared persistent CI database.

**E2E tests (deferred post-MVP):** Playwright for critical user flows (login, timer start/stop, report generation).

**Convention:** Tests co-located with source files (`*.spec.ts`). CI runs lint, typecheck, unit tests, and API integration/e2e tests when backend or shared contracts change. The test isolation decision is recorded in [ADR 007](./adr/007-ci-ephemeral-postgres.md), and the automated test process is defined in [testing.md](./testing.md).

---

## 9. Logging & Observability

**Structured logging:** All backend logs are JSON-formatted using a NestJS logger (e.g. `nestjs-pino`). Each log line includes: `timestamp`, `level`, `message`, `requestId`, `userId`, `module`.

**Log levels:** `error`, `warn`, `info`, `debug`. Production runs at `info` level.

**Metrics:** Expose a `/metrics` endpoint (Prometheus format) via `@willsoto/nestjs-prometheus` or equivalent. Key metrics:

- HTTP request duration (histogram, by method/route/status)
- Active timers count (gauge)
- GitHub API call count and latency (counter/histogram)
- Auth token refresh count (counter)

**Health check:** `GET /commons/health/ready` — returns DB connectivity status. `GET /commons/health/live` is the liveness probe. Used by Docker Compose health checks and external monitoring.

**Log collection:** JSON logs are written to stdout. In production, collected by any standard log aggregator (Loki, Fluentd, ELK) from Docker container stdout.

---

## 10. Error Handling

> TBD — will define error taxonomy, retry policies, and client-side error handling before first sprint.

---

## 11. CI/CD Pipeline

GitHub Actions is the CI/CD orchestrator. Workflows must support manual `workflow_dispatch` runs and automatic deployment from the `staging` branch.

Frontend deploy workflows build and deploy `apps/user-web` and `apps/admin-web` independently to Cloudflare Workers Static Assets. API deploy workflows build a Docker image, validate it against an ephemeral PostgreSQL database, push it to a registry, and deploy it to the VPS through Docker Compose.

See [deployment.md](./deployment.md) and [testing.md](./testing.md) for trigger rules, test gates, and release order.

---

## 12. Environment Variables

The API requires the following environment variables:

| Variable                   | Description                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | PostgreSQL connection string                                                                          |
| `ALLOWED_ORIGINS`          | Comma-separated list of allowed CORS origins (e.g. `https://app.tiempo.com,https://admin.tiempo.com`) |
| `JWT_ACCESS_SECRET`        | Secret for signing JWT access tokens                                                                  |
| `JWT_REFRESH_SECRET`       | Secret for signing JWT refresh tokens                                                                 |
| `FIREBASE_PROJECT_ID`      | Firebase project ID                                                                                   |
| `FIREBASE_PRIVATE_KEY`     | Firebase Admin SDK private key (PEM)                                                                  |
| `FIREBASE_CLIENT_EMAIL`    | Firebase Admin SDK client email                                                                       |
| `GITHUB_APP_ID`            | GitHub App ID (from app settings page)                                                                |
| `GITHUB_APP_CLIENT_ID`     | GitHub App client ID                                                                                  |
| `GITHUB_APP_CLIENT_SECRET` | GitHub App client secret                                                                              |
| `ENCRYPTION_KEY`           | Key for AES-encrypting stored GitHub tokens                                                           |
| `APP_URL`                  | Public URL of the API (for OAuth callback)                                                            |
| `USER_WEB_URL`             | Public URL of the User SPA                                                                            |
| `ADMIN_WEB_URL`            | Public URL of the Admin SPA                                                                           |
| `SEED_ADMIN_EMAIL`         | Email of the initial admin user (used by seed migration)                                              |
| `SEED_ADMIN_FIREBASE_UID`  | Firebase UID of the initial admin user                                                                |
| `SMTP_HOST`                | SMTP server host (email notifications)                                                                |
| `SMTP_PORT`                | SMTP server port                                                                                      |
| `SMTP_USER`                | SMTP username                                                                                         |
| `SMTP_PASSWORD`            | SMTP password                                                                                         |
| `EMAIL_FROM`               | From address for outgoing emails                                                                      |
| `LOG_LEVEL`                | Logging level: `error`, `warn`, `info`, `debug` (default: `info`)                                     |
