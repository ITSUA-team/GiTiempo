## 1. Refuse the import when the repository is already tracked

- [x] 1.1 Extend the shared import-result contract with a refusal status that carries the tracking project's id, name, and whether it is archived
- [x] 1.2 Check the relation in `importBoard` before writing, matching the repository the way the timer lookup already does, case-insensitively
- [x] 1.3 Replace the swallowed `onConflictDoNothing` on the repository mapping with a checked insert that rolls the created project back and reports the refusal when the mapping was taken concurrently
- [x] 1.4 Keep one refused board from aborting the rest of the request, matching the existing per-board reporting
- [x] 1.5 Add service tests for the refusal, the differing-casing case, the archived tracking project, and the concurrent-taken case

## 2. Make the page prevent what the server refuses

- [x] 2.1 Turn the existing "already tracked by another project" state in `github-project-import.ts` into a blocking one that names the tracking project
- [x] 2.2 Disable the add action for such boards in `GitHubProjectFields.vue` the way already-added boards are disabled, and mark them in the dropdown
- [x] 2.3 Render the server refusal in place on `AddProjectView.vue`, naming the tracking project, for a selection that went stale
- [x] 2.4 Add component tests for the blocked selection, the dropdown marking, and the stale-selection refusal

## 3. Resolve one repository to one project, predictably

- [x] 3.1 Confirm both callers of `findOrCreateProjectForRepo` already pass the name GitHub reports, so no canonicalization is added here
- [x] 3.2 Give `findGitHubProjectRef` a deterministic order so an existing duplicate cannot resolve differently between requests
- [x] 3.3 Add a service test pinning that order, so the guarantee is not lost to a later refactor

## 4. Refuse duplicate project names

- [x] 4.1 Check the conflict in the project create path and return a typed conflict naming the collision, compared case-insensitively among active projects
- [x] 4.2 Check the same on project update, allowing a project to keep or recase its own name
- [x] 4.3 Confirm disabling a project releases its name for reuse
- [x] 4.4 Add API tests for create, rename, self-rename, recase, and the disabled-project case

## 5. Surface the conflicts to users

- [x] 5.1 Add the conflict shape to the shared project contracts so both web apps read one definition
- [x] 5.2 Report the name conflict against the Project name field on the Add Project form, keeping entered values intact
- [x] 5.3 Report a colliding derived name for a GitHub import as a name conflict rather than an unimportable project
- [x] 5.4 Report the conflict on the project edit form
- [x] 5.5 Add component tests covering the conflict message on create, on import, and on rename

## 6. Verification

- [x] 6.1 Run lint, typecheck and tests for `@gitiempo/api`, `@gitiempo/shared`, `user-web`, and `admin-web`
- [x] 6.2 Confirm the extension needs no release, since normalization is server-side
- [ ] 6.3 Start a timer from an issue supplying lowercase, then uppercase, and confirm one project receives both
- [ ] 6.4 Select a board whose repository is tracked by an existing project and confirm the dropdown blocks it naming that project, in either casing
- [ ] 6.5 Submit that import anyway through the API and confirm it is refused with nothing written
- [ ] 6.6 Attempt to create a project whose name matches an active one in any casing and confirm the form explains it
- [ ] 6.7 Disable a project, reuse its name, and confirm both records read correctly afterwards
