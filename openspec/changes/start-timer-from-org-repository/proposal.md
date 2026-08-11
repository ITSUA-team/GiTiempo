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

## Impact

- **user-web**: the Start timer dialog and its picker composables — a GitHub Project option type beside the existing GitHub issue option type, an owners/projects client, and issue loading for a board that has no GiTiempo project id yet.
- **Backend** (`apps/api`): `TimeEntriesService` gains a `GithubService` dependency and verifies the repository plus the organization policy before `findOrCreateProjectForRepo`. No new route, no contract change, no migration.
- **Chrome extension**: none. Its request shape and flow are untouched.
- **Out of scope**: personal-account projects (the request named organizations), repository browsing as a separate axis, closed issues, and draft board items, which have no repository to track against.
