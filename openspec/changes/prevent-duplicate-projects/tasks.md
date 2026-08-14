## 1. Establish the current damage

- [ ] 1.1 Write a read-only query that lists, per workspace, project mappings whose keys differ only by letter case, with the projects they point at and whether each holds tasks or time entries
- [ ] 1.2 Write a read-only query that lists duplicate active project names per workspace, compared case-insensitively
- [ ] 1.3 Run both against a production dump and record the counts, since 1.2 decides whether the deploy can complete at all

## 2. Refuse the import when the repository is already tracked

- [ ] 2.1 Extend the shared import-result contract with a refusal status that carries the tracking project's id, name, and whether it is archived
- [ ] 2.2 Check the relation in `importBoard` before writing, matching the repository the way the timer lookup already does, case-insensitively
- [ ] 2.3 Replace the swallowed `onConflictDoNothing` on the repository mapping with a checked insert that rolls the created project back and reports the refusal when the mapping was taken concurrently
- [ ] 2.4 Keep one refused board from aborting the rest of the request, matching the existing per-board reporting
- [ ] 2.5 Add service tests for the refusal, the differing-casing case, the archived tracking project, and the concurrent-taken case

## 3. Make the page prevent what the server refuses

- [ ] 3.1 Turn the existing "already tracked by another project" state in `github-project-import.ts` into a blocking one that names the tracking project
- [ ] 3.2 Disable the add action for such boards in `GitHubProjectFields.vue` the way already-added boards are disabled, and mark them in the dropdown
- [ ] 3.3 Render the server refusal in place on `AddProjectView.vue`, naming the tracking project, for a selection that went stale
- [ ] 3.4 Add component tests for the blocked selection, the dropdown marking, and the stale-selection refusal

## 4. Record the identifier GitHub reports

- [ ] 4.1 Make `findOrCreateProjectForRepo` resolve the repository through GitHub and store the reported full name instead of the caller's string
- [ ] 4.2 Keep the existing lookup ahead of that call so an existing project still short-circuits without a GitHub request
- [ ] 4.3 Fail the timer start when verification fails, rather than falling back to the caller's spelling
- [ ] 4.4 Give `findGitHubProjectRef` a deterministic order so a pre-migration duplicate cannot resolve differently between requests
- [ ] 4.5 Add service tests proving a repository supplied in any casing reuses one project and records GitHub's casing

## 5. Resolve the mappings that already exist

- [ ] 5.1 Read `0015_dedup_github_issue_casing.sql` and follow its structure, ranking rows by GitHub's real casing first, then the older project, then id
- [ ] 5.2 Write a hand-written migration that keeps one project mapping per case-insensitive key and deletes the other mapping rows, deleting no project and moving no task, assignment, or time entry
- [ ] 5.3 Report the projects left unlinked, so a workspace holding two similar projects is on the record rather than discovered later
- [ ] 5.4 Test the migration against a fixture holding two projects mapped to one repository under two casings, asserting both projects survive and exactly one mapping remains

## 6. Enforce mapping uniqueness in the database

- [ ] 6.1 Rebuild `project_external_refs_workspace_provider_key_unique` over `(workspace_id, provider, external_type, lower(external_key))`, matching the shape `task_external_refs` already uses
- [ ] 6.2 Mirror the change in `project-external-refs.schema.ts`, carrying the same explanatory comment the task schema has
- [ ] 6.3 Confirm the index creation fails loudly if step 5 left duplicates, rather than being skipped
- [ ] 6.4 Add a test proving a second mapping for the same repository in different casing is refused

## 7. Enforce project-name uniqueness

- [ ] 7.1 Write a migration step that reports duplicate active project names per workspace and stops the deploy if any exist
- [ ] 7.2 Add the partial unique index on `(workspace_id, lower(name)) WHERE is_active`
- [ ] 7.3 Check the conflict in the project create path and return a typed conflict naming the collision
- [ ] 7.4 Check the same on project update, allowing a project to keep or recase its own name
- [ ] 7.5 Confirm disabling a project releases its name for reuse
- [ ] 7.6 Add API tests for create, rename, self-rename, recase, and the disabled-project case

## 8. Surface the name conflict to users

- [ ] 8.1 Add the conflict shape to the shared project contracts so both web apps read one definition
- [ ] 8.2 Report the conflict against the Project name field on the Add Project form, keeping entered values intact
- [ ] 8.3 Report a colliding derived name for a GitHub import as a name conflict rather than an unimportable project
- [ ] 8.4 Report the conflict on the project edit form
- [ ] 8.5 Add component tests covering the conflict message on create, on import, and on rename

## 9. Verification

- [ ] 9.1 Run lint, typecheck and tests for `@gitiempo/api`, `@gitiempo/shared`, `user-web`, and `admin-web`
- [ ] 9.2 Confirm the extension needs no release, since normalization is server-side
- [ ] 9.3 Start a timer from an issue supplying lowercase, then uppercase, and confirm one project receives both
- [ ] 9.4 Select a board whose repository is tracked by an existing project and confirm the dropdown blocks it naming that project, in either casing
- [ ] 9.5 Submit that import anyway through the API and confirm it is refused with nothing written
- [ ] 9.6 Attempt to create a project whose name matches an active one in any casing and confirm the form explains it
- [ ] 9.7 Disable a project, reuse its name, and confirm both records read correctly afterwards
- [ ] 9.8 Rehearse the full migration against a restored production dump and record how long it holds locks
- [ ] 9.9 After the rehearsal, confirm every project the migration unlinked still holds its tasks, time entries, and assignments, and appears in the report
