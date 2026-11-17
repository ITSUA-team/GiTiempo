## ADDED Requirements

### Requirement: Projects follow the active workspace on the open page
The Projects page SHALL refresh project rows, management counters and member choices when the active workspace changes, and SHALL expose only actions available in the current workspace.

#### Scenario: Switch between workspaces with different projects
- **GIVEN** an admin on Projects can access the page in workspaces A and B and has a project from A open for editing
- **WHEN** the switch to B succeeds
- **THEN** the page stays on Projects and immediately clears A's rows, counters, member selections and open project actions
- **AND** the page automatically shows B's rows, counters and member options when they load, including empty results

#### Scenario: An obsolete response arrives after switching back
- **GIVEN** an earlier Projects request from A is pending when the admin switches to B and back to A
- **WHEN** the earlier request completes after the current visit's request
- **THEN** the displayed project data and load status still belong to the current visit

#### Scenario: The destination data fails to load
- **GIVEN** the switch to B succeeded and its project data is loading
- **WHEN** the load fails
- **THEN** Projects shows the failure for B and keeps A's data and actions unavailable

#### Scenario: The workspace remains unchanged
- **GIVEN** the admin is viewing projects in A
- **WHEN** a switch is rejected or the session token refreshes within A
- **THEN** the current project view and selection are preserved
