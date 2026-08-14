## Why

Teams that plan in Jira cannot track time in GiTiempo the way GitHub-planning teams already can. The GitHub connector lets a member connect their account, browse the boards their workspace has approved, and start a timer on an issue with the project and task materialized server-side. Issue #387 asked for the Jira equivalent; this change delivers the same connector shape against Jira Cloud.

The data model was built for this from the start: `project_external_refs` and `task_external_refs` carry a `provider` column, and the data-model spec requires provider-neutral core records. Nothing GitHub-specific has to be unwound — Jira becomes the second value of an existing dimension.

## What Changes

- A member connects their Atlassian account through OAuth 2.0 (3LO), mirroring the GitHub connection: status, authorization URL, callback, encrypted token storage, disconnect. Atlassian tokens expire hourly and refresh tokens rotate, so refresh is part of the foundation, not an afterthought.
- An admin approves which Jira **site** (cloud instance) the workspace works against, mirroring the GitHub organization policy. Browsing and materialization refuse work outside the approved site.
- Connected members browse Jira projects and their issues, read-only, through the approved site.
- The top-bar timer picker offers approved Jira projects as targets beside GitHub boards. Picking an issue starts a timer; the server creates or reuses the GiTiempo project and task under `provider: 'jira'`, following the same one-container-one-project rule the GitHub connector enforces.
- The Add Project page can import a Jira project as a GiTiempo project, with the same refusal when it is already tracked.

### Out of scope

- Jira sign-in (the `github-signin` counterpart). Connecting Jira is for tracking, not authentication.
- Browser-extension injection on Jira pages.
- Webhooks and two-way sync; GiTiempo stays a read-side consumer.
- Jira Server / Data Center; this targets Jira Cloud only.

## Capabilities

### New Capabilities

- `jira-oauth-foundation`: per-user Atlassian OAuth connection — status, authorize, callback, rotating-refresh token storage, disconnect, safe redirects.
- `workspace-jira-site-policy`: workspace-level approval of one Jira Cloud site; a filter, not a grant of access.
- `jira-data-browsing-api`: read-only listing of Jira projects and issues for connected members, scoped by the site policy.
- `timer-jira-issue-tracking`: Jira projects as timer targets; starting a timer on a Jira issue materializes the project and task server-side.

### Modified Capabilities

- `contracts`: Jira connection status, auth URL, browsing, and materialization contracts, mirroring the GitHub set.
- `data-model`: Jira connection persistence with encrypted rotating tokens, beside the existing GitHub connection persistence requirement.
- `user-pages`: the top-bar timer picker offers approved Jira projects alongside GitHub boards.
- `add-project-page`: a Jira source in the import flow, with the tracked-elsewhere refusal.
- `project-management`: importing a Jira project and the reuse rule for timers started from Jira issues.

## Impact

- `apps/api/src/jira/**` — new module mirroring `apps/api/src/github`: OAuth client, connections service, encryption reuse, API client against `api.atlassian.com/ex/jira/{cloudId}`, site policy service.
- `apps/api/src/tasks/**` — a Jira materialization path beside `GithubTaskMaterializationService`.
- `packages/shared/src/contracts/` — Jira contracts.
- `apps/user-web` — timer picker gains Jira targets; profile gains the Jira connection card.
- `apps/admin-web` — settings gain the Jira site policy; Add Project gains the Jira source.
- **Database**: new `jira_connections`, `jira_oauth_states`, `workspace_jira_sites` tables; no change to the provider-neutral ref tables.
- **Environment**: `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, callback URL configuration in each environment before rollout.
- **Encryption**: token encryption reuses the existing `ENCRYPTION_KEY` approach, so key rotation procedures cover one more table.
