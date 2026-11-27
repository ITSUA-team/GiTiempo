## MODIFIED Requirements

### Requirement: Edit Member Inline Form

On desktop and mobile, the Members page SHALL let a workspace admin open Member settings from any member's name, including their own, and change the workspace role. The same panel SHALL present project access and invoice permissions for the saved role.

#### Scenario: Edit panel updates role

- **GIVEN** an admin opens another member's settings, including another admin's
- **WHEN** the panel opens
- **THEN** it shows Name, Email and an editable Role in that order, with the saved role selected and Member, PM and Admin available
- **WHEN** the admin saves a different role using the form’s shared `Save changes` action
- **THEN** the panel collapses and the affected item and counters update in place without refetching the member or project lists
- **AND** cancelling before save sends no role update

#### Scenario: Save a role and applicable assignments together

- **GIVEN** the settings form shows editable project assignments
- **WHEN** the admin changes the role to Member or PM, edits the assignments and selects `Save changes`
- **THEN** the role is saved before the assignment changes
- **AND** after success, the item, project count and filter matches update in place without refetching the lists
- **AND** if the role update is rejected, the assignment changes are skipped
- **AND** if assignment writes fail after the role is saved, the form reports the failure and uses refreshed server state for a retry
- **AND** selecting Admin displays all-project access and omits assignment changes from the save

#### Scenario: Members role edit expansion form emits save payload

- **GIVEN** the Members page renders role edit expansion content
- **WHEN** the admin submits role changes
- **THEN** the expansion form emits a typed save payload
- **AND** the page or its composable performs authorization checks, sends the update, handles errors and applies the saved changes to the affected item
- **AND** the expansion form itself does not import admin API clients, auth stores, toast helpers or confirmation helpers

#### Scenario: Open own settings

- **GIVEN** the signed-in workspace admin is listed in the desktop table or the mobile cards
- **WHEN** they select their own name
- **THEN** the same role editor opens and the Remove member action is absent

#### Scenario: Controls reflect the saved role

- **GIVEN** an admin opens a member's settings, including after a saved role change
- **WHEN** the saved role is Admin
- **THEN** the panel displays `Has access to all projects` without an assignment selector
- **WHEN** the saved role is Member or PM
- **THEN** the panel offers the existing project assignment controls
- **AND** only a saved PM role exposes the existing Allow viewing invoices toggle

#### Scenario: Last admin receives a recoverable rejection

- **GIVEN** an admin edits the last admin membership on desktop or mobile
- **WHEN** the server rejects the requested demotion
- **THEN** the panel stays open and explains that the workspace must retain at least one admin
- **AND** the saved role and effective permissions remain Admin

#### Scenario: Current session follows a successful self-demotion

- **GIVEN** another admin remains in the workspace
- **WHEN** the current admin saves their own role as PM or Member
- **THEN** admin-only actions and data become inaccessible immediately and the user leaves Members for a destination permitted to the new role in the same workspace
- **AND** the normal successful transition requires no new sign-in
- **AND** if the session cannot be synchronized after the save, the page offers session recovery with admin-only controls and cached data inaccessible
