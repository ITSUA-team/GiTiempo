## 1. Atlassian app and configuration

- [ ] 1.1 Register the Atlassian OAuth 2.0 (3LO) app with read scopes and the callback URL per environment
- [x] 1.2 Add `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, and the callback URL to env validation so a missing value fails at boot by name
- [ ] 1.3 Record the new values in the deployment guide and the staging GitHub Environment

## 2. Shared contracts

- [x] 2.1 Define the Jira connection status contract, including the re-authorization state
- [ ] 2.2 Define the Jira project and issue browsing contracts with immutable ids beside keys, capped pagination, and the hidden-by-permissions representation
- [ ] 2.3 Define the start-timer-from-Jira-issue contract carrying the issue id and Jira project id only, validated strictly
- [ ] 2.4 Define the workspace Jira site policy contracts with frontend-safe errors
- [ ] 2.5 Run the shared vitest suite and regenerate `packages/shared/openapi.json` through the build-based workflow

## 3. Database

- [x] 3.1 Add `jira_connections` mirroring `github_connections`, plus the needs-reauthorization marker
- [x] 3.2 Add `jira_oauth_states` mirroring `github_oauth_states`
- [ ] 3.3 Add `workspace_jira_sites` holding one cloud id and hostname per workspace
- [ ] 3.4 Generate the migration and note in the rollout that `ENCRYPTION_KEY` rotation now also covers `jira_connections`

## 4. Jira OAuth foundation

- [x] 4.1 Build the OAuth client: authorization URL with read scopes and offline access, code exchange, accessible-resources lookup
- [x] 4.2 Build the single-use member-bound state service mirroring the GitHub one
- [x] 4.3 Build the connections service with encrypted storage and single-flight refresh; a rejected refresh marks re-authorization instead of deleting
- [x] 4.4 Expose status, connect, callback, and disconnect endpoints with safe configured redirects
- [x] 4.5 Test the refresh race: concurrent callers produce exactly one Atlassian refresh call, and rotation replaces the stored token
- [x] 4.6 Test that a replayed or expired state stores nothing

## 5. Site policy

- [ ] 5.1 Let a connected admin list their accessible sites and approve one for the workspace
- [ ] 5.2 Resolve the cloud id from the stored policy on every Jira call and refuse request-supplied cloud ids
- [ ] 5.3 Keep replacement additive: approving another site touches no existing projects, tasks, or refs
- [ ] 5.4 Surface the policy in admin settings beside the GitHub organization policy
- [ ] 5.5 Test the filter-only property: policy approval does not widen a member's own Jira access

## 6. Browsing API

- [ ] 6.1 Build the Jira API client against `api.atlassian.com/ex/jira/{cloudId}` with the same pagination caps as GitHub browsing
- [ ] 6.2 List projects and open issues with immutable ids beside keys
- [ ] 6.3 Report hidden-by-permissions content as an access state distinct from emptiness
- [ ] 6.4 Surface Atlassian rate limits as retryable errors
- [ ] 6.5 Test unconnected and needs-reauthorization callers get the state, not empty lists

## 7. Timer materialization

- [ ] 7.1 Build the Jira materialization service beside the GitHub one: resolve tracked issue by external id, then the project mapped to the Jira project, then create
- [ ] 7.2 Verify the issue against the approved site with the caller's connection before any write, recording identifiers Jira reports
- [ ] 7.3 Name created projects after the Jira project and pass them through the duplicate-name refusal
- [ ] 7.4 Follow the archived-holder takeover rule the GitHub connector uses
- [ ] 7.5 Test the moved-issue case: a changed key resolves to the existing task by immutable id
- [ ] 7.6 Extend the timer start endpoint and e2e coverage for the Jira source, minding the per-file login budget

## 8. User-web

- [ ] 8.1 Add the Jira group to the top-bar picker beside GitHub boards, with connection and policy absences explained in place
- [ ] 8.2 List a selected Jira project's issues as task options without a New task option
- [ ] 8.3 Show "private to you" when the account cannot read a project's issues
- [ ] 8.4 Add the Jira connection card to the profile with connect, reconnect, and disconnect
- [ ] 8.5 Component tests for the picker group, the private state, and the connection card states

## 9. Admin-web

- [ ] 9.1 Add the Jira site policy to settings: list accessible sites, approve, replace
- [ ] 9.2 Add the Jira source to Add Project with the preview, the tracked-elsewhere block naming the holder, and unavailability explained
- [ ] 9.3 Component tests for the policy flow and the blocked import

## 10. Verification

- [ ] 10.1 Run lint, typecheck, and tests for `@gitiempo/api`, `@gitiempo/shared`, `user-web`, and `admin-web`
- [ ] 10.2 Connect a real Atlassian account against staging, approve a site, and browse projects (needs a browser and a deploy)
- [ ] 10.3 Start a timer on a Jira issue and confirm project and task materialize once across repeated starts
- [ ] 10.4 Let an access token expire and confirm the refresh is transparent; revoke the app on Atlassian and confirm the re-authorization state appears
- [ ] 10.5 Import a Jira project, re-import it, and confirm the refusal names the holder
