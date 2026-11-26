## Why

An active workspace member can track a manual task in a public GiTiempo project, yet the same member can receive an assignment error on a GitHub-linked task in that project. Public visibility should grant tracking access to both. [Issue #572](https://github.com/ITSUA-team/GiTiempo/issues/572)

## What Changes

- Allow active workspace members to start eligible tasks in active public projects without a project assignment, including saved GitHub tasks and issues resolved to a public project through the GitHub integration.
- Use that rule in the extension's availability check and in the authoritative start request.
- Show the member assignment dropdown in inline project settings only when the selected visibility is private. Preserve stored assignments when saving a public project.

## Capabilities

### Modified Capabilities

- `time-tracking-api` defines public-project authorization for saved and GitHub-originated timers.
- `admin-projects-page` defines when the expanded project editor offers member assignment.

## Impact

The API and admin SPA require changes. The user SPA and Chrome extension consume the updated start decision through their existing endpoints. This changes authorization outcomes for public projects. Authentication, payload formats and database schema require no migration.
