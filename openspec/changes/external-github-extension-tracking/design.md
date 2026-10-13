## Context

The extension detects direct GitHub issues and Projects issue panes, but its start request currently sends only repository and issue number. `TimeEntriesService.startTimerFromGitHub()` verifies an installation before resolving an existing project. Ordinary members require project assignments, including for saved GitHub tasks. Project reads currently treat public visibility or assignment as access to the whole project and its tasks.

Customers may refuse App installation. The approved solution records work from page context, with one shared repository/issue identity per workspace and restricted personal visibility. The feature is on by default and requires no GitHub account link. See `proposal.md` and the approved planning source for scope.

The completed `require-project-assignment-for-saved-github-timers` and `unify-github-oauth-account-linking` changes were archived and synchronized into canonical specs on 2026-10-12. This change adds a narrow exception for newly created external-reference projects; managed projects retain those protections. Use that synchronized baseline and apply this delta to `Saved GitHub Task Starts Require Project Authorization Across Connection States` with managed-only assignment rules and the explicit external exception; do not rewrite the archived artifacts.

`prepare-chrome-web-store-privacy` was also archived and synchronized on 2026-10-12. Its policy and package handoff describe the earlier repository/issue-number payload. This delta modifies `Privacy Policy Matches Actual Data Handling` to cover transmitted issue titles and canonical URLs, external recording without GitHub API calls, and own-time sharing boundaries. The historical handoff does not establish privacy readiness for this new release.

## Goals / Non-Goals

**Goals:**

- Start external issue timers using the current GiTiempo session, without GitHub API access or setup gates.
- Resolve shared identity independently of the caller's visible project list.
- Grant derived project/task reads only through the caller's existing time, including a running entry.
- Reuse explicit admin/assignment authorization separately from derived personal access.
- Preserve managed-project rules, timer invariants, billing, and history.

**Non-Goals:**

- Repository rename/transfer detection, rebinding, merge UI, or conversion between tracking modes.
- GitHub synchronization, private-repository API discovery, broader OAuth scopes, or proof of GitHub resource access.
- A personal workspace, extension workspace switcher, admin enablement toggle, new dependencies, or PR/draft tracking.
- Implementing this feature, applying a migration, or publishing an extension as part of proposal creation.

## Decisions

### 1. Persist tracking policy independently of data provenance

Add a server-owned project `trackingMode` with values `managed` and `external-reference`; backfill/default all existing projects to `managed`. New reference materialization creates private projects with `external-reference`. Ordinary create/update requests cannot select or change this mode. Mode conversion and making an external-reference project public are outside this release; reject attempts to change its visibility away from private. Existing explicit project assignments remain independent grants.

Store user-supplied versus provider-verified provenance on external references separately from project tracking policy. A provider read or later import must not silently change project permissions. User-supplied references do not receive a fake synchronization timestamp. Client-supplied fields cannot mark a reference verified or change existing metadata.

Alternative rejected: deriving policy from missing installation/link, `source: github`, nullable `syncedAt`, or public visibility. Those values do not reliably express the authorized access policy and would change behavior as integrations come and go.

### 2. One Start action with server-owned routing

Add `POST /time-entries/timer/start-from-github-reference`, accepting `githubRepo`, `issueNumber`, `issueTitle`, and canonical `issueUrl`. The updated extension sends its full context here from either supported surface; it does not ask the member to choose an integration mode.

```text
GiTiempo session + active membership + validated page context
                       |
        workspace issue mapping, then repository mapping
                       |
         +-------------+----------------+
         |                              |
 managed target                 external target / no mapping
         |                              |
 existing installation          local reference authorization
 and project authorization      + atomic shared materialization
         |                              |
         +----------- owned timer ------+
```

An existing managed target delegates to the established installation start behavior, including organization, assignment, canonical resource, and local state checks. It does not fall back to reference mode on denial, provider outage, or missing installation. Existing legacy endpoints retain their contracts; a legacy installation endpoint reaching an external target must reject with a safe unsupported-path error, not bypass its tracking policy or alter mode. Updated user-web saved-task starts use the stored-task path.

For external/no mapping targets, no GitHub API is called. No existing read access is required for the first reference start, because visibility follows successful work recording. Lookup may see mappings hidden from the caller; only an authorized committed own entry and permitted target fields are returned. Reject ambiguous mappings instead of choosing a project opportunistically.

Alternative rejected: trying the installation endpoint first and catching errors in the extension. It makes connectivity and failures determine authorization and provides no reliable first-start route.

### 3. Atomic identity resolution and start

Use case-insensitive `(workspace, github, repository, owner/repo)` uniqueness for repository references and the existing case-insensitive workspace issue key for tasks. Do not use user ID, display project name, or GitHub account link in either key. Keep the existing issue mapping ahead of repository mapping; an issue already held by a managed board remains there.

Perform fresh membership/role checks, namespace/mapping resolution, local project/task state checks, and timer creation in one transaction for reference materialization. Re-read identity after acquiring locks; follow existing mutation lock order and coordinate all import writers with the uniqueness constraint. Never run provider I/O while holding reference-creation locks. If routing discovers a managed target during a race, release/retry through managed authorization; never create a duplicate. Any managed preflight result must be revalidated at its existing write boundary.

Concurrent starts by two members share project/task IDs but create their own entries. A second start by the same user remains a conflict under the global running-timer constraint. On a lost response, the client refreshes the authoritative current timer; it does not insert another entry or manufacture a successful response. A denied/conflicting first start rolls back new project/task/reference rows.

Reuse task billing defaults and workspace/project initialization conventions. Preserve source `extension` for extension starts, source `web` for saved-task starts, positive duration rules, conditional stopping, and local active/open checks. Incoming page titles do not overwrite existing shared task titles, metadata, or status.

### 4. Separate personal read scope from management scope

Reuse existing Projects, task rows/cards/dialogs, timer/manual-entry pickers, Dashboard/history, and admin views. Do not introduce external-only routes, pages, navigation sections, or parallel view components. Add a compact `External` tag to external-reference projects and tasks within the current components. The tag describes stored project policy, not the caller's access scope, and must not be inferred merely from a GitHub source or missing connection.

On the existing Projects card/section, an external project with `accessScope: own-time` has a `?` help control. Its tooltip says: `You can only see your own time and tasks with your time entries.` Show it on hover and keyboard focus, and allow tap/click on touch devices; provide an accessible name and dismiss it with Escape or outside interaction. Do not show this restrictive explanation for `accessScope: project`, including full-access admins. Keep scoped totals and capability-gated controls in the existing layout; no separate own-time page heading, permanent explanatory panel, or dedicated picker is needed.

Resolve access centrally into `project` (existing full project-read authority), `own-time`, or denied. Administrators retain all workspace projects, including inactive ones. Existing explicit assignments grant only their established role capabilities. An unassigned PM gains no management or peer-record access merely by tracking.

For an active external-reference project without separate project access, an own entry in any of its tasks grants `own-time` project reads. A task is readable in that scope only when that caller has an entry for that exact task. A running entry counts. Project existence and project-name matching do not authorize its other tasks.

Apply the same predicates to list/detail endpoints, search, pickers, time-entry routes, summaries, counts, pagination totals, and personal entry views. Own-time alone MUST NOT expand management report or export eligibility: existing role and project-grant checks still apply, ordinary members remain denied, and unassigned PMs do not gain reporting access. Own-time readers receive only their entries and scoped aggregates. They cannot edit/delete shared tasks, create arbitrary tasks through generic endpoints, change billing defaults, administer assignments, or modify the project. Reference first-start remains the explicit materialization path. Own-entry description/interval edits retain current rules; moves/manual entries require an already authorized target and must not bootstrap access to a hidden task.

Keep explicit write-policy checks separate from helpers that previously equated project visibility with mutation rights. This is necessary because simply broadening the existing visibility predicate would open task-update and PM project-update operations.

Alternative rejected: automatic assignment or a permanent participation row after the first start. It would grant broader rights and retain visibility after the last own entry disappears, contrary to the approved rule.

### 5. Derive visibility from current entries

After successful start commit, the project/task becomes visible. Deleting or moving the last own entry removes that derived task access; removing the last entry in the project removes derived project access. Other members' entries and shared entities remain untouched. Separate admin/assignment grants still apply. Running-entry deletion remains disallowed under the existing API; owned stop remains available even when ordinary start/read eligibility later changes.

Saved-task starts for external tasks require current authorized task access, but no additional assignment or GitHub link. A stale saved task ID after loss of the last own entry must be denied. The member can establish new participation by starting from that issue through the extension again. An unrelated issue's history cannot authorize a guessed task ID.

Invalidate personal project/task/detail/picker caches after start, deletion, or reassignment; refresh on navigation/refocus for changes originating in the extension or another tab. On membership or explicit-grant changes, clear any wider cached data before displaying the narrower scope.

### 6. Explicit response scope and safe extension context

Shared project/task responses carry `accessScope: project | own-time` plus operation capabilities such as `canManageTasks`; the server remains authoritative for every operation. For own-time project responses, expose common project identity and the caller's aggregates, return `members: []` and `assignedMembersSummary: null`, and never serialize peer identities, peer activity timestamps, or peer totals. The schema makes these scope-dependent fields explicit instead of treating hidden counts as zero. `memberCount` remains absent in every scope. Full-project readers may derive assigned-member counts from `members.length`; own-time clients must treat the empty list as redacted and hide counts. Other scopes keep their existing values. These are coordinated API/client contract changes.

The authenticated extension runtime receives current workspace ID/name and usable context/operation state, without tokens, private integration metadata, or a GitHub-link prerequisite. Reuse existing authenticated workspace APIs where possible rather than a new configuration surface. Context is associated with the current session/workspace; a stale session change requires refresh before starting.

Build `https://github.com/<owner>/<repo>/issues/<number>` from parsed context for direct pages and Projects panes. Validate host, protocol, owner/repository shape, positive safe issue number, matching components, and bounded plain-text title. Do not fetch caller URLs. Discard incidental query/hash; no board URL is accepted as canonical issue URL. A Projects board title or stale header is not an issue title: wait/retry context extraction and re-read the current page on Start. Unsupported or incomplete pages cannot start.

Alternative rejected: persisting `document.title` blindly or passing the Projects URL unchanged. Both are current display fallbacks that become incorrect stored data in this feature.

### 7. Preserve managed and import behavior

Existing projects stay managed with their current visibility, assignments, billing, and installation-based extension requirements. A reference start matching one cannot opt out of those checks. If an ordinary repository import later finds an external-reference mapping, reuse that project ID and leave mode/rights unchanged; report its existing status truthfully without claiming new synchronization. Board import must not steal an external-reference mapping, including an inactive one, or split existing issue history. Any attempted reassociation/conversion is deferred and returns a clear conflict. Ordinary managed-to-managed import rules retain existing behavior.

Provider credentials remain required by actual browsing/import operations. External recording does not add organizations, install Apps, consume private API tokens, or change personal GitHub sign-in/linking behavior. Absence, expiry, revocation, or unlinking of a personal GitHub connection cannot block reference recording.

### 8. Planned files by app/package

- **API — `apps/api/AGENTS.md`:** projects/task/reference schemas and migrations; project/task access and summaries; time-entry controllers/services; materialization; import writers; reporting predicates; guarded mutation callers. Keep the access policy reusable and narrow; inspect actual helper consumers before modifying them.
- **Shared — `packages/shared`:** project/task/time-entry contracts, strict reference input, scoped response schemas, stable errors/capabilities, and generated OpenAPI. Keep these backend-safe.
- **Extension — `apps/chrome-ext/AGENTS.md`:** `src/lib/github-context.ts`, `api.ts`, `runtime.ts`, background orchestration, popup, and content controls. Preserve Manifest V3, extension-owned storage, and Tailwind-only UI. Follow `docs/ui/INDEX.md` and `chrome-ext.md`; inspect approved frames `rLhIi`, `Nk0kr`, `eQNB0`, `Kfjm4`, and `vzO0K` before implementation.
- **User-web — `apps/user-web/AGENTS.md`:** Projects list/details, task dialogs/actions, top-bar task picker, dashboard/history repeat controls, API clients and query invalidation. Follow `docs/ui/pages-user.md`, `patterns.md`, the frontend skill, and approved screen parity before UI edits.
- **Admin-web — `apps/admin-web/AGENTS.md`:** tolerate scoped contract changes; retain full admin data and assigned PM scope in projects/reports. Add no enablement settings. Update rendering only where contracts require it and verify role-sensitive queries/actions.
- **Shared frontend — `packages/web-shared/AGENTS.md` if touched:** reuse existing shared HTTP/query leaves only where proven identical; verify both SPAs if those leaves change.
- **Landing — `apps/landing-web`:** update public privacy content for the implemented reference payload, managed provider retrieval, and scoped sharing. Follow the landing skill and existing static legal-page requirements; verify the deployed policy before extension distribution.
- **Docs:** ADR 009, `docs/PROPOSAL.md`, `API-ENDPOINTS.md`, `DATA-MODEL.md`, `github-installations.md`, affected UI sections, and extension collection disclosures. This proposal does not edit those implementation-era sources or approved designs.

## Risks / Trade-offs

- **Submitted context is not proof of GitHub access** → treat it as user-entered work data; own-time visibility never unlocks peer tasks, peer entries, or shared management.
- **Broadening a read helper accidentally grants writes** → separate personal read and explicit management scopes, inventory every mutation consumer, and test direct endpoints as well as UI.
- **Case collisions already exist** → run a read-only preflight; stop a conflicting migration with a concrete report rather than delete history or silently choose an owner. Operational reconciliation is a deployment prerequisite, not a new merge feature.
- **Own-time predicates increase query cost** → use indexed existence queries and scoped aggregates; examine representative plans for lists, detail, and task search before deciding whether additional composite indexes are necessary.
- **Page headers change or race during navigation** → tie extraction to the current issue and disable Start until the context is complete.
- **Repository URLs change** → document the accepted first-release limitation; do not promise immutable identity or automatically merge URLs.
- **Old clients assume unrestricted summary fields** → coordinate response-schema and frontend rollout and keep legacy installation starts compatible for managed targets.

## Migration Plan

1. Validate schema and preflight duplicate repository keys. Persist managed mode for existing projects, external-reference mode only for new reference creation, and explicit provenance. Add the case-insensitive repository constraint and update all matching conflict writers together.
2. Deploy access-safe API/contracts and both SPA consumers before distributing the updated extension. No user-facing enablement toggle is introduced; the feature is available by default with the updated release.
3. Verify isolation, parallel starts, all read/write boundaries, deletion/reassignment effects, billing, import preservation, old managed flows, and both browsers. Regenerate OpenAPI using the repository's supported build-based workflow when required.
   Update and verify the deployed public policy and candidate-specific collection inventory before distributing the extension with the changed payload. Retain package version/hash and policy verification evidence; do not reuse the historical privacy handoff as approval of this candidate. Publisher confirmation of Store declarations remains a separate release prerequisite; this task does not edit the Dashboard or submit the extension.
4. Rollback must preserve records, own stopping/history, and external policy enforcement. Do not downgrade to a version that interprets external projects as ordinary full-access projects. Temporarily withdrawing the new start route through an operational release is distinct from adding a workspace product setting.

## Open Questions

None for the approved product scope. Schema collision preflight, actual access-helper mapping, and design parity are implementation checks, not unresolved product choices. GitHub linking is explicitly optional; rename/transfer and conversion remain deferred.
