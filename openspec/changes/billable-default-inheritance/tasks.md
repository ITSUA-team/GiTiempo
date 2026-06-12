## 1. Shared Contracts And Data Model

- [ ] 1.1 Add project and task default billable fields to shared project/task response schemas and contract tests
- [ ] 1.2 Add project create/update and task create/update default billable request validation to shared contracts
- [ ] 1.3 Add project and task billable-default backfill request/response schemas and tests
- [ ] 1.4 Add Drizzle schema columns for project and task default billable values
- [ ] 1.5 Add a migration that backfills existing projects and tasks to billable defaults of `true`

## 2. Backend API Behavior

- [ ] 2.1 Include project default billable values in project list/detail responses and create/update persistence
- [ ] 2.2 Include task default billable values in task list/detail responses and create/update persistence
- [ ] 2.3 Make task creation inherit the selected project's default when no task default override is supplied
- [ ] 2.4 Make manual time-entry creation inherit the selected task default when no entry override is supplied
- [ ] 2.5 Make timer and extension-created running entries inherit the selected task default
- [ ] 2.6 Make lazily created extension tasks inherit their parent project default
- [ ] 2.7 Add project billable-default backfill endpoint with selected task and time-entry update counts
- [ ] 2.8 Add task billable-default backfill endpoint with selected time-entry update count
- [ ] 2.9 Cover inheritance, future-default-only saves, backfills, and authorization with API unit and e2e tests

## 3. Admin Frontend

- [ ] 3.1 Update admin project API clients and types for default billable fields and project backfill calls
- [ ] 3.2 Add `Default billable for new tasks` to the Add Project form and submit payload
- [ ] 3.3 Add `New task billable default` to the Projects settings row and save it as a future default
- [ ] 3.4 Detect downstream project records after a changed default save and show the approved follow-up dialog only when needed
- [ ] 3.5 Wire project follow-up dialog dismissal and selected backfill submission with count-based toast feedback
- [ ] 3.6 Add admin frontend tests for project default initialization, save, prompt, dismissal, and backfill submission

## 4. User Frontend

- [ ] 4.1 Update user project, task, timer, and time-entry clients/types for default billable fields and task backfill calls
- [ ] 4.2 Initialize task create defaults from the selected project and submit selected task defaults
- [ ] 4.3 Initialize task edit defaults from the selected task and save changed future defaults
- [ ] 4.4 Detect existing time entries after a changed task default save and show the approved task follow-up dialog only when needed
- [ ] 4.5 Wire task follow-up dialog dismissal and selected backfill submission with count-based toast feedback
- [ ] 4.6 Initialize manual time-entry create billable state from the selected task default while preserving edit-mode entry values
- [ ] 4.7 Keep timer task creation and timer start flows aligned with backend inheritance without adding a timer billable override
- [ ] 4.8 Add user frontend tests for task defaults, time-entry defaults, timer inheritance, prompts, dismissal, and backfill submission

## 5. Verification And Documentation

- [ ] 5.1 Regenerate OpenAPI/shared artifacts using the repository-supported workflow after DTO changes
- [ ] 5.2 Run focused shared contract and API verification commands
- [ ] 5.3 Run focused admin-web lint, typecheck, and relevant tests
- [ ] 5.4 Run focused user-web lint, typecheck, and relevant tests
- [ ] 5.5 Reconcile implementation against `GITiempo.pen` and `docs/ui/pages-admin.md`, `docs/ui/pages-user.md`, and `docs/ui/patterns.md`
