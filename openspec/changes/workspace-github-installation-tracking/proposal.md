## Why

Members assigned to a GiTiempo project cannot currently start an extension timer without a usable personal GitHub connection. [Issue #420](https://github.com/ITSUA-team/GiTiempo/issues/420) makes workspace GitHub App installation access the provider credential for this flow while keeping GiTiempo membership and project assignments authoritative for tracking access.

## What Changes

- Add verified workspace–organization–GitHub App installation links, administrator setup and disconnect actions, server-owned installation credentials, and installation lifecycle handling.
- Retain the GitHub Workspace Access card with automatic confirmation of missing associations and an explicit `Install App` action beside `Remove` for organizations without a verified link. Reuse existing installations on explicit retry and distinguish installation-access recovery from organization-owner failures.
- Verify repository, issue, and any required GitHub Project resources using the linked installation without consulting the tracking member's personal GitHub connection.
- **BREAKING**: GitHub timer starts require an existing mapped active GiTiempo project and explicit assignment for ordinary members. They cannot create projects or assignments. Authorized starts may still materialize an issue task. Preserve existing privileged-role rules.
- **BREAKING**: Apply this authorization consistently to the shared `POST /time-entries/timer/start-from-github` endpoint, including its existing user-web caller. Personal GitHub browsing and deliberate import flows remain user-to-server; this change does not migrate those features.
- Preserve canonical mapping reuse, task-state checks, billing defaults, timer concurrency rules, `source: extension`, and GitHub-independent stop operations.
- Add stable API failures and actionable popup/injected-control messages, including the exact project-assignment message required by #420.
- Supersede the installation prohibition in ADR-003 and reconcile product, extension, and timer-picker documentation with the access model. Retain GitHub Project boards and repositories as distinct resource types; coordinate existing mappings with #344.

## Capabilities

### New Capabilities

- `workspace-github-installations`: Verified administrator-managed installation associations, provider authority checks, credential renewal, lifecycle invalidation, and setup/status behavior.

### Modified Capabilities

- `time-tracking-api`: Installation-authenticated issue verification, existing-project resolution, assignment checks before writes, and stop independence.
- `project-management`: Existing issue ownership takes precedence consistently across issue surfaces; GitHub timer starts never create projects or assignments.
- `workspace-github-organization-policy`: Keep organization policy as a filter across both credential types; explicitly separate allow-list entries from verified installation access.
- `timer-github-project-tracking`: Replace automatic project creation during a GitHub timer start with existing authorized mappings and actionable setup failures.
- `chrome-extension`: Start without a personal connection and render distinct assignment, installation, mapping, and provider failures on both extension surfaces.
- `contracts`: Safe installation management payloads and machine-readable tracking error codes shared by API and clients.

## Impact

- **Layers:** backend, frontend (extension, admin-web, affected user-web timer caller), shared contracts, and documentation.
- **Authentication/authorization:** GiTiempo sign-in remains required. GitHub installation credentials supply resource access; workspace membership and project authorization supply tracking access. An administrator's own GitHub connection may be used only to prove installation-linking authority.
- **Backend:** GitHub services/configuration/schema/migrations, workspace management endpoints, verified lifecycle webhook handling, time-entry service, and existing GitHub task materialization boundaries.
- **Frontend:** Admin Settings installation setup/status, extension API/runtime/error presentation, and user-web GitHub start-error handling. No migration of all browsing/import flows or global project visibility policy.
- **Shared:** Zod management/error contracts, API DTOs, and regenerated OpenAPI. Existing timer request fields remain valid and cannot select credentials or grant access.
- **Operations:** Configure the App ID/private key and webhook secret server-side; grant repository Issues read and the organization permissions required by the actual mapping/setup flow. Existing allow-list rows are not automatically trusted or upgraded.
- **Documentation:** ADR-003 successor, `docs/PROPOSAL.md`, `docs/ui/chrome-ext.md`, affected admin/user guidance, and API examples. This proposal records the intentional divergence; implementation will update canonical docs together.
- No new package dependency is required by this proposal.
