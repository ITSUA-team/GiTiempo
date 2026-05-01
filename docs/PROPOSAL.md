# GI Tiempo — MVP Product Proposal

## Overview

GI Tiempo is a time-tracking application for teams that manage work as GitHub Issues inside GitHub Projects. It also supports manual mode for teams without GitHub integration; additional integrations (Jira, Trello, etc.) are planned for future milestones.

For GitHub: users link tracked time directly to issues and projects pulled from their GitHub organizations, providing accurate records for billing, reporting, and capacity planning.

**Inspiration and reference:** [Clockify](https://docs.clockify.me/) — feature set and approach are modeled after Clockify, adapted for deep GitHub integration.

## MVP Scope: Single-Tenant

The MVP is a **single-tenant** deployment: one instance serves one team. A default workspace is seeded on deployment. All data (users, projects, tasks, time entries) belongs to this single workspace.

The data model preserves `workspaceId` foreign keys on all entities so that migrating to multi-tenant SaaS later requires only enabling workspace creation and adding workspace-scoped auth — no schema redesign.

---

## Authentication

**Primary authentication:** Firebase Auth with Google SSO and email/password. All users (Members, PMs, Admins) sign in through Firebase Auth. The backend verifies Firebase ID tokens and issues its own JWT access/refresh token pair. All subsequent API requests use the JWT access token in the `Authorization: Bearer <token>` header. No GitHub login required.

**GitHub integration:** Users optionally connect their GitHub account via a GitHub App (user-to-server flow) in their profile settings. This is independent of authentication and enables:

- Browsing GitHub Projects and Repositories in the task selector
- Syncing issues as tasks
- Using the Chrome extension on GitHub issue pages

GitHub connection is optional — users can work exclusively with manual tasks and projects.

In the future, the same profile-based integration pattern will support Jira, Trello, and other task providers.

---

## Core MVP Features

### 1. GitHub Issues & Projects Integration

Users who connect their GitHub account can access all organizations, projects, and issues visible to them in GitHub. The connection uses a **GitHub App** with user-to-server OAuth flow. No organization-level installation required.

User access tokens expire after 8 hours and are refreshed automatically using a refresh token (valid for 6 months). This follows GitHub's recommended security practice for token rotation.

Data is synced **on-demand**: when a user opens the task selector, the backend queries the GitHub API with the user's token and refreshes the local cache.

**Project = GitHub Project or GitHub Repository.** A project in the application can map to either a GitHub Project (board that groups issues from multiple repos) or a GitHub Repository (issues within a single repo). The default is GitHub Project. Users choose the grouping mode when selecting or creating a project.

Users select a task for time tracking through a cascading filter: **Organization → Project/Repo → Issue**.

### 2. Time Entry

Two modes are available:

- **Timer** — start/stop button that records elapsed wall-clock time against the selected task.
- **Manual interval** — enter start/end time for past work sessions.

Both modes produce a `TimeEntry` record linked to a task and the current user.

### 3. Manual Task & Project Creation

When a task or project does not exist in an external provider (or the user has no connected integration), users can create local work records within the workspace. Admins and Project Managers can create projects; any active member with visibility to an active project can create tasks within that project. Manual tasks coexist with externally synced tasks in the same workspace.

When creating a manual task, the user can optionally choose to also create it in a connected external provider, such as GitHub, if the integration supports task creation.

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

Admins invite new members by entering an email address. The invited user receives a link, signs in via Firebase Auth (Google or email/password), and joins the workspace with the assigned role.

### 7. Chrome Extension

A Chrome extension adds **Start/Stop Timer** and other controls directly onto GitHub issue pages. The extension authenticates via a popup login flow (Firebase Auth), stores the JWT token in `chrome.storage`, and sends it in the `Authorization` header on all API requests.

**Extension capabilities:**

- Detect the current GitHub issue from the page URL (`org/repo/issues/123`)
- Start/stop a timer against that issue
- Display running timer indicator
- **Auto-create project and task** — if the issue or its project/repo does not yet exist in the application, the extension's API call creates them automatically before starting the timer

**Prerequisite:** The user must have connected their GitHub account in their profile.

## User Roles

### Member

- Signs in with email or Google (Firebase Auth)
- Tracks time against tasks (timer or manual interval)
- Edits own time entries
- Views time entries of other users within assigned projects (read-only, via project view)
- Can connect GitHub account for GitHub-based task selection and Chrome extension
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
- Manages workspace settings and GitHub connection
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
2. Browse or search for a task via cascading filter: Organization → Project/Repo → Issue (if GitHub connected), or select a manual task.
3. Start/stop the timer, or log a manual time interval.
4. View and edit own time entries.

### Workflow B: Chrome Extension

1. Navigate to any GitHub issue page.
2. Click **Start Timer** on the injected button.
3. The extension calls the API — if the project (repo or GitHub project) and task (issue) don't exist yet, they are created automatically.
4. Click **Stop Timer** when done.
5. The time entry appears in the User SPA automatically.

---

## Two Frontends

The application ships **two independent single-page applications**:

| Frontend | Audience | Purpose |
|---|---|---|
| **User SPA** | All roles | Timer, time entry list, task selection, manual task creation, profile/GitHub connection |
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
- Multi-tenant SaaS (single-tenant only, but workspace-ready schema)

**Architectural requirement:** The codebase must support an adapter pattern for task synchronization so that adding future integrations (Jira, Trello, etc.) requires only a new adapter module without modifying core time-tracking logic.

---
