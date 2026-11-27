# Proposal

## Why

Workspace admins can invite someone with a role, but the Members page provides no way to change that role later. Admins also need to transfer responsibility and step down without leaving the workspace unmanaged. [Issue #465](https://github.com/ITSUA-team/GiTiempo/issues/465)

## What Changes

- Let admins edit the workspace role of any current member, including themselves, in Member settings on desktop and mobile.
- Show project controls and invoice access according to the saved role. Explain that admins have access to all projects.
- Apply a successful self-demotion to the active session and navigation immediately. Preserve the last-admin safeguard and the existing removal action for other members.

## Capabilities

### Modified Capabilities

- `admin-members-page` covers role selection, self-editing, feedback and navigation after self-demotion.
- `workspace-membership` covers self-demotion, workspace isolation and effective permissions after a role change.

## Impact

The work affects admin-web, API authorization verification, UI documentation and the Members design. It reuses the current membership endpoint, shared role values and session renewal contract. Authentication behavior changes when an admin saves their own role.
