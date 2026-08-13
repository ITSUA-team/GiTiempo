## 1. Authorize the start-from-github endpoint

Ship this first: the client work puts a button on this endpoint, and the verification should exist before the button does.

- [x] 1.1 Inject `GithubService` into `TimeEntriesService` and confirm no module cycle results, since `TimeEntriesModule` already imports `TasksModule` which imports `GithubModule`
- [x] 1.2 In `startTimerFromGitHub`, call `github.getRepository(user, owner, repo)` before opening the creating transaction, so the connection, the organization policy, and the repository's existence are all settled before any write
- [x] 1.3 Use the `fullName` GitHub returns as the repository key passed to `findOrCreateProjectForRepo`, rather than the caller's string
- [x] 1.4 Add service specs for each refusal: no connected account, owner outside the organization policy, unknown repository — each asserting that no project, task, provider reference, or time entry is written
- [x] 1.5 Add a spec proving the recorded reference uses GitHub's casing when the caller supplies a different one, and that a later request with either casing reuses the same project
- [x] 1.6 Confirm the existing extension e2e path still passes end to end, since the extension is now subject to the same verification
- [x] 1.7 Regenerate the OpenAPI document and confirm the new refusal responses appear on the route

## 2. Owners and GitHub Projects client in user-web

- [x] 2.1 Add `listGitHubOwners`, `listGitHubProjects` and `listGitHubProjectIssues` to the user-web client against `GET /github/owners`, `GET /github/projects` and `GET /github/projects/:projectId/issues`
- [x] 2.2 Add query keys for boards and board issues beside the existing timer keys, scoped the same way as `timerKeys.visibleProjects`
- [x] 2.3 Load only organizations from the owners response, discarding the personal owner, and treat a not-found response as "no connected account" rather than as a failure
- [x] 2.4 Page boards and board issues under bounded caps, keep only open boards, skip archived items, and report when a list was truncated
- [x] 2.5 Surface `skipped.draftIssues` so a board of drafts explains itself instead of looking empty
- [x] 2.6 Add lib specs for owner filtering, closed-board exclusion, the caps, the truncation flag, draft reporting, and the distinction between an unconnected account, an approved-organization-free workspace, and a request failure

## 3. Board targets in the picker

- [x] 3.1 Add a `GitHubProjectOption` type discriminated by `isGitHubProjectOption`, kept in its own picker field and deliberately never pushed into `picker.projects`
- [x] 3.2 Render boards as a separate labelled group beneath the GiTiempo projects, visually distinguishable from a project row
- [x] 3.3 Selecting a board clears the selected project and its tasks; selecting a project clears the selected board and its issues
- [x] 3.4 Load a selected board's open issues through the client, reusing the request-sequencing guard that already prevents a stale task response from overwriting a newer one
- [x] 3.5 Render the board states separately: loading, no trackable issues with a draft count, no connected account, no approved organization, request failure
- [x] 3.6 Add composable specs for each of the above, including that selecting a GiTiempo project still behaves exactly as before when board targets are present

## 4. Guards that keep a board out of project-only paths

Each of these is a path that assumes a real project id. They are listed separately because a refactor removes this kind of guard silently.

- [x] 4.1 Hide the inline new-task action while a board is selected, and explain that a task appears once a timer has been started from it
- [x] 4.2 Refuse to reassign a running timer to a board issue without materialising a task first
- [x] 4.3 Ensure reopening the dialog restores the running timer's real project, never the board that started it
- [x] 4.4 Confirm no board id can reach `GET /projects/:id/tasks`, `GET /projects/:id/github/issues`, the task cache key, or the `timerKeys.projectTasks` query key
- [x] 4.5 Add a spec per guard, each asserting the absence of the request rather than only the absence of a crash

## 5. Starting the timer

- [x] 5.1 Start a board issue timer through the existing `POST /time-entries/timer/start-from-github`, using the issue's own `repository.fullName`, `number` and `title`
- [x] 5.2 On success, refresh the visible project list so the newly created project appears
- [x] 5.3 Map the refusals to specific copy: organization not approved, repository not found, no connected account, inactive project
- [x] 5.4 Add specs for the success path, the project-list refresh, an issue whose repository already has a project, and each refusal message

## 5b. Show each board's repositories and what is already tracked

- [x] 5b.1 Derive each board's repositories from the first page of its issues, since the board list response carries no repository field
- [x] 5b.2 Cap the probe to a bounded number of boards and flag a board whose first page did not exhaust its issues
- [x] 5b.3 Keep one failing board from breaking the rest of the list
- [x] 5b.4 Render each board row with its repository chips, marking the ones a GiTiempo project already tracks
- [x] 5b.5 Show "No linked repository" for a board whose items are all drafts
- [x] 5b.6 Add specs for derivation, the truncation flag, per-board failure isolation, and case-insensitive tracked matching

## 6. Documentation

- [x] 6.1 Record in the user-web UI docs that the timer picker offers organization GitHub Project boards, and that starting from a board issue creates the project for that issue's repository
- [x] 6.2 Record that starting a timer from a GitHub issue now verifies the repository and the organization policy, and that this applies to the extension as well
- [x] 6.3 State plainly that a member can create a workspace project this way, and that the boundary is the workspace organization policy

## 8. Add Project becomes one form

- [x] 8.1 Make Source the first field of the existing Add Project form and drop the two source tiles that switched mode from the sidebar
- [x] 8.2 Swap the typed name for an organization field plus a GitHub project autocomplete in the import branch, and derive a read-only project name from them
- [x] 8.3 Share Project manager, Visibility and Default billable across both branches, with one submit that creates or imports and then assigns the manager
- [x] 8.4 Move the derived copy — name, linked repository, issues scanned, status, outcome sentence — into a pure module and cover its branches without mounting anything
- [x] 8.5 Reduce the import panel to a fieldset that reports a selection, so it no longer imports anything itself
- [x] 8.6 Clear the name field whenever Source changes, since the form library keeps a value for an input that has unmounted
- [x] 8.7 Add a regression spec that mounts the real form components rather than stubs, and confirm it fails without 8.6

## 9. The import request carries the project settings

- [x] 9.1 Add optional visibility and default-billable to the import request, per project rather than per request
- [x] 9.2 Pass them into the insert only when supplied, so an omitted value still takes the column default
- [x] 9.3 Report an organization outside the policy as a refused organization rather than a repository that could not be found
- [x] 9.4 Rethrow anything that is not the policy refusal, so an unrelated failure cannot be reported as one
- [x] 9.5 Add contract specs for both settings and for a visibility the table cannot store
- [x] 9.6 Add the first server-side coverage of the import routes: settings stored, defaults kept, unstorable visibility refused, one refused organization not aborting the batch, a second import not modifying the existing project
- [x] 9.7 Regenerate the OpenAPI document and confirm the required list is unchanged

## 10. A timer joins an existing project before creating one

- [x] 10.1 Carry the board id on the existing GitHub start request as an optional field, and send it from the picker's board issue context
- [x] 10.2 Resolve the project as repository first, then the project imported for the named board, then create
- [x] 10.3 Keep an issue in the project that already holds it when that project is the named board's, so gaining a repository project later cannot make the issue unstartable
- [x] 10.4 Leave the existing refusal intact for two projects disagreeing about one issue for any other reason
- [x] 10.5 Stop listing the inline new-task option while a board is selected, in both places that build the task options
- [x] 10.6 Clear a task selected under the previous project when a board is chosen
- [x] 10.7 Explain a board with no issues instead of inviting a task that cannot be created
- [x] 10.8 Add e2e coverage for each resolution branch, and specs proving the new-task option is absent and the selection is cleared

## 7. Verification

- [ ] 7.1 As a member, open the timer picker and confirm approved organization boards appear grouped separately from projects
- [ ] 7.2 Select a board, confirm its open issues list, start a timer, and confirm a project and task were created and the timer runs
- [ ] 7.3 Reopen the picker and confirm the new project appears, and that the board is still offered because it may hold other repositories
- [ ] 7.4 Confirm a workspace with no approved organization and a member with no connected account each show their own explanation rather than an empty or failed list
- [ ] 7.5 Confirm the Chrome extension still starts timers from a GitHub issue unchanged
- [ ] 7.6 Attempt the start request directly for a repository outside the organization policy and confirm it is refused with nothing written
- [ ] 7.7 Open the board that holds only draft items and confirm the draft count is explained rather than shown as an empty or failed list
- [ ] 7.8 On `/projects/new`, import a GitHub project with a chosen manager, visibility and billable default, and confirm all three landed on the created project
- [ ] 7.9 Type a project name, switch Source to GitHub and back, and confirm the name is empty rather than silently retained
- [ ] 7.10 Start a timer from an issue of an imported board whose repository has no project, and confirm the time lands in the board's project rather than a new one
- [ ] 7.11 Create a project for that repository, start the same issue again, and confirm it still runs against the project that already holds it
- [ ] 7.12 Select a board in the timer picker and confirm New task is not offered at all
