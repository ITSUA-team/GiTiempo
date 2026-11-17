# User own-time visibility evidence

## Scope and method

- **Candidate:** the current uncommitted tree based on `4a035c61`.
- **Browser:** a normal User SPA session in headed Chrome for Testing through
  Chrome DevTools Protocol on local `localhost`. No authentication state,
  membership, role, or user record was changed or bypassed.
- **Fixture:** local development database `gi_tiempo`, guarded to localhost.
  The isolated `SPA own-time QA 20261029` fixture contained a private
  external-reference project with its own-time task and hidden sibling, plus a
  public managed destination project and task. Cleanup verification recorded
  zero remaining fixture projects, tasks, and entries in
  `evidence/own-time-cleanup-check.json` and
  `evidence/own-time-fixture-cleanup.json`.

The first entry was seeded directly into the local fixture database to model
time materialized outside this SPA. It was not created through the UI, and this
test makes no claim about an external GitHub API call. The observations below
cover frontend reconciliation after normal visibility revalidation.

## First entry makes only the related private work visible

Before the fixture entry existed, the private own-time project was absent and
the public managed destination was visible
(`evidence/cdp-own-time-before-first-desktop.png`). After the seeded entry and
a normal focus-driven visibility refresh, the own-time project and its entered
task appeared while the hidden sibling remained absent. The UI showed the
own-time help text, “You can only see your own time and tasks with your time
entries.”, at desktop and mobile widths
(`evidence/cdp-own-time-first-desktop.png` and
`evidence/cdp-own-time-first-mobile.png`). Searching for `QA own-time` also
offered the visible own-time item.

## Deleting the last entry revokes the private work

Using the real User SPA at mobile width, the only entry was edited, deleted,
and confirmed. The delete returned success; the list became empty and the edit
dialog closed. The timer top bar then reported no eligible task, the project
selector contained only the public destination, and both the task query and
Projects search for `QA own-time` had no result. Screenshots:

- `evidence/cdp-own-time-deleted-mobile.png`
- `evidence/cdp-own-time-deleted-desktop.png`
- `evidence/cdp-own-time-search-removed-mobile.png`

## Moving the remaining entry revokes the old project

A second local fixture entry was seeded on the own-time task. Through the real
desktop User SPA, its edit dialog moved the entry to the public destination
project and task, and the resulting PATCH succeeded. The dialog closed; the
old task disappeared, the destination task remained, and a database check
confirmed the entry's destination project and task. The project selector
contained only the destination, and Projects no longer showed the old project
or task at either width. Screenshots:

- `evidence/cdp-own-time-moved-desktop.png`
- `evidence/cdp-own-time-moved-mobile.png`
- `evidence/cdp-own-time-move-projects-mobile.png`

## Network-record boundary

`candidate-own-time-first-entry`, `candidate-own-time-last-delete`, and
`candidate-own-time-last-move` in `evidence/cdp-network-counts.json` capture
the corresponding navigation and authority reads. They are reconciliation
traces, not isolated request-budget measurements; this document therefore
makes no per-flow request-count reduction claim.

The delete trace records HTTP 204 together with `failed: true`. The cause of
that recorder flag was not established. Successful deletion is supported by
the HTTP status, the browser's empty state, and the database check confirming
the sole entry was removed; the move trace records HTTP 200.
