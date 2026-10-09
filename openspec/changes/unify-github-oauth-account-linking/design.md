## Context

The existing sign-in flow uses `GITHUB_SIGNIN_CLIENT_ID/SECRET`, requests only `user:email`, matches existing active members by verified email, and issues the normal GiTiempo session without persisting GitHub identity. The separate `/github/auth-url` and `/github/callback` flow uses `GITHUB_APP_CLIENT_ID/SECRET`, opaque state and PKCE, and stores personal App access/refresh tokens in `github_connections`.

The App token currently backs both organization discovery and private data browsing. Discovery can consequently be empty before organization installation. Workspace timer access already uses a separate verified installation and must remain independent of personal connections (ADR 009). Existing canonical `github-signin` requirements intentionally prohibit the persistence proposed here; the accompanying deltas explicitly replace those rules.

This design implements the agreed proposal only. It does not implement application code, change provider configuration, or run a database migration during proposal generation.

## Goals / Non-Goals

**Goals:**
- Reuse the existing OAuth App for sign-in, account linking and pre-installation organization membership discovery.
- Request `user:email read:org read:project` in login and linking; persist actual permissions and provide feature-specific recovery without blocking otherwise valid login.
- Enforce stable, globally unique GitHub identity ownership and consistent OAuth/App identities.
- Preserve private browsing/import and installation-backed tracking, with explicit credential routing.
- Make full Disconnect complete, resistant to races, and safe against account lockout.

**Non-Goals:**
- OAuth `repo` permission, migrating private browsing/import/Projects queries to OAuth, or migrating personal browsing to installation tokens.
- Changing installation verification, App permissions, assignment/visibility rules, automatic user provisioning, or the GiTiempo access/refresh JWT contract.
- Combining GitHub users, automatically merging GiTiempo users, deleting workspace/history data, uninstalling an App, or redesigning unrelated pages.
- A new identity provider, dependency, automatic production deployment, or completion of the active privacy-publication change.

## Decisions

### 1. Give each credential family an explicit responsibility

| Operation | Credential | Prerequisites |
| --- | --- | --- |
| GitHub login / authenticated account link | Existing OAuth App | Proven provider identity; initial sign-in also requires verified-email resolution |
| Setup organization list and membership validation for allow-list addition | Stored OAuth token | Effective `read:org` permission and provider-visible active membership |
| Personal repositories, issues, Projects, browsing and import | Existing personal GitHub App token | Valid App grant for the same GitHub ID and existing workspace policy |
| Installation setup authority checks | Existing personal App token plus existing App server credentials | Preserve `/user/installations`, organization owner/admin, configured App identity and permission checks |
| GitHub timer starts | Workspace installation token | Existing installation, organization, repository, mapping and GiTiempo authorization checks |

OAuth `read:project` is requested upfront as agreed, but its presence does not switch existing Projects traffic to OAuth. Its absence must not disable App-backed Projects that already work. There is no token-family fallback on provider failures. This avoids accidentally expanding authorization or masking the cause of failure.

Alternative rejected: replace personal App browsing with OAuth `repo`; this changes permission breadth and violates the agreed scope. A single untyped token slot is also rejected because refresh protocols and consumers differ.

### 2. Separate identity ownership from personal grants

Introduce `github_account_links` with a unique `user_id`, globally unique immutable `github_user_id`, safe display metadata and timestamps. Keep the existing `github_connections` as the personal App credential store; introduce a distinct OAuth credential store keyed to the link. Use the existing encryption utility and keep credential-type-specific refresh clients. A numeric GitHub ID is represented losslessly using the existing string contract.

Preserve a per-user authorization generation outside the deletable link (a dedicated per-user authorization-version record). Authenticated state, staged sign-in results, credential writes and refresh completion carry this generation. The record also keeps a monotonic disconnect cutoff; guest sign-in state carries its server-issued start time, checked against the resolved user cutoff at callback and session redemption, so a transaction started before unlink cannot adopt a new generation after the fact. Disconnect increments it; stale operations cannot recreate deleted links or overwrite a subsequent connection. Ownership constraints are enforced transactionally in the database, including concurrent first-time callbacks. Metadata such as login/email is not an identity key.

App-only legacy connections can own a link after migration, even before OAuth authorization. Credential absence or expiry does not release identity ownership. Full Disconnect does. Historical disconnected legacy rows are not active ownership claims and cannot become sign-in identities through backfill.

Alternative rejected: making `github_connections.github_user_id` unique without separating identity from credential lifetime; it conflates a disconnected history row with a current login binding.

### 3. Keep sign-in and authenticated linking distinct

Retain the existing sign-in routes and browser/extension handoff protocols. Each exchange calls GitHub `/user` to obtain the actual immutable identity. Resolve an existing link first and require an active eligible GiTiempo membership. If the linked member is inactive or unavailable, fail safely; never fall through to another user's matching email. Only an unlinked GitHub ID uses the existing verified-email resolver and primary verified address tie-break. A matched user already linked to a different GitHub ID receives an account-mismatch error and must explicitly disconnect before replacement.

The callback stages the resolved member and encrypted OAuth result in the short-lived, single-use server-side handoff. Commit identity/credentials only after successful handoff redemption and the existing initiator verification; this is particularly important for extension proof-of-possession. Recheck membership, ownership and generation at that point. A failed, expired or rejected handoff must not establish a durable link, credentials or session. Stage cleanup removes unused secrets on expiry. Failure to persist the agreed link is an auth failure, not an apparent successful login with silently missing ownership.

Add authenticated `GET /github/account/auth-url` for OAuth linking with opaque server-side state, PKCE, user/session binding, explicit `account-link` purpose, provider/client identity and generation. Reuse the configured `/auth/github/callback` OAuth App callback with a strictly validated flow discriminator; authenticated linking returns to the fixed user Profile destination and never mints a sign-in session. Login and link state are not interchangeable. Use a reserved opaque state namespace for account linking (for example `account_link.<random-id>`) distinct from the existing signed login state; the callback dispatches by namespace, then validates the selected format, purpose and binding. Unknown state is rejected and an invalid account-link state never falls back to login verification. Validate that the initiating application session is still active before committing a link.

Keep `GET /github/auth-url` and `/github/callback` for the personal App grant. New App authorization requires a linked identity; the provider ID must match it. Label this action as data access rather than account connection. Refreshing one family never replaces the other. Preserve all existing state expiry, atomic consumption, redirect allow-listing and secret-free URL rules.

Alternative rejected: reuse email login to implement authenticated linking, which could sign in as a different account or silently merge users. A second OAuth App or a changed registered callback is unnecessary.

### 4. Model permissions and capabilities separately

`GET /github/connection` becomes a coordinated contract change. Keep `status` (`connected` means an identity link exists) and `account` safe metadata; add:
- `oauth`: `status` (`not_authorized`, `authorized`, `reauthorization_required`), `missingScopes` limited to known requested scopes; an unknown/incomplete scope result never implies readiness.
- `capabilities.organizationDiscovery`: `ready`, `authorization_required`, or `permission_required` based on OAuth access and effective `read:org`.
- `capabilities.personalData`: the same three states, derived only from the personal App grant/permissions.
- `disconnect`: `allowed`, `alternative_signin_required`, or `verification_unavailable` as server-derived eligibility.

Do not embed workspace installation state in the personal connection response; existing workspace-scoped endpoints remain authoritative. Capability readiness is a prerequisite, not a guarantee that every organization/resource is visible. Provider policy/SSO restrictions and transient API errors remain action-specific safe errors. Normalize inherited OAuth scopes (`user` covers `user:email`, higher org/project scopes cover their read variants) without requesting broader scopes.

Missing `read:org` blocks organization discovery/addition but not login or App-backed data access. Missing `read:project` is reported as incomplete OAuth consent and recoverable in Settings, but does not block the retained App Projects path. Complete denial or inability to prove initial identity/email matching still fails sign-in. Both SPAs update together and refetch state after callback/disconnect rather than inferring capabilities from a toast or token existence.

### 5. Discover memberships before installation without granting data access

Use the OAuth token for paginated `/user/orgs` and active membership discovery, deduplicate by stable organization identity, and retain the current owner-list response shape. A failed page is a retryable discovery error, not a successful empty/partial result. Do not filter setup discovery by the workspace allow-list. Add organization still excludes already allowed choices in the UI and accepts manual login input when OAuth capability is ready; transient list failure does not remove this fallback.

For additions, validate active membership/provider visibility using that admin's OAuth token. No GitHub App installation probe is a prerequisite for saving the policy row. Existing post-add automatic installation confirmation runs only with usable personal App credentials; otherwise it is skipped and cannot fail, roll back or relabel the successful policy addition. Retain workspace admin authorization, normalization, duplicate prevention and reference reconciliation. Organization owners need separate App installation authority for the installation step. Retain current installation discovery and verification checks using the App credential; an OAuth-only admin must authorize personal App access when that separate operation requires it.

An organization restriction, invalid token or missing membership is never treated as an installation request that will repair OAuth access. Adding a policy row never installs an App or grants repository/tracking access.

### 6. Make Disconnect a coordinated personal unlink

Keep `DELETE /github/connection` as the full personal unlink operation. Before mutation, use a backend Firebase user lookup to verify that the same enabled Firebase UID has a supported alternative sign-in provider usable in this deployment (password or Google). A local email address, Firebase UID, reset-link capability or client-supplied provider list alone is insufficient. Extend the Firebase adapter interface, real adapter and deterministic test fake together. An unavailable provider lookup produces a safe retryable error and no unlink. The API rechecks eligibility even if the UI previously enabled Disconnect.

Serialize unlink against link/refresh commits. Invalidate the authorization generation and outstanding personal flows/handoffs, clear both encrypted credential families and remove active identity ownership. Attempt bounded token-specific provider revocation using the correct issuing client; never revoke workspace installation credentials or uninstall the App. Revocation failure must not restore locally removed credentials or indefinitely block local cleanup; return a safe warning that local unlink completed but provider revocation was not confirmed. Do not retain revoked/old tokens for an unbounded retry queue, and do not perform delayed grant-wide revocation that could invalidate a new owner's authorization.

An already unlinked user receives an idempotent success without an unnecessary provider lookup. Disconnect preserves existing GiTiempo sessions, workspace installation/policy records, imported records and time history; it removes the GitHub login binding, not the GiTiempo account. A new, explicitly initiated and successfully completed GitHub login can establish a new link under the same uniqueness and member-resolution rules.

Alternative rejected: clearing only the App token, which leaves OAuth sign-in and discovery access active. Also rejected: uninstalling workspace integrations or treating all past activity as personal credential ownership.

### 7. Treat OAuth token lifetime as provider data

Support responses with optional refresh/expiry metadata; never assume that OAuth requires a refresh token or shares App token expiry defaults. Preserve the current OAuth App expiry setting for rollout and inspect it before implementation deployment; this proposal does not add `offline_access` or change that setting. Rotate expiring OAuth tokens through the OAuth client, and App tokens through the App client. On invalid credentials, retain the identity link and require authorization only for that credential family. Never return token material in APIs, browser storage, logs, redirects or errors.

References: [GitHub scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps), [OAuth authorization and token expiry](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [Firebase Admin user lookup](https://firebase.google.com/docs/auth/admin/manage-users). These support permission/lifecycle handling; repository-specific choices are specified above.

## Planned Changes By App / Package

- **API (`apps/api/AGENTS.md`)**: auth GitHub service/controller and staged handoff; GitHub controller, connections/OAuth state services and separate OAuth account client; organization discovery/policy service credential selection; identity/OAuth schemas and Drizzle migration; Firebase adapter interface/real/fake; auth/GitHub module wiring and focused unit/integration tests. Keep App data clients and installation verification/token provider behavior unchanged except selecting the explicit App credential capability.
- **Shared (`packages/shared`)**: `src/contracts/github.ts`, contract tests and generated `openapi.json`; safe errors, capability state and unlink result schemas. Regenerate through the repository's supported build-based OpenAPI export workaround while the direct export issue remains.
- **user-web (`apps/user-web/AGENTS.md`)**: Profile GitHub client/composable/card wiring; OAuth Connect/Reconnect, separate App-data action, eligibility-aware confirmation and partial-revocation warning. Preserve display-name editing and callback toast/query cleanup.
- **admin-web (`apps/admin-web/AGENTS.md`)**: Settings GitHub account/organization/installations composables and cards, setup errors and existing Profile recovery link. Gate organization setup on OAuth, and installation setup on the existing App requirements. Review browsing/import call sites for obsolete binary gates.
- **web-shared (`packages/web-shared/AGENTS.md`)**: only proven-identical auth callback/error/client leaves used by both SPAs; retain app-local stores/router/page composition. Both frontend auth suites are required if these leaves change.
- **Extension**: retain routes, token pair and browser-specific proof/handoff contract; add backend extension-flow regression coverage and verify both configured browser targets. Change extension UI only if a new safe auth error requires copy, following its nearest instructions.
- **Docs**: update API/auth/GitHub setup docs, ADR 003 boundary and ADR 009 references, `docs/ui/pages-user.md`, `docs/ui/pages-admin.md` and relevant patterns. Before UI implementation load frontend skills and inspect approved `.pen` Profile/Settings screens; create parity checklists and reconcile new states with documented patterns. No UI implementation/design files are changed by this proposal.

## Risks / Trade-offs

- Two personal authorizations remain → Explain account identity versus App data access; never promise OAuth alone enables private browsing.
- Organization policy can still restrict OAuth membership visibility → Use honest empty/error/permission states; do not promise every GitHub organization unconditionally.
- Legacy duplicate identity rows → Audit active claims before backfill; for every duplicate immutable GitHub ID, remove every matching legacy personal binding and credential during migration. Never merge users or select a winner. Preserve GiTiempo users, sessions, workspaces and history; require each affected user to explicitly relink and reauthorize App data.
- Firebase lookup unavailable during unlink → Fail before local mutation and offer retry; never infer a usable alternative from email alone.
- Stale clients interpret `connected` as all features available → Coordinate API/SPA rollout and audit every existing gate.
- Provider revocation is not atomic with local storage → Bound attempts, complete local cleanup, report unconfirmed revocation and prevent stale writes with generation checks.
- Extra scopes increase upfront consent → Request only the agreed set, keep actual permissions visible, and permit valid sign-in with reduced feature access.

## Migration Plan

1. Read-only preflight: classify active versus disconnected legacy rows, duplicate GitHub IDs, disabled users and missing owner mappings. Report identifiers and all affected GiTiempo user IDs without tokens. Duplicate active groups are informational cleanup findings: the preflight exits successfully when there are no actual audit errors and does not require an owner decision.
2. Add identity, separate OAuth storage and generation structures through Drizzle migrations. Backfill only unambiguous active App connections. For each duplicate active GitHub ID, delete all matching `github_connections` rows, including historical rows for that ID; invalidate pending legacy GitHub OAuth states for each affected user and seed durable authorization generation/cutoff records. Do not revoke provider grants, merge users, choose an owner, or fabricate OAuth grants. Preserve GiTiempo users, sessions, memberships, workspace policy/installations, projects, tasks and history. Disconnected legacy history otherwise does not reserve an ID; retain only non-authoritative audit metadata if needed.
3. Ship coordinated API/contracts/SPAs. Existing App grants remain usable without OAuth; organization setup requires OAuth consent. New OAuth flows cannot overwrite or reinterpret App tokens. Keep legacy App callback purpose handling safe across deployment and reject stale incompatible transactions with retry guidance.
4. Verify web and extension login, both grant paths, org setup before installation, installation authority, full unlink and timer independence using targeted tests and a controlled environment.
5. Update configuration/setup and privacy disclosures before production release. Scope request changes live in authorization requests; inspect OAuth App settings and supported callback configuration without changing them during proposal work.
6. Rollback: disable new linking/discovery entry points and deploy a compatible prior UI/API bundle only after checking its expectations against the additive schema. Keep new ownership/credential data intact and protected; never reinterpret OAuth tokens as App tokens or restore deleted bindings. Duplicate-group cleanup is irreversible: rollback must not restore removed legacy credentials or bindings. Any rollback requiring data deletion or reintroducing email-only resolution for linked accounts needs a separate migration/recovery decision.

## Open Questions

No outstanding product decision blocks planning. Deployment preflight must verify actual OAuth token-expiry configuration, alternative-provider availability, and legacy duplicate ownership in the target environment. Duplicate groups are automatically unlinked by migration under the agreed cleanup rule; the preflight is evidence of the affected scope, not permission to infer an owner or change the agreed scope.
