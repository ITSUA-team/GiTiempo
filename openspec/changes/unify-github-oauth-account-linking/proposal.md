## Why

The Add organization selector currently discovers organizations through the personal GitHub App grant, which cannot discover all OAuth-authorized memberships before the App is installed in those organizations. GiTiempo already has a separate sign-in OAuth App; using it for account identity, linking, and organization discovery removes this installation prerequisite and repeated account-linking work after sign-in.

## What Changes

- **BREAKING**: Reuse the existing sign-in OAuth App for login and authenticated account linking, requesting `user:email read:org read:project` upfront. Successful sign-in persists the GitHub identity and OAuth credentials; an otherwise valid login remains available when additional feature scopes are missing.
- Resolve linked sign-ins by immutable GitHub ID. Preserve verified-email matching, primary-address ambiguity resolution, existing-member-only login, session contracts, and browser/extension binding for initial unlinked sign-in.
- Enforce one GitHub identity per GiTiempo user and one GiTiempo owner per GitHub ID globally. Reject cross-user linking and mismatched OAuth/App identities without disclosing the other user's details.
- Separate OAuth identity/discovery credentials from personal GitHub App data credentials. Preserve current private repository, issue, and Projects browsing/import through personal GitHub App tokens and workspace tracking through installation tokens. Do not request OAuth `repo`.
- Discover and validate workspace organization additions using the admin's OAuth membership access, without requiring App installation. Organization policy remains a workspace filter and does not grant provider or tracking access.
- **BREAKING**: Replace the single connection feature gate with explicit identity, OAuth permission, personal App access, and disconnect-eligibility states in shared contracts and both SPAs. Keep workspace installation status separate.
- **BREAKING**: Full Disconnect removes the personal identity binding and both personal credential families, releases the GitHub ID, and prevents pending flows from recreating the link. Require an alternative usable sign-in method first. Preserve workspace installations, organization policy, projects, tasks, history, and existing GiTiempo timer authorization.
- Migrate unambiguous legacy personal App connections without converting their tokens to OAuth. For a duplicate legacy GitHub ID, unlink every conflicting personal binding/credential rather than merging users or choosing an owner; affected users explicitly relink afterward.

## Capabilities

### New Capabilities

None; this change updates the existing GitHub integration domains.

### Modified Capabilities

- `github-signin`: Persist OAuth account links after successful sign-in, resolve linked identity first, request agreed scopes, and preserve web/extension authentication security.
- `github-oauth-foundation`: Separate account linking from personal App authorization; define capabilities, token lifecycle, identity consistency, and complete disconnect.
- `github-data-browsing-api`: Use OAuth for setup organization discovery while explicitly retaining personal App credentials for browsing/import.
- `workspace-github-organization-policy`: Gate setup on OAuth membership capability and permit validated additions before App installation.
- `workspace-github-installations`: Make the retained personal App prerequisite explicit under the new identity status and keep OAuth policy addition independent of subsequent installation setup.
- `data-model`: Persist globally unique identity ownership, separate credentials, scoped transaction state, and complete unlink semantics.
- `contracts`: Define capability-aware connection, recovery, and disconnect contracts without exposing secrets.
- `user-pages`: Offer OAuth linking, distinct App authorization, missing-permission recovery, and guarded full Disconnect on Profile.
- `admin-settings-page`: Drive organization setup from OAuth capabilities while preserving separate installation setup and existing configuration.

## Impact

- Layers: API/authentication/database, user-web, admin-web, shared contracts/browser helpers, and architecture/API/UI documentation. This changes authentication behavior and connection response contracts; coordinate API and SPA rollout. No new dependencies.
- Preserve `/auth/github/start`, `/auth/github/callback`, `/auth/github/session` sign-in entry points and extension handoff protocol; add authenticated OAuth linking without repurposing the current GitHub App callback. Retain installation verification checks and credential routing.
- A database migration and duplicate-ownership preflight are required. Existing App-only users keep unambiguous data grants but must authorize OAuth for discovery. Duplicate legacy groups are reported before migration and all of their personal bindings are removed by migration; GiTiempo users, sessions, workspaces and history remain intact. Test token-family isolation and unlink/callback races.
- Follow the nearest app/package `AGENTS.md` files. Update ADR 003's identity/discovery boundary while retaining its App browsing decision and ADR 009's installation-tracking decision.
- Coordinate with `require-project-assignment-for-saved-github-timers`: disconnect never bypasses GiTiempo assignment/visibility checks or deletes history. Coordinate data-retention and OAuth disclosures with `prepare-chrome-web-store-privacy`; do not duplicate its publication work.
- No GitHub issue or parent issue has been supplied. This change produces planning artifacts only; implementation, external OAuth configuration, migrations, and deployment are separate work.
