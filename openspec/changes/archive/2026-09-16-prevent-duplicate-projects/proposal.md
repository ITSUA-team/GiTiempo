## Why

A workspace ended up with two projects for one repository, their names differing only in letter case. Reading the code, the duplicate is not one bug but a chain:

1. **The page warns and then permits.** When the chosen board's repository already belongs to another GiTiempo project, the Add Project form says so — and then, by its own specification, "the project can still be added". The user is invited to create the duplicate.
2. **The backend never asks the question.** `importBoard` checks whether the *board* was imported before, but never whether an existing project already tracks the *repository*. Its only defence is a `onConflictDoNothing` on the mapping insert whose result it never reads — so when the repository is taken, the link silently does not happen and the import still reports success with a created project.
3. **Nothing notices two mappings that differ only by case.** The unique index compares raw keys while GitHub identity is case-insensitive, so `ITSUA-team/Kesher` and `itsua-team/kesher` can coexist as two mappings for one repository.
4. **Resolution is then a coin toss.** The repository-to-project lookup matches case-insensitively and takes the first row with no ordering, so once two mappings exist it is undefined which project receives new time.

An earlier draft of this proposal claimed the timer path stores the caller's spelling while the import path stores GitHub's. That was wrong, and tracing the callers before implementing is what caught it: `startTimerFromGitHub` already resolves the repository through GitHub and passes `repository.fullName` down, with a comment recording that lowercasing there was a previous bug. Both writers already store GitHub's casing, so neither is currently creating mixed-case pairs. Where the observed pair came from is therefore not established — most likely data written before that fix. This change does not guess: it removes the ways a duplicate can still be created and makes an existing pair behave predictably.

This change stops new duplicates from being created. It deliberately does not touch data that already exists.

## What Changes

- **The import checks for an existing related project first.** A GitHub project whose repository is already tracked by another GiTiempo project is refused: nothing is created, nothing is silently left unlinked, and the response names the project that already tracks it. The dropdown and preview mark such boards and disable the add action, the same way already-imported boards are treated today. **BREAKING**: a flow that previously succeeded now refuses; this reverses the earlier "reported, not blocked" rule at the author's direction.
- The repository mapping insert stops swallowing conflicts. When the mapping was taken concurrently, the created project is rolled back and the board is reported as refused instead of surviving as an unlinked project.
- Repository-to-project resolution gains a deterministic order, so an existing duplicate stops being a coin toss. Both writers already record the identifier GitHub reports, so nothing needs changing there.
- Creating or renaming a project refuses a name an active project in the same workspace already holds, compared case-insensitively. **BREAKING** for clients that relied on creating same-named projects.

### Out of scope

- **No data migration, and nothing already stored is deleted or rewritten.** Existing duplicate mappings and existing duplicate names stay as they are; this change only stops new ones.
- **No new database constraints.** A unique index on `lower(external_key)` — the shape `task_external_refs` has carried since migration `0015` — would be the durable guarantee, but it cannot be created while duplicate rows exist, and cleaning those rows is explicitly excluded. Enforcement therefore lives in the services. This is a known gap, not an oversight: two concurrent requests can still race past the check.

### Decisions to review

1. **The "reported, not blocked" rule is reversed.** The previous specification deliberately allowed adding a board whose repository belongs to another project. The author directed that an existing related project must prevent a new one, so this reverses that rule explicitly rather than working around it.
2. **Name uniqueness is scoped to the workspace and to active projects.** Global uniqueness would let one workspace reserve a name against every tenant; counting archived projects would reserve a name forever after a project is disabled, which contradicts soft-disable semantics.
3. **Name uniqueness does not fix the observed duplicate.** The two projects' names differ, so only the relation check prevents that case. The name rule is included as a product rule in its own right.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-management`: the import refuses a board whose repository is already tracked by another project, naming it; creating or renaming a project refuses a name an active project already holds.
- `add-project-page`: the dropdown and preview mark boards whose repository is already tracked and make them unaddable; a name conflict is reported on the name field rather than as a storage error.

`time-tracking-api` needs no delta. Its requirement already carries the scenario *Recorded repository uses the casing GitHub reports*, and the implementation already satisfies it.

`data-model` needs no delta either, now that no constraint is being added.

## Impact

- `apps/api/src/project-imports/services/project-imports.service.ts` — `importBoard` gains the relation check; the repository-mapping insert becomes a checked insert that rolls the project back and reports the refusal.
- `apps/api/src/tasks/services/github-task-materialization.service.ts` — order the repository lookup. Canonicalization already happens upstream in `startTimerFromGitHub`.
- `apps/api/src/projects/services/projects.service.ts` — name conflict on create and update.
- `packages/shared/src/contracts/projects.ts` — the import result gains a `repository-taken` status carrying the tracking project; a conflict shape for project names.
- `apps/admin-web` — `GitHubProjectFields.vue`, `github-project-import.ts`, `AddProjectView.vue`: the existing case-insensitive client-side hint becomes blocking, and the server refusal renders in place.
- **No migration.** No schema change, no index change, no data change.
- **Extension**: no contract change. `startTimerFromGitHub` already normalizes through GitHub, so any casing a client sends resolves the same way.
