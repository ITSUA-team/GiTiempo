## Context

The GitHub connector is the template, and it earned its shape the hard way — this session's duplicate-project work established rules the Jira connector must be born with rather than retrofitted:

- One external container maps to one GiTiempo project, enforced before creation, with the page blocking rather than warning.
- Tracking is decided by external references, never by parsing project names.
- Items the caller cannot read are reported as an access problem, not as an empty container.
- Archived projects release their container instead of blocking it.

The existing structure to mirror: `github-oauth-foundation` (connection), `workspace-github-organization-policy` (scope filter), `github-data-browsing-api` (read-only listing), `timer-github-project-tracking` (timer targets), with contracts in `packages/shared` and encrypted tokens under the workspace `ENCRYPTION_KEY`.

Jira is structurally simpler in one important way: a Jira issue lives in exactly one Jira project. There is no board-versus-repository split, so the fallback chain that GitHub needs (issue → repository → board → create) collapses to issue → project → create.

## Goals / Non-Goals

**Goals:**

- A member connects an Atlassian account and it survives token expiry without re-connecting.
- A workspace approves exactly one Jira Cloud site; everything else is invisible.
- Timers start from Jira issues with server-side materialization under `provider: 'jira'`.
- One Jira project maps to at most one GiTiempo project, refused at import and reused by the timer.

**Non-Goals:**

- Sign-in with Atlassian, extension injection, webhooks, two-way sync, Jira Server.
- Generalizing the GitHub module into a provider framework. Two similar modules are cheaper than one premature abstraction; a third provider would justify revisiting.

## Decisions

### Mirror the GitHub module, do not abstract it

`apps/api/src/jira` mirrors `apps/api/src/github` file-for-file where the concern exists: oauth client, oauth state, connections, encryption, API client, site policy. The alternative — extracting a shared provider framework first — was rejected: the GitHub module is battle-tested and stable, and reshaping it under a live connector to serve a second one multiplies risk for no user-visible gain.

### Atlassian OAuth 2.0 (3LO) with rotating refresh, single-flight

Unlike GitHub App tokens, Atlassian access tokens expire in about an hour and refresh tokens rotate on every use — using a refresh token twice invalidates the family. The connections service therefore refreshes under a per-connection lock (single-flight): concurrent requests wait for one refresh rather than racing. A refresh failure marks the connection as needing re-authorization instead of deleting it, so the UI can say what happened. Scopes: `read:jira-work read:me offline_access` — the minimum for browsing and identity, nothing writable.

### The site is resolved server-side and pinned by policy

After the OAuth callback the backend calls `accessible-resources` to learn which sites the account can reach. The workspace policy stores the approved site's `cloudId` and hostname. Every Jira API call goes through `api.atlassian.com/ex/jira/{cloudId}/...` with the cloudId taken from the policy, never from the request — the same "the discriminator names a destination, it cannot supply one" rule the GitHub sign-in destinations follow. One site per workspace: multi-site workspaces are a real Atlassian shape, but one site covers the known need and widening later is additive.

### Identity: immutable id as the anchor, key as the display

Jira issue keys (`KES-123`) change when an issue moves between projects; issue ids never do. So `task_external_refs` for Jira stores `externalId` = issue id (the anchor lookups use) and `externalKey` = issue key (what humans and URLs show). Project mapping likewise: `externalId` = Jira project id, `externalKey` = project key. This inverts the GitHub habit of resolving by key — a deliberate difference, because for GitHub the key (owner/repo) is the stable identity and for Jira it is not. The existing `lower(external_key)` uniqueness on task refs is indifferent to this: Jira keys are uppercase-normalized on write.

### Materialization: issue → project → create

A timer started from a Jira issue resolves: tracked issue by `externalId` → GiTiempo project mapped to the issue's Jira project → create the project (named after the Jira project, `KES — Kesher Delivery` shape avoided; just the Jira project name) and the task. Created projects follow the duplicate-name refusal already in `ProjectsService.createProject` by going through the same name-availability check, and the import path refuses a Jira project an active GiTiempo project already tracks — the born-with version of what GitHub just had retrofitted.

### Unreadable content is an access state, not emptiness

Jira permissions can hide issues (issue security, project permissions). Browsing responses carry what the account could not read where the API exposes it, and the picker says "private to you" rather than "no issues" — the exact lesson from the GitHub redacted work, applied from the start.

## Risks / Trade-offs

**[Rotating refresh tokens brick the connection if raced] → Single-flight refresh per connection, and re-auth state instead of silent deletion.** This is the highest-consequence difference from GitHub and it is handled in the foundation, with a test that simulates the race.

**[Atlassian rate limits are per-app and opaque] → Same pagination caps and probe limits the GitHub browsing uses, and 429 surfaces as a retryable error, not a failure of the board.**

**[One more table under ENCRYPTION_KEY] → Documented in the rotation runbook.** Rotating the key already requires re-encrypting `github_connections`; `jira_connections` joins that list.

**[Two connector modules drift apart] → Accepted until a third provider exists.** The specs pin the behavioral contract; the code being parallel rather than shared is a maintenance cost paid knowingly.

**[Jira project names collide with existing GiTiempo projects] → The same conflict answer as everywhere else: refused with the holder named.**

## Migration Plan

Additive only. Three new tables ship as a regular generated migration; no existing rows change. Rollout needs `JIRA_CLIENT_ID`/`JIRA_CLIENT_SECRET` and the callback URL registered on an Atlassian app in each environment — absent configuration fails fast at boot the way the GitHub env validation does.

## Open Questions

- Should the profile page's connection card show which site the workspace is pinned to, or only the admin settings? Leaning: show it, read-only.
- Issue search in the picker: Jira's JQL is powerful but slow; first cut lists recent issues per project with the same caps as GitHub boards. Revisit if search is demanded.
