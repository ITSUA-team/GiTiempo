## Context

The picker is a project-then-task cascade. `useTopBarTimerDialogFlow.openDialog()` loads projects once from `GET /projects`; a watcher on `selectedProjectId` loads that project's tasks; and when the project's `source` is `github`, unsynced issues are appended as synthetic options carrying a fake id (`__top-bar-timer-github-issue__{repo}#{number}`) and `isGitHubIssueOption: true`. Selecting one materialises a real task through `POST /tasks/from-github` before any timer action, so the timer endpoints only ever see real ids.

That precedent is the model for board targets, but it is not free to copy. The issue options hang off a *selected real project*, which supplies `projectId`, `workspaceId` and `defaultBillableForTasks`. A GitHub Project board has none of those. Eight places in the picker read the selected project as a real record — `selectedProject` resolution, `getSelectedTaskContext`, the task cache key, the `timerKeys.projectTasks` query key, the `GET /projects/:id/tasks` path segment, the `GET /projects/:id/github/issues` path segment, inline task creation, and the running-timer reassignment path that forwards `taskId` to `updateEntry`.

Three server facts shape the rest:

- `GET /github/owners` is unpaginated and already returns only the personal login plus workspace-allowlisted organizations. It is the org policy, expressed as a list.
- `GET /github/projects` is strictly owner-scoped: `ownerType` is required, and `owner` is required exactly when `ownerType=organization`. It is paginated. `GET /github/projects/:projectId/issues` returns board items plus a `skipped` breakdown counting pull requests, draft issues, redacted and unknown items.
- `POST /time-entries/timer/start-from-github` does the whole job — find-or-create the project, self-assign a non-admin member, materialise the task, start the timer — in one transaction. It authenticates with `requireActiveMembership` alone and performs no GitHub call, because `TimeEntriesService` has no `GithubService`.

## Goals / Non-Goals

**Goals:**

- Let a member start a timer on an issue from an organization GitHub Project board without an admin preparing anything.
- Add no new endpoint, and no second implementation of anything the server already does.
- Leave the timer's existing behaviour for real projects byte-for-byte unchanged.

**Non-Goals:**

- Personal-account boards. The request said organizations, and organizations are also where the workspace policy has an opinion.
- Repository browsing as its own axis, closed issues, draft board items, and any change to the extension.
- Replacing the admin-web linking flow. That change answers "this project tracks that repository"; this one answers "track this board issue, whatever project that needs".

## Decisions

### D1: GitHub Project boards are offered per organization, sourced from the policy list

Owners come from `GET /github/owners`, filtered to `type === 'organization'`. Boards come from `GET /github/projects?ownerType=organization&owner=<login>`, keeping only `state: open`.

- *Rationale*: `listAvailableOrganizations` already returns only the organizations the workspace allows, so the dropdown physically cannot offer a forbidden owner. The org policy stops being a check the client has to remember and becomes the shape of the data it was given.
- *Consequence*: a workspace with no approved organization sees no board options at all, which is correct and must be explained in place rather than rendered as an empty list.
- *Alternative rejected*: listing repositories instead of boards. It was the first reading of the request and it is the wrong axis: the team plans on boards, and a board is where the issues actually worth tracking have been gathered.

### D2: Board options are a separate option kind, never a project

A `GitHubProjectOption` discriminated by `isGitHubProjectOption: true`, rendered in its own labelled group under the real projects, and held in its own picker field rather than being pushed into `picker.projects`.

- *Rationale*: this is the design's main hazard. Putting a synthetic row into `picker.projects` would make eight call sites reachable with an id that is not a project, guarded only by hand-written checks that the next contributor has no reason to preserve. Keeping board options out of that array makes the failure structurally impossible instead of defended.
- *Consequence*: `selectedProject` stays exactly what it is today. Selecting a board sets `selectedGitHubProject` and clears `selectedProjectId`, and the confirm path branches on which one is set.
- *Guards that still need writing*: inline "create task" is hidden while a board is selected, because there is no GiTiempo project to create it in; the running-timer reassignment path refuses a board selection, because `updateEntry` takes a real task id; and reopening the dialog must not feed a board back through `getDialogSelectionFromCurrentState`, which reads the running timer's real project.

### D3: A board's issues come from the project-items endpoint, and carry their own repository

`GET /github/projects/:projectId/issues` with `state: open`. Each item exposes `issue.repository.fullName`, `issue.number` and `issue.title` — exactly the three fields the start endpoint needs.

- *Rationale*: `GET /projects/:projectId/github/issues` needs a GiTiempo project that does not exist yet. The board endpoint answers from GitHub's side and applies the same organization assertion.
- *Draft items*: the response reports `skipped.draftIssues`. A draft has no repository, so it cannot become a task. The count is surfaced rather than hidden, because a board of mostly drafts otherwise looks broken.
- *Consequence*: the issue options for a board carry no `defaultBillableForTasks`, because that is a GiTiempo project field. The value the created project gets is the column default, exactly as it is for extension-created projects today.

### D4: Starting goes through the existing endpoint, unchanged in shape

`POST /time-entries/timer/start-from-github` with `{ githubRepo, issueNumber, issueTitle }`.

- *Rationale*: it already creates the project, assigns the member, materialises the task and starts the timer in one transaction. Re-implementing any part of that in the client would be a second source of truth for the trickiest sequence in the feature.
- *Consequence*: user-web becomes the endpoint's second caller, which is why its requirement is renamed away from naming the extension.

### D5: The endpoint verifies the repository and the organization before creating anything

`TimeEntriesService` gains `GithubService` and calls `getRepository(user, owner, repo)` — which resolves the connection, asserts the organization policy, and 404s an unreadable repository — before `findOrCreateProjectForRepo`.

- *Rationale, stated plainly*: this is a pre-existing hole, not one this change introduces. Any active member can already `curl` the endpoint with an arbitrary `owner/repo` and create a workspace project for a repository that does not exist, in an organization the policy forbids. It is closed here because this change puts a button on that endpoint and would multiply the traffic reaching it.
- *Consequence*: the repository name stored is the one GitHub reports, so canonical casing arrives from the source rather than from the caller. That strictly improves the casing behaviour the existing requirement protects.
- *Cost*: one GitHub API call on the start path. It is on a user-initiated action that already performs several writes, and it is the call that makes the write authorized.

### D6: Boards are not deduplicated against GiTiempo projects

Boards and GiTiempo projects are different axes, so there is nothing to deduplicate.

- *Rationale*: a board is a view over issues that may span several repositories, and one repository's issues may appear on several boards. A GiTiempo project maps to exactly one repository. Hiding a board because "its repository already has a project" would hide the board's other repositories with it.
- *Consequence*: the picker shows both groups in full. Selecting a board issue whose repository already has a GiTiempo project reuses that project on the server, which is correct and invisible to the member. D8 later extends that reuse to the project a board itself was imported as.
- *Corrected from the first draft of this design*, which specified dedup by comparing a repository name against project names. That was written when this change was still about repositories, and it was a heuristic that would have been wrong for any renamed project.

### D7: Source is a field of the Add Project form, not a mode around it

The Add Project page keeps one `<Form>`. Source is its first field; the GitHub branch swaps the typed name for an organization plus a project autocomplete and a derived read-only name, and Project manager, Visibility and Default billable are the same fields for both branches.

- *Rationale*: the two source tiles were a mode switch pretending to be content. They forced the GitHub branch to replace the whole form, which is why an imported project could not be given the settings a manual one gets. Making Source a field is what lets the three settings be shared rather than duplicated.
- *Project manager costs nothing on the server*: `/projects/new` is admin-only and `createAssignment` requires admin, so the form imports and then assigns, exactly as the manual path already does.
- *Visibility and billable do cost something*: `importBoard` inserted only `{workspaceId, name, color}`, so imported projects silently took the column defaults. They are added to the import request per project rather than per request, because the schema already accepts up to 25 and a future multi-select import should be able to differ between them.
- *The form must not keep a value it stops showing*: `@primevue/forms` never unregisters a field on unmount, so the `v-if` around the name input leaves the typed value in form state while the remounted input renders empty. Left alone, switching source and back creates a project under a name the user cannot see. The name is cleared whenever Source changes, and the regression test mounts the real Form rather than a stub, because a stub is exactly what hid it.

### D8: An issue joins an existing project before one is created, repository first

Resolution order when a timer starts from a GitHub issue: the project tracking the repository, then the project imported for the board the caller named, then create one named after the repository.

- *Rationale*: importing a board and then tracking its issues otherwise produced two projects for the same work — the board the admin deliberately added, and a second one the timer created for the repository. The repository stays first because that key is what the Chrome extension already uses; putting the board first would strand an existing repository's history in one project while new entries went to another.
- *Consequence for a multi-repository board*: it does not collect the time of repositories that already have projects. That follows from repository-first and is the price of not splitting existing histories.
- *The guard this needs*: `task_external_refs` is unique per workspace, not per project, and the conflict recovery in `findOrCreateTaskForIssue` refuses when the winning reference belongs to a different project. Without care, tracking an issue through a board and then gaining a repository project would make that one issue permanently unstartable.
- *How the guard stays narrow*: continuity applies only when the issue is already tracked in the very board the caller named. Two projects disagreeing about one issue for any other reason still refuses — that refusal is an existing behaviour with an existing test, and an earlier attempt at this ordering removed it by accident.
- *Contract*: the board id travels as an optional field on the existing start request, so the required list is unchanged and the extension is untouched.

## Risks / Trade-offs

- **A member creates workspace projects from the timer** → accepted, and now bounded by D5: a real repository, reached through a board in an approved organization. The alternative reinstates the admin dependency this change exists to remove. Whoever disagrees should change it at the endpoint, where both callers are covered, not in one client.
- **A synthetic row reaching a real-project code path** → D2 keeps board options out of `picker.projects` entirely, so the eight call sites cannot see one. The three remaining guards are enumerated in D2 and each needs a test, because they are the kind of thing a refactor silently removes.
- **Large organizations** → `GET /github/projects` is paginated and the picker must cap what it loads and say so, rather than appearing to show everything. The existing issue loader's cap of 30 options over 5 pages is the precedent to match.
- **No connected GitHub account, or no approved organization** → two different empty states that must not be collapsed into one, and neither is a request failure. `GET /github/owners` answers not-found for a missing connection, which is easy to render as a broken list if it is not handled deliberately.
- **A board of only draft items** → it appears, opens, and lists nothing trackable. `skipped.draftIssues` is what turns that from a broken-looking list into an explanation. The organization in the request already has such a board: `Test project without repository`.
- **The extension gains a verification it did not have** → it always operates on a repository the member is looking at in GitHub, so the added call should always pass. If it does not, the extension's failure copy must not read as a sign-in problem.

## Migration Plan

No migration, no schema change, no contract change. The server change is additive verification on an existing route; the client change is additive options in an existing dialog.

Deploy the API first. A client that offers repositories against an API without D5 still works — it is only less strictly authorized — but shipping the verification first means the button never exists without it. Rollback is removing the repository options; the endpoint keeps serving the extension exactly as before.

## Open Questions

- Should a board be offered when the workspace approves its organization but the member's own token cannot see the board? Board visibility is per token, so two members can be offered different rows in one workspace. Left as-is because it mirrors what the extension already does.
- Should the GiTiempo project created this way be public rather than private? It is private today, so a second member starting a timer on another issue from the same repository gets `requireVisibleProject` and a not-found instead of the existing project. That is a real edge, and it is the strongest argument for revisiting the visibility default — but it predates this change and is not fixed here. D7 makes it answerable for a deliberately imported board, where an admin now chooses the visibility; it stays unanswered for a project the timer creates on its own.
- A board imported as a private project now refuses a member who is not assigned to it, instead of creating them their own project and assigning them. That already held for repository-backed projects and now holds for boards too. It is the same question as above seen from the other side, and it is the reason the visibility choice on the import form matters more than it looks.
- `project_external_refs` is still unique on the raw `external_key` while lookups go through `lower(...)`; `task_external_refs` was migrated to `lower(external_key)` in `0015`. Two spellings of one repository can therefore still produce two projects. Importing in bulk makes it reachable more often, but the fix is a migration and belongs to its own change.
