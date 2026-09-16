## Context

Four cooperating defects produce the duplicate:

**The page allows what it warns about.** `github-project-import.ts` already detects, case-insensitively, that a board's repository belongs to another project — the preview literally says "already tracked by another project". But the specified behavior is "reported, not blocked": the add action stays enabled, so the warning reads as trivia.

**The backend has no relation check.** `importBoard` short-circuits only on the *board* mapping (`externalType: 'project'`, keyed by GitHub's stable node id — that part works). For the *repository* mapping it inserts with `onConflictDoNothing` and never reads the result: when the repository is taken, the link silently does not happen and the import still reports success with a created project.

**The reader picks arbitrarily.** `findGitHubProjectRef` matches with `lower(external_key) = <normalized>` and `.limit(1)` with no `ORDER BY`.

**Writers were suspected and cleared.** An earlier draft asserted that `findOrCreateProjectForRepo` stores the caller's spelling while the import stores GitHub's. Tracing its two callers before writing code showed otherwise: the import passes `resolveRepository`'s `repository.fullName`, and the timer path is handed `githubRepo` by `startTimerFromGitHub`, which has already resolved it through `github.getRepository` and taken `fullName` — with a comment recording that lowercasing there was a previous bug. Both writers store GitHub's casing today.

That matters for scope. Nothing currently in the code creates a mixed-case pair, so the observed pair is most plausibly data written before that fix. This design does not chase an unproven cause: it closes the routes a duplicate can still take and makes an existing pair resolve predictably.

## Goals / Non-Goals

**Goals:**

- Importing a board whose repository is already tracked by another project refuses with the tracking project named, writing nothing.
- The dropdown and preview surface that state before the user tries.
- Every writer records the identifier GitHub reports; resolution is deterministic.
- Creating or renaming a project refuses a name an active project already holds.

**Non-Goals:**

- Touching stored data. No migration, no dedup, no rewriting of existing keys or names.
- Adding database constraints. See the trade-off below.
- Auto-attaching a refused board to the tracking project. Repository-mapping precedence already routes timers from that board's issues to the tracking project, so attaching would re-point board identity for no behavioral gain — and the settings chosen on the form would silently not apply, which the page is explicitly forbidden to imply.
- Deduplicating tasks or time entries.

## Decisions

### The import refuses; the page prevents

The relation check runs server-side in `importBoard` before anything is written, matching the repository case-insensitively the way `findGitHubProjectRef` already does. The repository-mapping insert also stops swallowing conflicts: if no row comes back, the transaction rolls the just-created project back and the board is reported as refused, the same pattern the board-mapping race already uses.

The dropdown keeps its existing case-insensitive client-side computation but the state becomes blocking, styled like "already added" is today. The client hint is a courtesy; the server is the authority, so a selection that goes stale between load and submit still ends in a named refusal rendered in place, not a surprise project.

A repository tracked only by a *disabled* project still refuses, and the message says the tracking project is archived, so the operator understands the way out is reactivating or handling that project rather than retrying.

### Leave canonicalization where it already is

Both callers of `findOrCreateProjectForRepo` already hand it the name GitHub reports, so pushing a `getRepository` call down into it would only duplicate work the callers have done. Lowercasing before insert was considered and rejected on its own merits: it invents a spelling GitHub never used, which would then leak into project names, `external_url`, and metadata.

### Resolve deterministically by creation order

`findGitHubProjectRef` gains `ORDER BY created_at, id`. Existing duplicates are not being cleaned, so this is what stops them from behaving differently between requests — and it is the only change group 3 turned out to need.

### Name uniqueness checked in the service

The create and update paths compare against active projects in the workspace, case-insensitively, and return a typed conflict naming the collision. A project may keep or recase its own name. Disabling a project releases its name.

## Risks / Trade-offs

**[Enforcement is in the services, not the database] → Accepted, and it is a real gap.** The durable guarantee would be a unique index on `lower(external_key)`, the shape `task_external_refs` has carried since `0015_dedup_github_issue_casing`, plus one on `(workspace_id, lower(name)) WHERE is_active`. Neither can be created while duplicate rows exist, and cleaning those rows is out of scope by direction. So two concurrent requests can still race past the service check. The checked insert narrows the window for mappings — the second writer loses and rolls back — but the name check has no such backstop.

**[Existing duplicates stay] → By design.** The two projects that prompted this change remain. Resolution now picks between them deterministically rather than arbitrarily, so at least new time stops scattering, but the workspace still shows both until someone decides what to do with them.

**[A flow that used to succeed now refuses] → Intended.** Both refusals — the tracked-repository import and the duplicate name — are the requested behavior, but expect support questions from users who relied on the old outcome.

**[Two projects legitimately want the same name] → Accepted.** The import derives `owner/board-title`, the timer derives `owner/repo`; when a board's title equals its repository name these collide honestly and the second now fails with a named conflict.

**[The added GitHub call can fail during a timer start] → Fail the start.** There is no safe fallback spelling.

**[Client hint and server disagree] → Server wins by construction.** The refusal response carries the tracking project, so the page renders the outcome without a refetch.

## Open Questions

- Should the name conflict be reported as the user types, or only on submit? Live reporting needs a lookup endpoint that does not exist yet; submit-time reporting is what the specs guarantee.
- When should the database constraints be added? They are the only thing that closes the concurrency gap, and they need the existing duplicates resolved first.
