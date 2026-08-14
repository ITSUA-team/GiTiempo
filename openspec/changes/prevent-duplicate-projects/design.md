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

### This was already solved next door

`task_external_refs` had the identical split — the extension used to lowercase the owner, so one issue became two tasks. Migration `0015_dedup_github_issue_casing` collapsed the duplicates and rebuilt that table's unique index on `lower(external_key)`, for every provider rather than only GitHub, and `task-external-refs.schema.ts` carries the reasoning in a comment. `project_external_refs` is the mirror table and never got the same treatment.

That precedent settles two questions this design would otherwise have to argue from first principles, and it is followed rather than re-litigated. What it does **not** settle is what to do with the duplicate rows, because a duplicate task and a duplicate project are not comparable objects.

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

### Enforce uniqueness on `lower(external_key)`, for every provider

`project_external_refs_workspace_provider_key_unique` is rebuilt over `(workspace_id, provider, external_type, lower(external_key))`, byte-for-byte the shape `task_external_refs` has carried since `0015`.

An earlier draft scoped this to `provider = 'github'` so that a case-sensitive provider could keep exact matching. That was rejected: the team already faced the choice for task mappings and made it globally, and two mirror tables disagreeing about what provider identity means would cost more in confusion than the hypothetical it protects. If a genuinely case-sensitive provider is added later, both tables should change together, as one decision.

The stored key keeps GitHub's real casing. Only the index expression is case-folded.

### Resolve deterministically by creation order

`findGitHubProjectRef` gains `ORDER BY created_at, id`. It matters during the window before the migration lands, and it makes the merge migration's survivor choice match what the reader would have picked.

### Name uniqueness as a partial index on active projects

`UNIQUE (workspace_id, lower(name)) WHERE is_active`, with a service-level check returning a typed conflict so the API answers with the collision rather than a constraint violation. Global uniqueness and archived-inclusive uniqueness were rejected: the first reserves names across tenants, the second reserves them forever against soft-disable semantics.

### Unlink the duplicate mapping; never delete the project

`0015` could merge and delete a duplicate task cheaply: only `time_entries` (restrict) and its own refs (cascade) pointed at one, so moving the entries and dropping the task was complete and safe.

A project is a different object. Four things point at it:

| Referencing column | On delete |
|---|---|
| `tasks.project_id` | restrict |
| `project_assignments.project_id` | cascade |
| `project_external_refs.project_id` | cascade |
| `task_external_refs.project_id` | cascade |

A full merge would have to move `tasks`, then also rewrite `task_external_refs.project_id` for every moved task — because that column cascades, deleting the old project after moving only the tasks would silently destroy the GitHub issue link of each one. It would additionally have to reconcile `project_assignments` against its `(project_id, user_id)` unique index, and pick a winner between two projects' names, visibility, and billable defaults. None of that is a migration's decision to make.

So the migration goes only as far as the index requires. Per case-insensitive repository key it keeps one mapping — the row carrying GitHub's real casing, then the older project, the same ordering `0015` used — and deletes the other **mapping row only**. The project it pointed at survives intact with its tasks, its time, and its assignments; it is simply no longer claimed by that repository. Every project left unlinked this way is reported, because a workspace holding two similar projects is a real problem, just a human one: whether to rename, archive, or genuinely merge them depends on facts a migration cannot see.

Timers keep working throughout. Resolution follows the surviving mapping, so new time for that repository lands in one project from then on.

## Risks / Trade-offs

**[Existing duplicate mappings block the new index] → Unlink duplicates first by a deterministic rule, so nothing is left for the index to trip over.** Because unlinking never deletes a project, there is no case the rule cannot decide, and the migration does not need an escape hatch.

**[A project silently loses its GitHub link] → Report every one.** This is the real cost of unlinking rather than merging: a workspace can be left with a project that still holds time but no longer answers for its repository. It has to be visible, or it becomes the next mystery. The migration output is the record.

**[Existing duplicate active names block the name index] → Report and stop.** Auto-renaming user-visible names in a migration is not acceptable, and unlike the mapping case there is no safe partial step: a name either collides or it does not.

**[A flow that used to succeed now refuses] → Intended.** Both refusals — the tracked-repository import and the duplicate name — are the requested behavior, but operators should expect support questions from users who relied on the old outcome.

**[Two projects legitimately want the same name] → Accepted.** The import derives `owner/board-title`, the timer derives `owner/repo`; when a board's title equals its repository name these collide honestly and the second now fails with a named conflict instead of quietly coexisting.

**[The added GitHub call can fail during a timer start] → Fail the start.** There is no safe fallback spelling.

**[Client hint and server disagree] → Server wins by construction.** The refusal response carries the tracking project, so the page renders the outcome without a refetch.

## Migration Plan

Hand-written, in the shape of `0015_dedup_github_issue_casing`.

1. Per workspace, provider, external type, and `lower(external_key)`, rank project mappings by GitHub's real casing first, then the older project, then id. Delete every row but the first — mapping rows only, no project.
2. Report the projects those deleted rows pointed at, so the workspace's orphaned duplicates are on the record.
3. Drop and recreate `project_external_refs_workspace_provider_key_unique` over `(workspace_id, provider, external_type, lower(external_key))`.
4. Report duplicate active project names per workspace; stop if any exist.
5. Create the unique index on `(workspace_id, lower(name)) WHERE is_active`.

Rollback drops the two indexes and restores the raw-key mapping index. Step 1 is not reversible — the deleted rows were duplicates of a surviving mapping, and the projects they pointed at are untouched, so nothing recoverable is lost.

Step 4 is the one that can stop a deploy. Tasks 1.1–1.3 exist to find out in advance whether it will.

## Open Questions

- Should the name conflict be reported as the user types, or only on submit? Live reporting needs a lookup endpoint that does not exist yet; submit-time reporting is what the specs guarantee.
