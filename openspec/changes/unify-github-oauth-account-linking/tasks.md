## 1. API — Verify prerequisites and migrate identity storage

- [ ] 1.1 Read the affected API/shared instructions and current auth/GitHub docs; map all credential consumers and binary connection gates against the design's operation table.
- [ ] 1.2 Add a read-only migration preflight for active/disconnected legacy rows and duplicate GitHub IDs; cover ambiguous ownership with fixtures and require explicit resolution rather than automatic merging; block release until preflight reports zero unresolved active conflicts.
- [ ] 1.3 Add globally unique GitHub identity-link storage, separate encrypted OAuth storage and persistent authorization generations; preserve the existing App credential store.
- [ ] 1.4 Implement the additive Drizzle migration/backfill for unambiguous active App connections; verify disconnected history does not reserve identities and no OAuth credentials are fabricated.
- [ ] 1.5 Test migration constraints and concurrent ownership claims against PostgreSQL; document a non-destructive rollback that cannot reinterpret tokens or resurrect deleted links.

## 2. Shared — Define coordinated contracts

- [ ] 2.1 Update GitHub connection schemas with independent OAuth status, normalized missing scopes, organization/personal-data capabilities and disconnect eligibility while preserving safe account field types.
- [ ] 2.2 Add full-unlink response and stable recovery errors for ownership conflict, identity mismatch, missing OAuth permission, missing alternative sign-in and verification failure; keep existing auth URL and session token pair shapes.
- [ ] 2.3 Add schema tests for connected/disconnected/legacy-App-only/partial-scope states, unlink revocation warnings and rejection of secret-bearing or invalid payloads.
- [ ] 2.4 Build shared contracts and regenerate OpenAPI using the supported build-based export path; review API/SPA coordination and exact response changes.

## 3. API — OAuth login and authenticated account linking

- [ ] 3.1 Add the OAuth account client using existing sign-in credentials, `/user` identity lookup, the agreed three scopes, actual scope normalization and optional expiry/refresh handling. Do not request `repo` or change provider expiry settings.
- [ ] 3.2 Implement linked-ID-first sign-in and existing verified-email/primary-address resolution only for unlinked identities; reject inactive owners and replacement of another linked GitHub ID without fallback or account merging.
- [ ] 3.3 Stage encrypted OAuth results in expiring single-use sign-in handoffs; atomically commit ownership and credentials only after initiator proof, generation and membership checks at session exchange. Clear abandoned staged secrets.
- [ ] 3.4 Add authenticated OAuth account-link authorization start and purpose-bound callback routing through the existing OAuth callback; retain opaque state, PKCE, session binding, fixed Profile redirect, expiry and atomic consumption.
- [ ] 3.5 Keep existing personal App auth routes and refresh client; require matching linked GitHub identity and ensure reconnect updates only the selected credential family.
- [ ] 3.6 Add targeted tests for new/linked login, verified-email fallback/ties, cross-user global conflicts, concurrent callbacks, wrong-purpose state and namespace fallback rejection, expired/replayed state, mismatched App identity and partial consent.
- [ ] 3.7 Add regression tests for user/admin browser binding and Chrome/Firefox configured extension destinations, proof-of-possession, failed handoff cleanup, normal token pair responses and existing no-provisioning behavior.

## 4. API — Organization discovery and preserved App access

- [ ] 4.1 Route setup organization discovery through OAuth read:org access; paginate active memberships, deduplicate and preserve the owner-list contract without workspace filtering.
- [ ] 4.2 Validate organization additions through the admin's OAuth active membership without an App installation prerequisite; preserve workspace authorization, normalization, duplicate handling and reference reconciliation.
- [ ] 4.3 Add targeted safe recovery for missing scopes, missing membership, organization policy restrictions, rate limits and provider failures; never report failed pagination as successful empty/partial data.
- [ ] 4.4 Audit repository/issue/Projects browsing and import consumers to keep personal App tokens; audit installation discovery/verification to retain personal App authority checks and server App identity/permission checks.
- [ ] 4.5 Test OAuth-only discovery/addition before App installation, App-only legacy browsing, no token-family fallback, manual-input validation and empty versus failed discovery.
- [ ] 4.6 Verify installation-backed starts remain independent of personal OAuth/App grants and keep existing assignment, visibility, organization, repository and project-mapping authorization; coordinate saved-task cases with the active assignment change.

## 5. API — Full Disconnect and lifecycle races

- [ ] 5.1 Extend the Firebase adapter interface, real adapter and deterministic fake with authoritative enabled-user/supported-provider lookup; test supported alternative sign-in, GitHub-only, disabled and lookup-failure cases.
- [ ] 5.2 Implement server-derived disconnect eligibility and recheck it on DELETE; do not infer an alternative login from email, Firebase UID or client-provided provider metadata.
- [ ] 5.3 Implement full unlink of identity and both personal credential families, advance authorization generation and invalidate pending personal callbacks/handoffs; preserve current GiTiempo sessions and all workspace/history records.
- [ ] 5.4 Add bounded credential-specific provider revocation with explicit unconfirmed-revocation results; keep local cleanup authoritative, avoid delayed grant-wide revocation and never touch installation credentials.
- [ ] 5.5 Test idempotency, blocked/unverifiable unlink, local cleanup despite provider timeout, ID release/relink, callback and refresh races, concurrent reconnect and no resurrection of old credentials.

## 6. user-web — Account and personal data controls

- [ ] 6.1 Read frontend skills and `docs/ui/INDEX.md` plus relevant Profile/pattern rules; inspect the approved Profile `.pen` screen and record parity requirements for the new states before UI edits.
- [ ] 6.2 Update the Profile client and connection surface for OAuth Connect/Reconnect, partial-permission recovery and a separate personal App data authorization action.
- [ ] 6.3 Add server-eligibility-aware full Disconnect confirmation, alternative-login guidance, unchanged historical/workspace impact explanation and unconfirmed-revocation warning handling.
- [ ] 6.4 Preserve callback toast/query cleanup, authoritative status refetch, display-name editing and null-avatar behavior; audit browsing gates so OAuth-only identity does not imply App data access.
- [ ] 6.5 Add fetch-boundary and assembled Profile tests for all capability states, separate authorization actions, identity conflicts, disconnect eligibility/results and callback success followed by fetch failure.
- [ ] 6.6 Run user-web lint, typecheck and auth/UI tests; check responsive and keyboard behavior against the approved design and document any PrimeVue constraint.

## 7. admin-web — Organization and installation setup

- [ ] 7.1 Read relevant frontend skills and Settings/pattern rules; inspect the approved Settings `.pen` screen and record the new-state parity checklist before UI edits.
- [ ] 7.2 Update GitHub Account and Workspace Access state consumers to gate Add organization on OAuth capability and retain Profile linking/recovery navigation.
- [ ] 7.3 Render loading, legitimate empty, missing-permission and provider-failure states distinctly; preserve existing-policy display/removal and manual input after transient discovery failure.
- [ ] 7.4 Keep installation discovery/setup bound to personal App authorization and existing authority checks; show targeted guidance without gating OAuth organization setup on installation state; skip automatic confirmation without App credentials and preserve a successful OAuth policy addition.
- [ ] 7.5 Audit private browsing/import controls for explicit App capability; test OAuth-only, App-only, both-grant and disconnected states plus unchanged settings data on GitHub errors.
- [ ] 7.6 Run admin-web lint, typecheck and auth/Settings tests; verify selector behavior and installation setup independently in browser-level smoke checks.

## 8. Shared browser helpers and extension regression

- [ ] 8.1 Update only proven-identical shared callback/error/client helpers where required, keeping stores, routers and page composition app-local; add fetch-boundary tests for changed shared helpers.
- [ ] 8.2 Run both SPA auth regression suites for bootstrap, password/Google/GitHub login, stale-session cleanup, logout and protected redirects if shared auth leaves change.
- [ ] 8.3 Verify extension GitHub login still consumes the same configured destination and token pair contract in both supported browsers; add safe error copy only where a new conflict outcome requires it and follow extension-local instructions if changed.

## 9. Docs — Contracts, setup and rollout

- [ ] 9.1 Update architecture/API documentation and ADR 003's identity/discovery boundary while preserving its personal App data decision and ADR 009 installation-tracking rules.
- [ ] 9.2 Update Profile/Settings UI docs for capabilities, separate consent, alternative-login protection and full Disconnect; retain the approved shared component/pattern conventions.
- [ ] 9.3 Document the unchanged OAuth client/callback configuration, requested versus granted scopes, token-family responsibilities, migration conflicts and reauthorization needed by legacy users.
- [ ] 9.4 Coordinate token retention/deletion and OAuth disclosures with `prepare-chrome-web-store-privacy`; coordinate saved-GitHub-task permission examples with `require-project-assignment-for-saved-github-timers` without duplicating their implementation scope.
- [ ] 9.5 Record rollout prerequisites: target-environment duplicate audit, actual OAuth expiry settings, supported alternative providers, migration readiness and compatible API/SPA release order. External configuration/deployment are separate release actions.

## 10. Verification — Complete the agreed change

- [ ] 10.1 Run targeted API tests and PostgreSQL-backed migration/authorization race coverage, then API lint/typecheck/test under the repository's build prerequisites; document any environment-limited verification.
- [ ] 10.2 Run coordinated monorepo lint/typecheck/build and relevant frontend/shared tests; verify generated OpenAPI matches the final contracts and adds no secrets.
- [ ] 10.3 Complete the manual acceptance checklist in section 11 and record results for the implemented build.
- [ ] 10.4 Review final deltas against all agreed rules, run strict OpenSpec validation, and record implementation evidence without marking unexecuted checks as passed.

## 11. Manual acceptance testing

Run these checks after implementation in a local or staging environment using dedicated test accounts and organizations. Use controlled fixtures or provider-response simulation for unavailable permission/error states and record which checks used simulation. Keep every task unchecked until executed; record the build, environment, steps, expected/actual result and safe evidence, without tokens or authorization codes.

- [ ] 11.1 Prepare two GiTiempo users, separate browser sessions, two GitHub identities, an organization without the App, and an organization with a verified workspace installation and private repository/Projects data. Include assigned and unassigned members, a legacy App-only connection, a user with an alternative login method, and a GitHub-only login fixture.
- [ ] 11.2 Sign in through GitHub from user-web and admin-web. Verify the authorization request includes `user:email read:org read:project`, the normal session opens, and Profile already shows the linked account without a second Connect step. Log out and sign in again; verify the same user is resolved and no duplicate link appears.
- [ ] 11.3 While signed in through an alternative method, connect GitHub from Profile and repeat authorization for the same GitHub ID. Verify the current GiTiempo user stays unchanged and reconnect updates the existing link. Attempt to replace it with a different GitHub ID without Disconnect; expect a safe mismatch error and unchanged account details/access.
- [ ] 11.4 In the second GiTiempo user's browser session, attempt to link the first user's GitHub identity, including from another workspace. Verify a clear conflict without the other user's email/name/workspace, no account switch, and no changes to the original link or grants.
- [ ] 11.5 Exercise partial OAuth consent, complete authorization cancellation, and expired/revoked OAuth access. Verify valid partial-consent login succeeds, missing `read:org` offers permission recovery, and missing `read:project` does not disable working App-backed Projects. Complete denial must not create a session or link; recovery must restore only the affected capability.
- [ ] 11.6 With OAuth access and no personal App grant, open Admin Settings and select an organization where the App is not installed. Verify it appears, can be added, and remains saved after reload; automatic installation confirmation must not turn the addition into failure. Verify already allowed organizations are excluded from suggestions and adding policy alone enables neither private browsing nor tracking.
- [ ] 11.7 Check organization discovery with multiple provider pages, no memberships, restricted organization access, and a failed provider request/page. Verify no duplicate or silently truncated results, distinct empty/error/permission guidance, and manual-login input after a transient discovery failure. Confirm manual input cannot bypass missing OAuth permission or backend membership validation.
- [ ] 11.8 Authorize personal GitHub App data access for the linked identity and browse/import a private repository, issue and Project. Verify OAuth-only identity was insufficient, App authorization enables the existing data flows, and an App callback for another GitHub ID is rejected without changing either grant. Verify a migrated App-only connection still browses while organization discovery asks for OAuth consent.
- [ ] 11.9 Exercise automatic confirmation of an existing installation and explicit Install App setup. Verify personal App authorization, organization-owner authority and exact installation checks remain required. An OAuth-only admin should receive targeted App guidance while the saved organization policy remains intact.
- [ ] 11.10 With a usable alternative login, cancel the Disconnect confirmation once, then confirm it. Verify cancellation leaves access intact; confirmation removes identity ownership and both personal credential families, keeps the current GiTiempo session, and shows disconnected after reload. Verify workspace installations, allowed organizations, imported projects/tasks and time history remain present, and the alternative login still works after logout.
- [ ] 11.11 Attempt Disconnect with GitHub as the only login method and with alternative-login verification unavailable. Verify clear setup/retry guidance and no mutation, including when calling the API directly despite a stale UI eligibility state. Simulate provider revocation timeout for an otherwise permitted Disconnect; expect completed local unlink plus an unconfirmed-revocation warning.
- [ ] 11.12 After full Disconnect, link the released GitHub ID to the second GiTiempo user and verify ownership succeeds. In a separate clean fixture, perform a newly initiated GitHub login after Disconnect and verify the account link is recreated under the existing member-resolution and uniqueness rules.
- [ ] 11.13 Start linking in one tab, disconnect in another, then complete the old callback; repeat with a staged login handoff and a delayed refresh response using controlled tooling. Verify no stale operation restores identity, credentials or a GitHub login session. Replay a consumed callback and try a wrong-purpose state; expect safe rejection.
- [ ] 11.14 After personal Disconnect, start and stop an authorized installation-backed GitHub timer as an assigned member. Verify an unassigned member remains denied where assignment is required, owned running timers remain stoppable, and no personal reconnect is requested to repair installation or assignment errors.
- [ ] 11.15 Complete GitHub login from the extension in both supported browsers and exercise cancellation/failure. Verify each flow returns to its configured browser destination, successful login establishes the usual session/link, and failed or reused handoffs establish neither. Recheck password/Google login, session restore and logout in both SPAs.
- [ ] 11.16 Review Profile and Admin Settings at desktop and mobile sizes with keyboard navigation. Verify loading, request-error, linked, missing-permission, App-authorization and disconnect states are understandable; callback notices use the established toast pattern, handled query parameters disappear, and secrets never appear in UI, URLs, browser storage or captured evidence. Record failures and environment-blocked checks explicitly before acceptance.
