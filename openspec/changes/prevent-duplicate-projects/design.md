## Context

Four cooperating defects produce the duplicate:

**The page allows what it warns about.** `github-project-import.ts` already detects, case-insensitively, that a board's repository belongs to another project — the preview literally says "already tracked by another project". But the specified behavior is "reported, not blocked": the add action stays enabled, so the warning reads as trivia.

**The backend has no relation check.** `importBoard` short-circuits only on the *board* mapping (`externalType: 'project'`, keyed by GitHub's stable node id — that part works). For the *repository* mapping it inserts with `onConflictDoNothing` and never reads the result: when the repository is taken, the link silently does not happen and the import still reports success with a created project.

**The unique index is case-sensitive while GitHub identity is not.** Two writers disagree about spelling:

| Writer | Value stored |
|---|---|
| `ProjectImportsService.resolveRepository` | `repository.fullName` — what GitHub reports |
| `GithubTaskMaterializationService.findOrCreateProjectForRepo` | `input.githubRepo` — what the caller sent |

So the same repository routinely exists under two casings, the `onConflictDoNothing` finds no conflict, and both mappings persist.

**The reader picks arbitrarily.** `findGitHubProjectRef` matches with `lower(external_key) = <normalized>` and `.limit(1)` with no `ORDER BY`.

The data model already promises the guarantee this chain breaks: *Provider lookup remains unique within workspace*. And `time-tracking-api` already requires recording the identifier GitHub reports. The design therefore mostly makes existing requirements true, plus one deliberate rule reversal the author directed.

## Goals / Non-Goals

**Goals:**

- Importing a board whose repository is already tracked by another project refuses with the tracking project named, writing nothing.
- The dropdown and preview surface that state before the user tries.
- One GitHub repository maps to at most one project per workspace, enforced by the database.
- Every writer records the identifier GitHub reports; resolution is deterministic.
- A workspace cannot hold two active projects whose names differ only by case.
- Existing duplicates are merged deliberately, with a readable outcome.

**Non-Goals:**

- Auto-attaching a refused board to the tracking project. Repository-mapping precedence already routes timers from that board's issues to the tracking project, so attaching would re-point board identity for no behavioral gain — and if the board later gains issues from other repositories, an attached board ref would quietly widen what the tracking project claims. The settings chosen on the form (manager, visibility, billable) would also silently not apply, which the page is explicitly forbidden to imply.
- Case-insensitive identity for providers other than GitHub.
- Renaming existing projects to a canonical spelling; names are user-facing and stay as typed.
- Re-mapping or reviving mappings held by disabled projects.
- Deduplicating tasks or time entries.

## Decisions

### The import refuses; the page prevents

The relation check runs server-side in `importBoard` before anything is written, and again structurally: the repository-mapping insert switches from a swallowed `onConflictDoNothing` to a checked insert — if no row comes back, the transaction rolls the just-created project back and the board is reported as refused with the tracking project attached, the same pattern the board-mapping race already uses. The service check produces the friendly answer; the index makes it airtight under concurrency.

The dropdown keeps its existing case-insensitive client-side computation but the state becomes blocking, styled like "already added" is today. The client hint is a courtesy; the server is the authority, so a selection that goes stale between load and submit still ends in a named refusal rendered in place, not a surprise project.

A repository tracked only by a *disabled* project still refuses — the mapping exists and the new index would reject a second one regardless — and the message says the tracking project is archived, so the operator understands the way out is reactivating or handling that project, not retrying the import.

### Canonicalize at the boundary, not at the call site

`findOrCreateProjectForRepo` resolves the repository through GitHub and stores `fullName`, as the import path already does. Lowercasing before insert was rejected: it invents a spelling GitHub never used, which then leaks into project names, `external_url`, and metadata. When verification fails, the timer start fails; writing the caller's spelling as a fallback is the exact behavior that created the defect. The existing lookup still runs first, so no GitHub call is added when the project already exists.

### Enforce uniqueness on `lower(external_key)`, scoped to GitHub

The unique index becomes a partial expression index over `(workspace_id, provider, external_type, lower(external_key))` where `provider = 'github'`; exact-match uniqueness stays for other providers, whose identifiers may be genuinely case-sensitive.

### Resolve deterministically by creation order

`findGitHubProjectRef` gains `ORDER BY created_at, id`. It matters during the window before the migration lands, and it makes the merge migration's survivor choice match what the reader would have picked.

### Name uniqueness as a partial index on active projects

`UNIQUE (workspace_id, lower(name)) WHERE is_active`, with a service-level check returning a typed conflict so the API answers with the collision rather than a constraint violation. Global uniqueness and archived-inclusive uniqueness were rejected: the first reserves names across tenants, the second reserves them forever against soft-disable semantics.

### Report merge failures rather than forcing them

The migration keeps the mapping on the project that has recorded time, falling back to the older project when neither or both have. It deletes no project and moves no time entry. Undecidable pairs are reported and the index creation fails loudly.

## Risks / Trade-offs

**[Existing duplicate mappings block the new index] → Merge first, fail the deploy if any remain.** Skipping silently would leave the guarantee nominal while the code assumes it holds — the exact state being fixed.

**[Existing duplicate active names block the name index] → Report and stop.** Auto-renaming user-visible names in a migration is not acceptable.

**[A flow that used to succeed now refuses] → Intended.** Both refusals — the tracked-repository import and the duplicate name — are the requested behavior, but operators should expect support questions from users who relied on the old outcome.

**[Two projects legitimately want the same name] → Accepted.** The import derives `owner/board-title`, the timer derives `owner/repo`; when a board's title equals its repository name these collide honestly and the second now fails with a named conflict instead of quietly coexisting.

**[The added GitHub call can fail during a timer start] → Fail the start.** There is no safe fallback spelling.

**[Client hint and server disagree] → Server wins by construction.** The refusal response carries the tracking project, so the page renders the outcome without a refetch.

## Migration Plan

1. Merge duplicate GitHub repository mappings; report anything undecidable and stop.
2. Rewrite surviving GitHub mapping keys to the spelling GitHub reports where they differ only by case.
3. Create the partial case-insensitive unique index for GitHub mappings.
4. Report duplicate active project names per workspace; stop if any exist.
5. Create the partial unique index on `(workspace_id, lower(name))`.

Rollback drops the two indexes. Steps 1–2 are not reversible, which is acceptable because they converge on identifiers GitHub already reports.

## Open Questions

- Should the name conflict be reported as the user types, or only on submit? Live reporting needs a lookup endpoint that does not exist yet; submit-time reporting is what the specs guarantee.
