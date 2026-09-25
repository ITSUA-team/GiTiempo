## Context

Issue [#420](https://github.com/ITSUA-team/GiTiempo/issues/420) authorizes a change to ADR-003's user-to-server-only decision. The current `TimeEntriesService.startTimerFromGitHub` fetches repository/issue metadata through the caller's GitHub connection, can create a repository project, and assigns the caller to a newly created project. `requireVisibleProject` also permits ordinary members to see public projects without assignment; that visibility check is insufficient for the new tracking rule.

The endpoint is shared by the extension and user-web. The actual shared request schema already accepts `githubRepo`, `issueNumber`, and optional `githubProjectId`, and rejects `issueTitle`; several older specs still describe sending a title. The delta specs reconcile this drift while preserving server-owned issue metadata.

Existing board and repository imports, organization policy, case-insensitive references, per-workspace issue deduplication, and conditional timer stop must remain coherent. #344 supplies deliberate board import/mapping; this change consumes those mappings. It does not create another import system.

## Goals / Non-Goals

**Goals:**

- Let assigned active members track accessible organization issues, including private repository issues, using verified workspace installation access without a personal GitHub connection.
- Establish a verifiable administrator setup boundary, keep credentials server-side, and fail safely when permissions or installation status change.
- Authorize against existing projects before task/time writes; provide precise client recovery states.
- Preserve owned timer stop, billing, task-state checks, canonical mappings, workspace isolation, and one-running-timer behavior.

**Non-Goals:**

- Migrate personal GitHub browsing, issue selection, deliberate import, or GiTiempo sign-in to installation credentials.
- Create projects or assignments from timer requests, trust page metadata, or share an administrator's personal token.
- Change general public/private project visibility, PM assignment-management privileges, or ordinary manual/local-task tracking rules.
- Build a new layout or redesign Settings or extension controls. UI implementation must follow existing docs and approved design frames.

## Decisions

### 1. One authorization policy for the shared GitHub start endpoint

Keep `POST /time-entries/timer/start-from-github` and its current strict input shape. The backend selects the installation from authenticated workspace context and verified organization identity. Do not accept a credential mode, workspace override, installation token, or client-selected local project as an authorization shortcut.

Apply installation verification and no-project-creation semantics to every caller of this endpoint. Update the existing user-web caller's errors and picker guidance together with the extension. User-web browsing/import retain personal credentials; being able to browse an issue therefore does not guarantee that the installation-backed start will succeed. Existing local-task timer endpoints keep their current policy; this proposal does not make installation access a prerequisite for tracking already-authorized local tasks.

Alternative considered: a separate extension endpoint or client-declared source selecting old behavior. This would duplicate the authorization boundary and allow equivalent issue starts to produce different assignments and mappings. The shared endpoint change is an explicit compatibility change, recorded in proposal/specs and the rollout plan.

### 2. Verified administrator setup with stable identities

Add a workspace installation association containing local ID, workspace ID, GitHub organization account ID/display login, installation ID, configured App ID, verification timestamp/actor, lifecycle state, and an authorization version. Enforce uniqueness on workspace plus stable organization ID; allow an installation in multiple independently verified workspaces. Tokens do not belong in this row. Existing allow-list records remain unverified until automatic or explicit setup completes its full checks.

Use the existing administrator GitHub connection for setup authority only:

1. Require active workspace admin membership and an allowed organization. Resolve the organization's stable identity server-side.
2. Create opaque single-use setup state bound to user, workspace, organization, expiry, and a fixed Admin Settings return destination. Consume it atomically at completion and recheck workspace admin membership.
3. Use the administrator's GitHub App user token to verify the exact installation appears in paginated `GET /user/installations` results.
4. Use `GET /user/memberships/orgs/{org}` and require active membership with `role=admin` (organization owner). Installation visibility alone is insufficient authority.
5. With a backend App JWT, fetch `GET /app/installations/{id}`; require the configured App, `target_type=Organization`, expected stable account ID, and a non-suspended installation. Verify required granted permissions and that a restricted token can be obtained. Resource readiness is checked for each actual timer target; a verified association does not promise access to every organization repository.
6. Persist or replace the association only after all verification succeeds. A failed replacement preserves the prior valid association. Reading status and local disconnect use GiTiempo admin authority without requiring a personal GitHub connection.

Organization-owner proof intentionally excludes repository-only administrators and delegated app managers in this first version; it is a verifiable minimum for linking organization-wide access. Request organization `Members: read` for this proof, repository `Issues: read` for issue access, and organization `Projects: read` only when board mapping verification requires it. Existing installations may need their owner to accept updated permissions.

Proposed workspace routes under the existing workspace controller: list installation status; initiate setup; complete setup using opaque state and installation ID; reverify; and locally disconnect an association. After Settings loads the allowed-organization policy, and after it adds an organization, the client initiates setup only for organizations without an association. Setup discovers an existing organization installation with an App JWT. The candidate installation ID is returned only when lookup succeeds and is immediately submitted to the authenticated completion route with the opaque state. A 404 or any other discovery failure does not redirect the browser and leaves the existing Workspace Access policy UI unchanged. Existing associations are not automatically reverified or reactivated. All management mutations require active admin membership. A browser setup return only supplies untrusted candidate data; it cannot itself establish a verified link. Use a fixed allow-listed Settings return URL, never a user-supplied redirect.

Alternatives considered: accepting the setup callback's installation ID or trusting allow-list membership. GitHub explicitly warns that the ID can be spoofed. Sources: [setup URL security](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-setup-url), [user installations](https://docs.github.com/en/rest/apps/installations#list-app-installations-accessible-to-the-user-access-token), [organization membership](https://docs.github.com/en/rest/orgs/members#get-an-organization-membership-for-the-authenticated-user), [App installation lookup](https://docs.github.com/en/rest/apps/apps#get-an-installation-for-the-authenticated-app).

Explicit setup starts from `Install App` beside the allowed organization's `Remove` action. It uses the same setup endpoint: an existing candidate immediately goes through completion; only a successful setup response without a candidate navigates in the current tab to `https://github.com/apps/{slug}/installations/new?state={state}`. GitHub presents the account selection; the URL does not force the organization. Completion verifies the selected installation against the initiating organization and rejects personal-account or other-organization installations. Configuration, authority, and non-404 discovery failures report an error without navigation. Explicit verification can restore a saved non-verified association only after all checks pass; background discovery continues to skip every saved association.

### 3. Installation credential and lifecycle boundary

Add a backend-only installation credential provider beside the existing personal connection services. Validate App ID/private key and webhook secret in API configuration. Sign short-lived App JWTs and mint installation tokens using `POST /app/installations/{id}/access_tokens`. GitHub installation tokens expire after one hour; use the returned expiry with skew, deduplicate concurrent renewals, and retry an authentication failure at most once with a newly minted token. Never convert an upstream GitHub 401 into a GiTiempo-session 401 or silently retry with personal credentials.

Cache by installation, narrowed repository/permission scope, and authorization version. Local disconnect and verified lifecycle changes invalidate eligibility/version as well as cached tokens. Every start checks live repository/issue access; a successful previous request is insufficient. Cache correctness must work across API instances, using persisted association/version checks rather than only in-process invalidation. Do not persist tokens unless necessary; any persistence must use existing server-side encryption and expiry handling. Never log App JWTs, authorization headers, token endpoint payloads, or private keys.

Validate `X-Hub-Signature-256` against the raw request body with a timing-safe comparison. Deduplicate delivery IDs. Handle installation suspension/deletion, unsuspension, repository selection changes, and accepted permissions. Suspension/deletion immediately block associated starts; unsuspension/re-addition requires fresh verification before use. Out-of-order events trigger current-state reconciliation and cannot re-enable a locally disconnected link. Repository removal invalidates access eligibility, not historical project/task mappings.

Alternatives considered: a long-lived admin PAT, browser-held tokens, or webhooks as the only revocation signal. Those cannot meet the credential or per-start verification requirements. Sources: [installation tokens](https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app), [GitHub App best practices](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app), [webhook signatures](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries), [webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads).

### 4. Read-only resolution, authorization, then atomic materialization

The start sequence is:

1. Validate identifiers and GiTiempo session/current active workspace membership.
2. Resolve the allowed organization and verified active workspace association. Fetch repository and issue through the installation, including canonical IDs/names. Verify any necessary board resource and actual issue membership through organization Projects access.
3. Resolve local references within the current workspace without inserting: existing canonical issue-task mapping first; otherwise repository mapping; otherwise a uniquely verified mapped board. A board hint may disambiguate eligible boards only after GitHub verification. For a direct page with no hint and only board mappings, determine eligibility among the workspace's existing mapped boards through GitHub; do not choose an arbitrary board or create a repository project. Paginate required membership results; incomplete or failed retrieval cannot prove absence or justify another project.
4. Reject absent mappings with `github_project_mapping_required`, ambiguous mappings with `github_project_mapping_ambiguous`, and corrupt reference conflicts without writes. A known task keeps its owning project even if another repository project is introduced later. Access denial never falls back to another project.
5. Require active project state and tracking authority: ordinary `member` requires explicit assignment even for public projects; `admin` retains assignment exemption; `pm` retains the existing active-project visibility rule (public or assigned private). This preserves privileged-role behavior without treating public visibility as ordinary-member tracking authorization.
6. In a transaction, recheck the relevant workspace membership, project/assignment state, association authorization version, organization policy, and canonical mapping. Serialize access-changing operations with this authorization check using the existing row-lock/transaction patterns so a revocation committed before materialization cannot be overlooked. Do not hold a database transaction open across remote GitHub requests.
7. Only then create/reuse the task and reference, check local active/open state, and create the time entry with existing billing defaults and `source: extension`. Preserve task/ref uniqueness and one-running-timer conflict handling; roll back all materialization on failure.

A repository read grant does not prove access to an organization Project. Require Projects permission only when the chosen mapping needs a provider board check; a plain repository or established issue mapping must not fail solely because unrelated Projects permission is absent. A supplied board hint that cannot affect the authoritative issue/repository mapping is not authority to change that mapping. Sources: [GitHub App permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps), [Projects resources](https://docs.github.com/en/rest/projects/projects).

Existing helper methods that auto-create projects can remain for explicitly authorized import/setup callers, but the GitHub timer path must use an existing-only resolver. General `requireVisibleProject` is retained for browsing and PM semantics; a focused tracking authorization check handles ordinary members. Stop remains the existing owned-timer operation, including `expectedTimerId`, and never resolves installation access.

### 5. Safe error contracts and client coordination

Extend the existing domain-error envelope (`code`, `error`, `message`) and shared schemas rather than relying on English string matching. Use these start failure codes:

| HTTP | Code | Client remedy |
| --- | --- | --- |
| 403 | `project_assignment_required` | Exact assignment message from #420; contact workspace administrator or project manager |
| 403 | `github_organization_not_allowed` | Contact workspace administrator |
| 409 | `github_installation_required` | Administrator must verify/link installation |
| 403 | `github_installation_unavailable` | Administrator must restore installation access |
| 403 | `github_installation_permissions_required` | Administrator must grant the required App permissions |
| 404 | `github_resource_unavailable` | Resource unavailable; administrator checks repository access |
| 409 | `github_project_mapping_required` | Administrator or PM imports/maps the project |
| 409 | `github_project_mapping_ambiguous` | Administrator or PM resolves the mapping |
| 503 | `github_provider_unavailable` | Retry later, honoring a safe retry hint for rate limits |

Return `project_assignment_required` only after resource verification and a valid current-workspace mapping establish that assignment is the cause. Reveal the reason without project ID/name, assignee lists, provider payloads, or another workspace's metadata. GitHub may not distinguish missing resources from denied access; use the same safe 404 rather than claiming certainty about permission loss. Existing GiTiempo authentication, inactive membership, task-state, and timer-conflict responses remain in use.

The extension API client must preserve the stable code through service-worker messages/runtime state to both popup and injected controls. Neither personal connection checks nor installation failures may hide the stop action for an already-owned timer. The exact assignment copy is: "You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time."

Admin Settings retains the existing Workspace Access organization-policy rows: organization login, `Allowed for this workspace`, and `Remove`, with the user-requested `Install App` action beside `Remove`. Show this action only after installation status loads successfully and no association for the organization has status `verified`; absent, suspended, unavailable, and locally disconnected associations qualify. The label does not assert that the App is absent on GitHub. A pending manual attempt shows loading on its row and disables other Install App clicks. Without a usable personal connection, clicking reports setup guidance rather than navigating. Do not render installation status labels, a separate installation card, or association-only rows. While an eligible administrator has a usable personal GitHub connection, Settings discovers in the background and confirms only missing associations during policy load and after an organization is added. A discovered candidate still completes the same full verification; absent or failed discovery never causes automatic navigation, and saved associations are never automatically reverified or reactivated. Existing personal account setup guidance remains relevant only to administrator proof or personal browsing/import. User-web timer start errors use the same domain codes while its existing browsing connection gate remains intact.

Setup completion distinguishes two failures after successful provider lookups. If the exact installation is absent from the administrator's user-token installation list, return HTTP 409 with `Reconnect GitHub, then retry installation verification`. If it is accessible but active owner membership or expected organization identity does not match, return HTTP 403 with `GitHub organization owner authority is required`. Both reject verification without replacing an association. Reconnection is a recovery step, not proof of a stale token or a guaranteed fix. A retry starts fresh single-use setup state because completion consumes the previous state even on failure. These are setup messages, not new timer-start domain codes or member reconnection requirements.

### 6. Planned files by app/package

- **API**, following `apps/api/AGENTS.md`: `src/github/` installation services, schemas, DTOs and module wiring; `src/config/env.validation.ts`; workspace management controllers; raw-body verified webhook boundary; `src/time-entries/services/time-entries.service.ts`; `src/tasks/services/github-task-materialization.service.ts`; focused unit/e2e tests and additive Drizzle migrations. Load NestJS and Drizzle skills at implementation time.
- **Shared**, following root guidance: `packages/shared/src/contracts/github.ts`, workspace/time-entry/error contracts and exports, plus `packages/shared/openapi.json`. Keep contracts backend-safe and DTOs schema-derived.
- **Extension**, following `apps/chrome-ext/AGENTS.md`: `src/lib/api.ts`, GitHub context/board hint handling if necessary, runtime messages, popup and injected-control error states and tests. Preserve Manifest V3 and Tailwind-only rendering.
- **Admin-web**, following `apps/admin-web/AGENTS.md`: Settings workspace-access client/composable/card and associated tests for setup/status/disconnect. Before UI edits, load frontend rules, read `docs/ui/INDEX.md` and relevant Settings/pattern sections, and inspect the approved `GITiempo.pen` frames.
- **User-web**, following `apps/user-web/AGENTS.md`: GitHub start error handling in timer actions and corresponding tests; keep local-task and browsing flows intact. Follow the same frontend/design inspection requirements.
- **Docs**: superseding ADR, `docs/PROPOSAL.md`, `docs/ui/chrome-ext.md`, relevant Settings/timer guidance, configuration/setup documentation, and `bruno/` examples. No canonical behavior documentation is rewritten until implementation is delivered.

## Risks / Trade-offs

- **Existing workspaces lack verified links** → Provide additive setup/status first, explicitly verify links, then enable the changed start policy; do not infer authorization from allow-list rows.
- **Shared endpoint changes user-web behavior** → Ship its error handling and amended picker specification with the API change; verify no automatic project/assignment creation remains on that endpoint.
- **Board-only mappings need additional queries/permissions** → Use persisted mappings to limit candidates, handle pagination, and return explicit safe failure for incomplete or ambiguous resolution.
- **Organization-owner setup is restrictive** → Explain Members permission and owner requirement in Settings/setup documentation. Delegated installation managers are a future capability, not implicit authorization.
- **Concurrent revocation or delayed webhooks** → Live provider checks plus transaction-time local authorization/version checks; provider-side revocation immediately after a successful remote check cannot be made atomic with the local database.
- **PM public-project behavior differs from ordinary members** → Preserve it explicitly and test the role matrix rather than silently changing global visibility/privileges.
- **Rate limits or provider outages** → Bounded retries and safe retryable errors; no personal-token fallback or partial writes.
- **Spec/implementation drift** → Reconcile old `issueTitle` payload and auto-create requirements through full modified requirement blocks; validate all deltas before implementation.

## Migration Plan

1. Add configuration validation, association/setup-state storage and constraints, lifecycle verification, and management contracts with no trusted automatic backfill. Update App permissions and obtain organization approval where required.
2. Deliver automatic confirmation of already-installed Apps and the explicit `Install App` row action from Admin Settings, then verify target workspace associations. Retain the existing card structure, local records, and personal integrations.
3. Deploy shared error contracts, extension/user-web error consumers, and then activate the installation-backed shared start policy as a coordinated release. Existing request payloads remain accepted; credentials are selected by the server. Until activated, describe the feature as not yet available.
4. Replace the relevant ADR-003 statements and align product/UI/API guidance. Existing time history needs no migration; new starts use existing references and stable identities.
5. For rollback after activation, disable affected new GitHub starts with actionable unavailability while keeping owned-timer stop and local history available. Do not treat automatic confirmation as unverified enrollment or silently fall back to personal credentials. Keep additive association data for recovery; reverify before re-enabling.

## Open Questions

No product decision blocks writing or validating this specification. Deployment must identify the actual configured App, callback/webhook URLs, approved permission set, and operator responsible for private-key rotation; these are implementation configuration inputs, not reasons to weaken verification. Exact UI layout follows the approved design inspection during implementation.
