# GI Tiempo — MVP Product Proposal

## Overview

GI Tiempo is a time-tracking application for teams that manage work as GitHub Issues inside GitHub Projects. It also supports manual mode for teams without GitHub integration; additional integrations (Jira, Trello, etc.) are planned for future milestones.

For GitHub: users link tracked time directly to issues and projects pulled from their GitHub organizations, providing accurate records for billing, reporting, and capacity planning.

**Inspiration and reference:** [Clockify](https://docs.clockify.me/) — feature set and approach are modeled after Clockify, adapted for deep GitHub integration.

## MVP Scope: Workspace-Scoped Deployment

The MVP now supports creating additional workspaces through the first-owner registration flow. A default workspace may still be seeded on deployment for bootstrap or local environments, but operational data is scoped by the authenticated workspace context rather than by a single seeded workspace assumption.

The data model preserves `workspaceId` foreign keys on all workspace-owned entities, and the current auth/session model already carries workspace context for those scoped records.

---

## Authentication

**Primary authentication:** Firebase Auth with Google SSO and email/password. All users (Members, PMs, Admins) sign in through Firebase Auth. The backend verifies Firebase ID tokens and issues its own JWT access/refresh token pair. A verified first Google or GitHub sign-in creates a personal `Workspace` with default settings and an admin membership only when the resolved account has no memberships; existing memberships are reused. Email-only account adoption requires verified ownership on both identities; an unverified password email cannot be silently adopted by social sign-in. Workspace display names, including `Workspace`, are deliberately reusable. This automatic sign-in does not record consent for workspace emails. Manual registration retains a password-free attempt after an unknown Firebase result; authentication of its exact reserved account can finish its original workspace without duplicate creation. All subsequent API requests use the JWT access token in the `Authorization: Bearer <token>` header.

**GitHub integration:** Users optionally connect their GitHub account via a GitHub App (user-to-server flow) in their profile settings. This is independent of authentication and enables:

- Browsing GitHub Projects and Repositories in the task selector
- Syncing issues as tasks
- Browsing and importing GitHub work for task selection

GitHub connection is optional — users can work exclusively with manual tasks and projects.

A separate verified workspace GitHub App installation authorizes managed timer starts from supported GitHub issue surfaces. It is set up by a workspace administrator and does not require each member to connect GitHub personally; external reference starts have their own default-on path below.

In the future, the same profile-based integration pattern will support Jira, Trello, and other task providers.

---

## Core MVP Features

### 1. GitHub Issues & Projects Integration

Users who connect their GitHub account can access organizations, projects, and issues visible to them in GitHub for browsing and import. The connection uses a **GitHub App** with user-to-server OAuth flow. Managed GitHub-backed timer starts require a separate verified workspace installation; external reference starts do not.

User access tokens expire after 8 hours and are refreshed automatically using a refresh token (valid for 6 months). This follows GitHub's recommended security practice for token rotation.

Data is synced **on-demand**: when a user opens the task selector, the backend queries the GitHub API with the user's token and refreshes the local cache.

**Project = GitHub Project or GitHub Repository.** A project in the application can map to either a GitHub Project (board that groups issues from multiple repos) or a GitHub Repository (issues within a single repo). The default is GitHub Project. Users choose the grouping mode when selecting or creating a project.

The current timer interaction scope uses visible workspace data for task selection through the global top-bar task-picker dialog: **Project → Task**.

**External GitHub reference tracking:** The browser extension can also record time from a supported issue surface when the customer's organization has not installed the GitHub App. This path is enabled by default for an authenticated workspace member and sends the repository, issue number, visible issue title, and canonical issue URL as user-supplied reference data. It does not require a personal GitHub connection, a workspace installation, organization allow-list membership, or an administrator toggle. The first successful start creates a private external-reference project and task atomically; later starts reuse that workspace identity.

Managed imported projects retain installation, mapping, and project-authorization checks. A matching managed mapping never falls back to external recording. An external-reference project is visible to an otherwise unauthorized member only while they have their own time in it, and then exposes only tasks with that member's own entries. Administrators retain full workspace access; explicit project access remains unchanged. Reference projects cannot be converted to managed projects, made public, or rebound after a repository rename or transfer in this release.

### 2. Time Entry

Two modes are available:

- **Timer** — start/stop button that records elapsed wall-clock time against the selected task.
- **Manual interval** — enter start/end time for past work sessions.

Both modes produce a `TimeEntry` record linked to a task and the current user.

### 3. Manual Task & Project Creation

When a task or project does not exist in an external provider (or the user has no connected integration), users can create local work records within the workspace. Admins and Project Managers can create projects; any active member with visibility to an active project can create tasks within that project. Manual tasks coexist with externally synced tasks in the same workspace.

Manual task creation for the current scope stays inside visible workspace projects.

### 4. Reports

Admins and Project Managers generate time reports filtered by:

- Project
- User (member)
- Custom date range

Project Managers see data only for projects they are assigned to. Admins see all projects.

Reports aggregate tracked hours with totals per task, project, and user.

### 5. Invoices (MVP: UI Data Only)

Admins and Project Managers create invoice records from time report data:

- **Formula:** total tracked hours × configurable hourly rate, minus an optional discount.
- Invoices are stored and displayed in the UI with their status (`draft` / `sent` / `paid`).
- PDF/document generation is **deferred** to a later milestone.

### 6. Invite by Email

Admins invite new members by entering an email address. The invited user receives a link, signs in via Firebase Auth (Google or email/password), and explicitly joins the workspace with the assigned role. A pending invitation does not block personal-workspace provisioning and is never accepted by an ordinary login.

### 7. Chrome Extension

A Chrome extension adds **Start/Stop Timer** and other controls directly onto supported GitHub issue surfaces, including standard repository issue pages and GitHub Projects issue panes. The extension authenticates via a popup login flow (Firebase Auth), stores the JWT token in `chrome.storage`, and sends it in the `Authorization` header on all API requests.

**Extension capabilities:**

- Detect the current GitHub issue from the current GitHub issue surface, including direct issue URLs (`org/repo/issues/123`) and supported GitHub Projects issue panes
- Start/stop a timer against that issue
- Display running timer indicator
- Request one reference start using the detected issue context. The server either preserves the existing managed installation-and-access route or records an external reference without GitHub API access.

For a managed GitHub-backed start, the server can materialize the issue only in an existing mapped GiTiempo project and never creates an assignment. For a previously unmapped external reference, the first successful timer start creates the private project/task identity and its own entry in one transaction. A connected personal GitHub account is not required for either path.

## User Roles

### Member

- Signs in with email or Google (Firebase Auth)
- Tracks time against tasks (timer or manual interval)
- Edits own time entries
- Works with visible project tasks through the grouped Projects page and can still view project-scoped team time in assigned projects where the product surfaces it
- Can connect GitHub account for GitHub-based task selection and import
- Can work with manual tasks inside assigned projects without GitHub

### Project Manager

- Signs in with email or Google (Firebase Auth)
- Tracks time (same as Member)
- Accesses admin frontend
- Views team time entries within assigned projects
- Generates reports within assigned projects
- Manages invoices within assigned projects
- Manages work visibility within assigned scope
- Can connect GitHub account

### Admin

- Signs in with email or Google (Firebase Auth)
- Tracks time (same as Member)
- Accesses admin frontend
- Full visibility across all projects
- Manages invites and user roles
- Assigns non-admin workspace users to projects
- Manages workspace settings, GitHub connection policy, and GitHub App installation setup
- Manages app settings

### Capabilities Matrix

| Capability | Admin | Project Manager | Member |
|---|:---:|:---:|:---:|
| Track time (timer/manual) | ✅ | ✅ | ✅ |
| View own time entries | ✅ | ✅ | ✅ |
| Edit own time entries | ✅ | ✅ | ✅ |
| Create manual projects | ✅ | ✅ | ❌ |
| Create manual tasks | ✅ | ✅ (assigned projects) | ✅ (assigned projects) |
| Connect GitHub account | ✅ | ✅ | ✅ |
| View team time entries | ✅ (all) | ✅ (assigned projects) | ✅ (assigned projects, read-only) |
| Access admin frontend | ✅ | ✅ | ❌ |
| Generate reports | ✅ (all) | ✅ (assigned) | ❌ |
| Manage invoices | ✅ (all) | ✅ (assigned) | ❌ |
| Manage work visibility | ✅ | ✅ (assigned) | ❌ |
| Invite members | ✅ | ❌ | ❌ |
| Assign users to projects | ✅ | ❌ | ❌ |
| Manage workspace settings | ✅ | ❌ | ❌ |
| Manage app settings | ✅ | ❌ | ❌ |

## Member Workflows

Members track time through **two independent workflows**:

### Workflow A: Web Application

1. Open the User SPA.
2. Browse and select a task through visible workspace projects and tasks.
3. Start/stop the timer, or log a manual time interval.
4. View and edit own time entries.

### Workflow B: Chrome Extension

1. Navigate to any supported GitHub issue surface.
2. Click **Start Timer** on the injected button.
3. The extension calls the reference-start API. A matching managed project keeps its workspace-installation and access checks; an unmapped external issue can be materialized privately without GitHub setup.
4. Click **Stop Timer** when done.
5. The time entry appears in the User SPA automatically.

---

## Two Frontends

The application ships **two independent single-page applications**:

| Frontend | Audience | Purpose |
|---|---|---|
| **User SPA** | All roles | Timer, time entry list, project/task selection, manual task creation, profile/GitHub connection |
| **Admin SPA** | Admins + PMs | Reports, invoices, team time review, project management. PMs see assigned projects only. |

Both frontends communicate with the same backend API.

---

## Deferred Features

The following are explicitly **out of scope for the MVP**:

- Non-GitHub integrations (Jira, Trello, Asana, etc.)
- PDF/document invoice generation
- Mobile/desktop native applications
- Budgeting and cost limits per project
- Scheduling and capacity planning
- API rate-limit handling beyond basic caching
- Multi-tenant SaaS account switching, tenant isolation controls, and cross-organization administration
- External-reference project conversion, repository rename/transfer rebinding, and merge tooling

**Architectural requirement:** The codebase must support an adapter pattern for task synchronization so that adding future integrations (Jira, Trello, etc.) requires only a new adapter module without modifying core time-tracking logic.

---
