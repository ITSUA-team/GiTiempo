## Why

A member who wants to track time on a GitHub issue from the web app cannot, unless somebody has already turned that repository into a project. The Chrome extension can do it — `POST /time-entries/timer/start-from-github` creates the project, assigns the member, materialises the task and starts the timer in one transaction — but only the extension calls it. In user-web the timer's project dropdown lists `GET /projects` and nothing else, so the member's only route is to ask an admin.

Everything the web app needs already exists on the server. `GET /github/owners` returns the personal login plus the organizations the workspace allows, `GET /github/repos` lists an owner's repositories, `GET /github/repos/:owner/:repo/issues` lists a repository's issues, and the start endpoint does the rest. Only the client is missing.

## What Changes

- The Start timer dialog offers the organization's **GitHub Projects** (the V2 boards at `github.com/orgs/<org>/projects`) alongside real GiTiempo projects. They come from the organizations `GET /github/owners` already returns, which are exactly the ones the workspace GitHub policy allows.
- Selecting a GitHub Project lists **that board's open issues** in the task field. Every board item that is a real issue carries its own repository, which is what makes it trackable; draft items carry none and are reported as skipped rather than silently dropped.
- Starting the timer against a board issue goes through the existing `POST /time-entries/timer/start-from-github`, using the issue's own repository. The GiTiempo project and task are created by that call; no new endpoint, no client-side project creation.
- A board is a *view*, not a container: two boards can hold issues from the same repository, and one board can span several repositories. So boards are never deduplicated against GiTiempo projects — they are a different axis, listed in their own group.
- **Close an authorization gap this change would otherwise widen.** `startTimerFromGitHub` today authenticates with `requireActiveMembership` and nothing else: `TimeEntriesService` does not inject `GithubService`, so the `owner/repo` string is trusted after a regex. Any active member can already create a workspace project for a repository that does not exist, or one in an organization the workspace policy forbids. This change verifies the repository and asserts the organization policy before the project is created.
- **BREAKING**: none for existing clients. The extension's request shape is unchanged; it gains the same verification, which it already satisfies for any repository a member can actually open in GitHub.

### What the change grew into

The name still says "start timer from an org repository", and the work has outgrown it. Boards turned out to be worth adding deliberately, not only as a timer target, and that pulled the admin Add Project page in. Rather than split the work after it was built and reviewed, the scope is stated here honestly.

- **The Add Project page becomes one form with Source as a field.** It previously swapped its whole form for a list of clickable project cards, which meant an imported project could not be given the project manager, visibility or billable default a manual one gets. Source now sits at the top of the same form, an organization scopes the search, one autocomplete chooses the project, and a read-only block states what pressing Add project will create before it is pressed.
- **The import request carries visibility and default billable.** It inserted only a workspace, a name and a colour, so every imported project silently took the column defaults. The form could not offer those settings without promising something the endpoint does not do.
- **A timer started from a board reuses a project the workspace already has.** The repository stays authoritative; a project imported for the board is used only when the repository has none. Without this, importing a board and then tracking its issues produced two projects for the same work.
- **A board no longer offers "New task".** It was listed and then refused: the title field is disabled for a board and the confirm action resolves the task against a project's own tasks, where an inline new-task id never appears. A board's tasks are its issues, and a board with none now says so instead of offering a dead action.

### Decisions taken rather than deferred

Two questions were raised and are answered here rather than left open.

**Members keep the ability to create a project this way.** It is what the endpoint already does, and gating it on admin/pm would put the member back to waiting for an admin — the exact problem this change exists to remove. What changes is that the creation becomes bounded: a real repository, in an approved organization, instead of any string that matches a regex.

**Repository options are visually and structurally distinct from projects.** They are grouped under their own heading, and they never enter the code paths that assume a selected project has a real project id. This is the design's main risk and `design.md` names each guard.

## Capabilities

### New Capabilities

- `timer-github-project-tracking`: starting a timer against an issue on an organization GitHub Project board — which boards are offered, how their issues are listed, how draft items are reported, and what the member gets when the GiTiempo project is created from the issue's repository.

### Modified Capabilities

- `user-pages`: the capability owns the top-bar timer picker and gains a requirement for GitHub Project targets. The existing `Top-Bar Timer Task Picker` requirement is not rewritten — adding a third kind of target does not make anything it states untrue, and this change commits to leaving project selection byte-for-byte unchanged — so the delta adds rather than modifies.
- `time-tracking-api`: `Chrome Extension Can Start Timer From GitHub Issue` is renamed, because user-web becomes a second caller, and the capability gains a requirement for the authorization the endpoint does not perform today.
- `add-project-page`: `Add Project Form Collects Required Fields` is rewritten around Source as a field, and `Project Source Card Is Informational Only` is removed. That requirement described inert tiles and explicitly required that "neither tile triggers an action when clicked" — the page deliberately no longer works that way, so leaving it would keep a specification that the shipped page contradicts.
- `project-management`: gains the import request as a capability of its own, and the rule that decides which existing project a GitHub timer joins.

## Impact

- **user-web**: the Start timer dialog and its picker composables — a GitHub Project option type beside the existing GitHub issue option type, an owners/projects client, and issue loading for a board that has no GiTiempo project id yet.
- **admin-web**: the Add Project page becomes one form; the import panel becomes a fieldset that only reports a selection, and the copy that describes an import moves to a pure module with its own tests.
- **Backend** (`apps/api`): `TimeEntriesService` gains a `GithubService` dependency and verifies the repository plus the organization policy before creating anything, and resolves which existing project an issue joins. A leaf `ProjectImportsModule` owns the import routes — putting them in `ProjectsModule` is a cycle, because `TasksModule` already imports it. No migration.
- **Contracts** (`packages/shared`, `packages/web-shared`): the import request gains optional per-project visibility and billable default, the GitHub start request gains an optional board id, and the Add Project form gains a schema whose name is optional for the import branch. Every addition is optional, so no required list changes and no existing caller breaks.
- **Chrome extension**: none. Its request shape and flow are untouched.
- **Out of scope**: personal-account projects (the request named organizations), repository browsing as a separate axis, closed issues, and draft board items, which have no repository to track against. Also out of scope: creating a task directly on a board, which would need the server to materialise a project for a board with no issue behind it.
