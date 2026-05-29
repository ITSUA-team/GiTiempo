# Admin Members Page Specification

## Purpose

Define the admin Members management page behavior in `admin-web`.

## Requirements

### Requirement: Members Page Header And Stat Counters

The admin Members page SHALL render a page header and three stat counters that reflect current workspace membership and invite state.

#### Scenario: Header and stats render current data

- **GIVEN** an admin opens the Members page
- **WHEN** the page renders
- **THEN** the header shows title, description, and a primary `Invite Member` action
- **AND** the stat row shows Active Members, Pending Invites, and PMs Assigned counts from loaded member and invite data
- **AND** the page reuses the shared stats header and stat card patterns instead of app-local copies

### Requirement: Invite Member Dialog

The admin Members page MUST provide an `Invite Member` dialog that creates a pending workspace invite.

#### Scenario: Dialog validates and creates invite

- **GIVEN** the admin opens the invite dialog
- **WHEN** the dialog renders
- **THEN** it shows email and role fields with Cancel and Send Invite actions
- **AND** invalid email or missing role shows field-level validation without sending a request
- **AND** successful invite creation closes the dialog, shows success notification, and updates the pending invite count
- **AND** backend errors keep the dialog open and show the rejection reason

### Requirement: Members Table Columns And Data

The Members page MUST render workspace members using the documented management table columns and shared table chrome.

#### Scenario: Members table renders documented columns

- **GIVEN** the workspace member list has loaded
- **WHEN** the table renders
- **THEN** it shows Member, Role, Projects Assigned, Last Active, and Actions columns
- **AND** the Member cell shows avatar, display name, and email
- **AND** assignment count and last-active values come from the workspace member contract
- **AND** the table uses the shared management table chrome instead of a parallel app-local copy

### Requirement: Members Table Discovery Filters

The Members page MUST render report-style table discovery controls that filter loaded member rows locally without changing backend scope.

#### Scenario: Members table exposes search and column filters

- **WHEN** workspace member, invite, and project membership data have loaded
- **THEN** the table card header exposes a global search control with placeholder `Search members`
- **AND** the desktop table renders a filter row directly below the column header with controls for member name/email, role, assigned projects, and last active
- **AND** the Actions column does not render a filter control
- **AND** the mobile card list renders equivalent search and filter controls above the cards

#### Scenario: Members project filters require loaded project membership data

- **GIVEN** workspace member data has loaded
- **AND** project membership data is still loading
- **WHEN** the Members page is still completing its initial load
- **THEN** the page keeps the initial loading surface instead of rendering the Members table with empty assigned-project filter options
- **AND** if project membership data fails during initial load, the page renders the retryable Members request-error surface
- **AND** the table does not imply that loaded members have no assigned projects only because project data is unavailable

#### Scenario: Members filters narrow loaded rows locally

- **WHEN** the user enters global search text or selects role, assigned-project, or last-active filters
- **THEN** visible member rows and mobile cards are limited to loaded members matching all active filters
- **AND** global search matches member display name, email, formatted role, assigned project labels or counts, and formatted last-active text
- **AND** assigned project labels come from the loaded project membership data used by the Members page
- **AND** last-active filter options are `Any activity`, `Active today`, `Active this week`, and `No activity`
- **AND** `Active today` uses the current browser-local calendar day
- **AND** `Active this week` includes valid `lastActiveAt` values from browser-local Monday `00:00` through the current time
- **AND** `No activity` includes members with missing or invalid `lastActiveAt`
- **AND** clearing active filters restores all loaded members allowed by the page's role scope
- **AND** no member-list API request is required solely for table filtering

#### Scenario: Members filtering preserves management actions

- **WHEN** a filtered member row is visible
- **THEN** existing Assign PM, Edit, and Remove actions keep their accessibility labels, confirmation behavior, inline expansion behavior, and refresh events
- **AND** if an expanded row becomes excluded by filters, the expanded state does not remain visible for a hidden row

### Requirement: Inline PM Assignment Expansion

The Members page MUST provide an inline assignment expansion under non-admin member rows.

#### Scenario: Assignment expansion applies project assignment diff

- **GIVEN** an admin selects Assign PM on a non-admin member row
- **WHEN** the row expands
- **THEN** the expansion lists active workspace projects with current assignments pre-checked
- **AND** saving creates assignment records for newly checked projects and removes assignments for newly unchecked projects
- **AND** success collapses the expansion and refreshes the member list
- **AND** cancel collapses without sending requests
- **AND** admin member rows do not show the Assign PM action

### Requirement: Edit Member Inline Form

The Members page MUST provide an inline edit panel that updates a member's role.

#### Scenario: Edit panel updates role

- **GIVEN** an admin selects Edit on a member row
- **WHEN** the row expands
- **THEN** the panel shows Name, Email, and editable Role fields in that order
- **AND** saving a role change issues a member-role update, collapses on success, refreshes the member list, and shows success notification
- **AND** backend last-admin protection failures keep the panel open and surface the rejection

### Requirement: Remove Member Confirmation

The Members page MUST gate member removal behind a destructive confirmation dialog.

#### Scenario: Removal requires confirmation

- **GIVEN** an admin selects Remove on a member row
- **WHEN** the action is invoked
- **THEN** the page opens the shared confirmation dialog with a destructive confirm action
- **AND** confirming issues a member-remove request, refreshes the member list on success, and shows success notification
- **AND** cancelling sends no request
- **AND** backend last-admin protection failures are surfaced without removing the member
