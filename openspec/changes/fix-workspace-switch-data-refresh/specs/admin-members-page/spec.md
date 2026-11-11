## ADDED Requirements

### Requirement: Member management follows the active workspace
The Members page SHALL scope its member list, project assignment choices, pending invitations, counters and actions to the active workspace throughout a switch.

#### Scenario: Switch with a member or invitation action open
- **GIVEN** an admin viewing Members in A is editing an assignment or confirming an invitation action
- **WHEN** the admin successfully switches to B and retains access to Members
- **THEN** the page closes the old action and removes A's members, assignments, invitations and counters
- **AND** the open page automatically displays B's members, assignment choices, invitations and counters within the admin's permissions

#### Scenario: Member and invitation loads finish independently
- **GIVEN** B's member list has loaded while its invitations are still loading
- **WHEN** A's outstanding invitation response arrives or B's invitation request fails
- **THEN** A's invitations and invitation actions remain unavailable, B's members remain visible, and invitation status reflects only B's request
