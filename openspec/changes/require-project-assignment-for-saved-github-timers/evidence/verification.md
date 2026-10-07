# Implementation verification

Date: 2026-10-07. Branch: `fix/github-tracking-assignment-after-disconnect`.
Base revision: `2467c8e5`; implementation is the uncommitted working-tree diff.

## Implemented behavior

Ordinary saved-task timer starts lock the current workspace membership, project,
required assignment, and task inside the insert transaction. A stored GitHub issue
reference requires an ordinary member's explicit project assignment even for
public projects. Public denial uses the existing assignment code and remedy;
invisible private targets stay 404. Personal credentials are not consulted.
Admin/PM visibility rules and manual tasks retain existing authorization.
Completed entries, historical edits, running-task reassignment, and owned stopping
continue through their existing paths.

Frontend rejection tests cover Projects, existing-task top-bar, and prior-entry
starts. They assert the assignment remedy, no success toast, and no false running
state. Projects refreshes the server's current timer after rejection. The top-bar
now recognizes the ordinary endpoint's assignment error code.

## Automated evidence

| Check | Result |
| --- | --- |
| Regression before authorization fix | Assignment denial regression failed against old behavior; API executor recorded the failure before implementation. |
| API unit tests | Final root run: 40 files, 462 tests passed. Role tests explicitly prove a stale admin token cannot override current member assignment requirements. Decorative connection-state unit labels were replaced with actual role/assignment cases; persisted connection states are covered in the pending PostgreSQL tests. |
| API typecheck | Passed, including new e2e source. |
| PostgreSQL e2e | 19 files, 259 tests passed against the isolated migrated/seeded database (16.59 seconds). The filename argument ran the configured full e2e set. |
| API lint | Passed after formatting affected files. |
| API build | Passed; compiled API used for local manual testing. |
| User-web tests | 50 files, 519 tests passed. |
| User-web typecheck | Passed. |
| User-web lint | Passed; 12 pre-existing unrelated warnings, zero errors. |
| OpenAPI export | Passed via `pnpm --filter @gitiempo/api openapi:export` with test-mode overrides. JSON comparison proves only ordinary timer-start's 403 response changed semantically; every component schema is identical. |
| Error envelope / clients | Existing exception filter retains `code`, `error`, `message`; existing shared schema accepts the envelope. Affected clients use `ApiError` code/message. No shared source changes needed. |
| OpenSpec strict validation | Passed; optional telemetry flush failed because `edge.openspec.dev` was unavailable. |
| Diff whitespace | Passed. |
| Independent final review | No findings. Authorization, lock order, role exceptions, frontend denial handling, and preserved manual/stop paths reviewed. |

Test-mode commands need `INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS=false`
because the existing local environment enables a development-only setting.
Initial OpenAPI attempts failed environment validation; the corrected export passed.
No credential values were printed.

## PostgreSQL and local manual scenarios

The user explicitly approved applying existing migrations to the new isolated
local database `gitiempo_saved_github_20261007` after the initial automatic review
rejection. Migration and seeding succeeded. Existing application databases were
not modified. No new migration files were introduced.

E2E command:

```sh
DATABASE_URL=postgresql://localhost:5432/gitiempo_saved_github_20261007 NODE_ENV=test INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS=false pnpm --filter @gitiempo/api test:e2e -- time-entries.e2e-spec.ts
```

The configured complete e2e set passed: 19 files / 259 tests. Saved-task coverage
persists real connected/disconnected/absent/expired rows, uses board-only task
mapping, verifies no writes and preserved history on denial, assignment removal,
owned stopping, current-task state, one-running-timer conflict, source, billing,
description, and role/manual exceptions. GitHub-specific e2e provider lookups use
the suite's existing mock; they do not prove a live GitHub App installation.

Local services were API `http://localhost:3107` (`NODE_ENV=test`, compiled build),
user-web `http://localhost:5273`, and admin-web `http://localhost:5274`, all using
only the isolated database. Browser automation used separate `agent-browser`
sessions `saved-github-qa` and `saved-github-admin-qa`.

Seeded identities were Bob (`member`), Alice (`pm`), and Admin (`admin`). Auth used
the documented fake Firebase provider; no real account credentials were needed.
Four disposable projects had ids `71000000-0000-4000-8000-000000000001` through
`...004`; their saved issue task ids had prefix `72000000` with the same suffix.
Initial states:

| Project suffix | Visibility | Bob assignment | Alice assignment | Task / history |
| --- | --- | --- | --- | --- |
| 001 | public | assigned | assigned | Saved GitHub issue; previous completed entry |
| 002 | public | absent | absent | Saved GitHub issue; manual task (suffix 005); previous entries |
| 003 | private | assigned | assigned | Saved GitHub issue; previous completed entry |
| 004 | private | absent | absent | Saved GitHub issue; no previous member entry |

Each project had a repository reference, and each issue task had its own stored
GitHub issue reference. The manual task had no issue reference. Issue task billing
was false; manual task billing was true. Bob's initial connection was `connected`
with dummy encrypted fixture strings. Actual Profile disconnect cleared these
strings and persisted `disconnected` after reload. These fixtures exercise local
connection state and cleanup, not live OAuth token validity.

| Surface / state | Expected | Actual |
| --- | --- | --- |
| Profile disconnect, member | Clears connection and stays disconnected after reload | Passed. DB: `connected=false`, both credential columns null. Screenshot `profile-disconnected.png`. |
| Projects, disconnected member, public 002 unassigned | Assignment error; no timer/new entry/success feedback | Passed. Exact remedy visible; task entry count remained one historical entry, zero running. Screenshot `projects-assignment-denied.png`. |
| Projects, disconnected member, public 001/private 003 assigned | Both start, then stop | Passed. Both displayed authoritative running timer; stopped before next case. Screenshot `assigned-private-running.png`. |
| Existing-task top-bar, disconnected member, public 002 unassigned | Assignment error; no false timer | Passed. Exact remedy and `Project assignment required` toast; dialog remains Start timer. Screenshot `topbar-assignment-denied.png`. |
| Existing-task top-bar, disconnected member, public 001/private 003 assigned | Both start, then stop | Passed. Public description `QA topbar description` persisted. |
| Prior-entry restart, disconnected member, public 002 unassigned | Assignment error; no entry | Passed. Count remained one member historical entry. Screenshot `prior-entry-assignment-denied.png`. |
| Prior-entry restart, disconnected member, public 001/private 003 assigned | Both start, then stop | Passed. |
| Private 004 unassigned | Absent UI; submitted saved identifier returns safe 404, no entry | Passed. No private project rendered; HTTP 404 message `Project not found`, no protected task/project details. |
| Public 002 unassigned, connected fixture | Still denied | Passed. Connection endpoint reported `connected`; start returned 403 `project_assignment_required` with exact remedy. |
| Stale selected private 003 task | Denied after committed admin removal without member reload | Passed. Separate admin editor removed Bob; DB assignment count zero; untouched member picker still selected old task and returned `Project not found`. Screenshot `stale-selection-denied.png`. |
| Running public 001 owned timer | Disconnect plus admin removal still allows owner to stop; history retained | Passed. Actual Profile disconnect and separate admin editor removal; member Stop timer succeeded. Earlier rows and description remained visible. Screenshot `history-after-owned-stop.png`. |
| Unassigned member, manual task in public GitHub project 002 | Start/stop permitted | Passed through prior-entry UI; task has no GitHub issue ref. |
| Admin, unassigned private 004 | Implicit access; start/stop | Passed via local API: 201/200. |
| PM, unassigned public 002 / assigned private 003 | Visibility-based start/stop | Passed via local API: both 201/200. |
| PM, unassigned private 004 | Safe 404 | Passed via local API. |
| Live extension on GitHub issue page | Verified test installation, disconnected assigned succeeds even without issue assignment; unassigned denied | Passed in the follow-up below. Actual injected-button starts on private issue #3 passed both states with live App verification and matched user-web. |

Safe public denial envelope inspected locally:

```json
{
  "statusCode": 403,
  "code": "project_assignment_required",
  "error": "DomainError",
  "message": "You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time."
}
```

The actual envelope additionally contains a request id. `GET /time-entries/current`
returned `{ "timeEntry": null }` after denied starts. The unassigned member's
public task entry count stayed one until the separate PM success case. Owned stop
preserved source `web`, false billing, description, and positive duration (the
public top-bar description case recorded 16 seconds). All role-check starts were
stopped with `expectedTimerId`; quick cases recorded one second as designed.

The disconnected picker reports an optional GitHub browsing error while still
exposing and accepting saved local task options. This is existing browsing behavior
and does not invalidate the saved-task authorization cases. Some browser actions
needed re-snapshotting after autocomplete/dialog transitions or closing a toast;
only completed actions and verified server state are marked as passes.

Cleanup verified zero running fixture timers, then removed only this manual run's
15 entries, four issue refs, four project refs, remaining fixture assignments,
five tasks, four projects, and the dummy connection. Project/task fixture counts
are both zero. The isolated migrated database remains available; application
services/browser sessions started for this run were stopped.

Tested runtime source SHA-256:

- `time-entries.service.ts`: `c34c83d7b049c968f488f991c61e9171fdf274464f1d92ce0387ee5dc60990f7`
- `useTopBarTimerActions.ts`: `63b01b2885a3f6d1d74f44bfef6a211eeae7dc4fd2158aee6213d5a58c827834`

Task 4.6 is complete based on the live injected-button evidence below.
Before archive, synchronize the implemented `workspace-github-installation-tracking`
predecessor and then this change's timer-start delta as described in task 5.3.

## Extension follow-up: live installation verified

The follow-up located an already verified test association in the existing local
development database `gi_tiempo`: organization `My-test-org-for-clock`, App
installation `164870679`, App `5074370`, verified on 2026-09-25. The development
database was read only. A metadata-only copy of this trusted association and a
disposable allowed-organization policy were placed in the isolated QA database;
no personal OAuth credentials or original verifier identity were copied. This
does not claim a new installation setup/owner-verification flow was tested.

GitHub's live App API independently returned this active organization installation
with read permissions. A repository-scoped read-only lookup found private
repository `My-test-org-for-clock/test-repo` and open issue #3, `other issue`, with
an empty assignee list. Every extension start below used the real backend
installation/repository/issue verification, with no provider mock and no GitHub
issue or repository writes.

The Chrome extension was built with `vite build --mode test` for API
`http://localhost:3107` and user-web `http://localhost:5273/login`. The bundle is
gitignored under `apps/chrome-ext/dist/chrome`; no extension source changed.
Extension typecheck, 11 files / 149 tests, and the Chrome build passed. The build's
optional manifest-schema download warning did not prevent the bundle. A separate
headed browser session `gitiempo-extension-live-qa` loaded the bundle and its
actual MV3 background worker. Test Firebase exchange authenticated Bob through
the extension's normal runtime exchange handler; token values were not printed.

Disposable project `73000000-0000-4000-8000-000000000001` is public, named
`QA Live Extension Assignment`, and mapped to the real repository. Saved task
`74000000-0000-4000-8000-000000000001` is mapped to issue #3 and has false billing.
Bob's disposable personal connection is disconnected, with both credentials null.

| Surface / state | Actual evidence |
| --- | --- |
| Extension background `timer/start`, assigned disconnected member | `ok: true`; live provider verified issue #3; returned the pre-existing local task, source `extension`, false billing. Owned stop succeeded; completed duration 12 seconds. This runtime-message exercise does not substitute for an injected-button click. |
| User-web Projects, same saved task and assignment | Actual row start/stop succeeded, source `web`, false billing, completed duration 54 seconds. Screenshot `live-issue-web-assigned.png`. |
| Extension background after removal of QA assignment | `ok: false`, code `project_assignment_required`, exact shared remedy, current timer null. Live provider remained active. |
| User-web Projects after the same removal | Row start displayed the exact remedy and no running timer. Screenshot `live-issue-web-denied.png`. |
| No writes on either denied start | Database still contained exactly the two completed success entries; no running entry. Connection remained disconnected with both credentials null. |
| Injected extension button on real issue page, assigned | After the user signed into GitHub directly, issue #3 displayed `other issue`, an empty assignee list, and the actual extension Start Timer control. Clicking Start Timer returned HTTP 201 and displayed Running / Stop Timer. The existing saved task received source `extension`, false billing; clicking Stop Timer returned HTTP 200 and saved 11 seconds. Screenshot `live-extension-issue-assigned.png`. |
| Injected extension button after assignment removal | First request encountered a GitHub transport timeout and safely returned HTTP 503 `github_provider_unavailable` without an entry. Retry refreshed state; the next actual Start Timer click returned HTTP 403 and displayed the exact assignment remedy with Retry, no running timer. Screenshot `live-extension-issue-denied.png`. |
| Final no-write / disconnect checks | After the injected-button denial, the database contained exactly three completed success entries (two extension, one web), zero running entries, zero project assignments, and the personal connection still disconnected with both credentials null. |

The GitHub browser sign-in was performed by the user; no GitHub password or
browser authentication cookie was read or copied by the agent. That browser login
did not change Bob's disconnected personal GitHub connection in GiTiempo.

Cleanup verified no running fixture timer, then removed only the follow-up's
three completed entries, one issue ref, one repository ref, one saved task, one
project, disposable personal connection, copied installation association, and
disposable organization policy. The assignment was already absent. Project,
task, and copied-installation counts were all zero after cleanup. Both follow-up
browser sessions and the local API/user-web processes were stopped. The original
development database and GitHub issue were unchanged.

All 21 tasks are complete. Runtime source did not change during the live follow-up;
the previously tested implementation and source hashes above remain applicable.
