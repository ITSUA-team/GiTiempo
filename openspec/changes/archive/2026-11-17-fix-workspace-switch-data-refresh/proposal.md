# Proposal

## Why

Switching workspaces on the Admin Projects page updates the workspace name while the table and counters still describe the previous workspace. The reproduction in [GitHub issue #522](https://github.com/ITSUA-team/GiTiempo/issues/522) requires a browser reload to see the correct projects. The same lifetime mismatch affects member management, project creation and saved report presets.

## What Changes

- Refresh project rows, counters and member options when the workspace changes on Projects.
- Refresh members, assignment choices, pending invitations and counters on Members. Invalidate actions opened against the previous workspace.
- Refresh project manager options on Add Project and reload GitHub import choices when the import form is visible. Clear selections that belonged to the previous workspace.
- Refresh the saved reports bar on Reports and clear the previous workspace’s active preset and saved configuration.
- Keep an accessible route open through the switch. Discard obsolete responses, including after a rapid return to a previous workspace. A failed switch leaves the current workspace state intact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-projects-page` — workspace-scoped project management data and actions.
- `admin-members-page` — workspace-scoped members, assignments and invitations.
- `add-project-page` — workspace-scoped manager and GitHub import choices.
- `admin-pages` — workspace ownership of saved report presets in the Reports UI.

## Impact

The change affects the admin frontend in `apps/admin-web`. It uses the existing workspace switch, authorization rules and API contracts. User App pages, backend endpoints and shared packages require no changes.
