## Why

A workspace ended up with two projects for one repository. The failure is a chain, and every link is real today:

1. **The page warns but proceeds.** When the chosen board's repository already belongs to another GiTiempo project, the Add Project form says so — and then, by its own specification, "the project can still be added". The user is invited to create the duplicate.
2. **The backend never asks the question.** `importBoard` checks whether the *board* was imported before, but never whether an existing project already tracks the *repository*. Its only defence is the unique index on the raw mapping key, consumed through `onConflictDoNothing` — a silent skip, not a refusal.
3. **Casing defeats that index.** GitHub identity is case-insensitive, the index is not. The import path stores the identifier GitHub reports while the timer path stores whatever the caller sent, so `ITSUA-team/Kesher` and `itsua-team/kesher` coexist as two mappings for one repository.
4. **Resolution is then a coin toss.** The repository-to-project lookup matches case-insensitively and takes the first row with no ordering, so once two mappings exist it is undefined which project receives new time.

The fix has to close the chain at every link, not only forbid a symptom: check the relation before creating, record one canonical identifier, let the database refuse what the check missed, and resolve deterministically.

## What Changes

- **The import checks for an existing related project first.** A GitHub project whose repository is already tracked by another GiTiempo project is refused: nothing is created, nothing is silently left unlinked, and the response names the project that already tracks the repository. The dropdown and preview mark such boards and disable the add action, the same way already-imported boards are treated today. **BREAKING**: a flow that previously succeeded (creating an unlinked board project) now refuses; this deliberately reverses the earlier "reported, not blocked" rule at the author's direction.
- Every path that creates a repository mapping records the identifier GitHub reports, instead of the caller's spelling. The timer-from-issue path is the one currently violating this.
- Provider-mapping uniqueness becomes case-insensitive for GitHub keys, so the database refuses a second mapping for a repository that already has one. This is what the data model already claims under *Provider lookup remains unique within workspace*; today the guarantee holds only for byte-identical strings.
- Existing duplicate mappings are merged by migration before the new index can be created. Where two projects hold the same repository, one keeps the mapping; nothing is deleted and no time entries move. Undecidable pairs are reported and stop the deploy rather than being resolved silently.
- Repository-to-project resolution gains a deterministic order.
- A second active project whose name matches an existing active project in the same workspace is refused, compared case-insensitively, with a database constraint behind the service check. **BREAKING** for clients that relied on creating same-named projects.

### Decisions taken and decisions to review

1. **The "reported, not blocked" rule is reversed — decision taken.** The previous specification deliberately allowed adding a board whose repository belongs to another project. The author has directed twice that an existing related project must prevent a new one, so this proposal reverses that rule explicitly rather than working around it.
2. **Name uniqueness is scoped to the workspace and to active projects — for review.** Global uniqueness would let one workspace reserve a name against every tenant; counting archived projects would reserve a name forever after a project is disabled, which contradicts soft-disable semantics.
3. **Name uniqueness does not fix the observed duplicate — stated so nobody relies on it.** The two projects' names differ, so only the relation check and the mapping constraint prevent that case. The name rule is included as a product rule in its own right.

## Capabilities

### New Capabilities

None. This corrects and tightens behavior existing capabilities already describe.

### Modified Capabilities

- `project-management`: the import refuses a board whose repository is already tracked by another project, naming it; creating or renaming a project refuses a name an active project already holds.
- `add-project-page`: the dropdown and preview mark boards whose repository is already tracked and make them unaddable; a name conflict is reported on the name field rather than as a storage error.
- `data-model`: provider-mapping uniqueness becomes case-insensitive for GitHub keys; active project names become unique per workspace.

`time-tracking-api` needs no delta. Its requirement already carries the scenario *Recorded repository uses the casing GitHub reports*, including that either casing reuses the same project. The specification is right; the implementation fails it, so that part of this change is a bug fix against an existing requirement.

## Impact

- `apps/api/src/project-imports/services/project-imports.service.ts` — `importBoard` gains the relation check; the repository-mapping insert stops swallowing conflicts and instead rolls the created project back and reports the refusal.
- `apps/api/src/tasks/services/github-task-materialization.service.ts` — canonicalize before writing the mapping; order the lookup.
- `apps/api/src/projects/schemas/project-external-refs.schema.ts` and `projects.schema.ts` — index changes.
- `apps/api/src/projects/services/projects.service.ts` — name conflict on create and update.
- `packages/shared/src/contracts/projects.ts` — the import result gains a refusal status naming the tracking project; a conflict shape for project names.
- `apps/admin-web` — `GitHubProjectFields.vue`, `github-project-import.ts`, `AddProjectView.vue`: the existing case-insensitive client-side hint becomes blocking, and the server refusal renders in place.
- **Migration**: merge duplicate GitHub mappings, rewrite survivors to GitHub's casing, then create both partial unique indexes. Duplicate active names are reported and stop the deploy; they are never auto-renamed.
- **Extension**: no contract change; normalization is server-side, so installed extensions keep working.
