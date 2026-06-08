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

### Requirement: Members Table Is A Dumb Presentational Table

The Members table rendering component MUST NOT own member filtering, filtered-row derivation, expansion state, expansion-mode state, or edit/assignment form rendering.

#### Scenario: Members page owns table view model

- **GIVEN** the Members page has loaded members and project membership data
- **WHEN** the page renders the Members table
- **THEN** the page or a focused page composable derives the visible member table rows, filter options, empty-state copy, expanded rows, and expansion mode
- **AND** the Members table receives those values as props and emits updates or row intents without storing or deriving them internally

#### Scenario: Members table forwards presentational intents

- **GIVEN** the Members table renders prepared desktop rows or mobile cards
- **WHEN** the admin changes a search/filter control or invokes Assign PM, Edit, or Remove
- **THEN** the table emits the corresponding filter update or row intent with the selected member
- **AND** the table itself does not filter members, toggle expansion, collapse rows, render edit/assignment forms, call APIs, show toasts, or open confirmations

#### Scenario: Members table remains presentational after removal refactor

- **WHEN** the Members table is mounted for isolated component testing
- **THEN** it can render supplied rows, filters, mobile cards, row-expansion slots, and row action controls without providing admin API clients, auth stores, toast services, confirmation services, project membership derivation, or edit/assignment form components
- **AND** existing Assign PM, Edit, and Remove action labels, tooltips, row expansion behavior, and filter behavior remain unchanged from the user's perspective

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

#### Scenario: Members assignment expansion form emits save payload

- **GIVEN** the Members page renders member assignment expansion content
- **WHEN** the admin submits assignment changes
- **THEN** the expansion form emits a typed save payload
- **AND** the Members page or focused composable performs auth checks, member/project API calls, success/error toast feedback, member refresh, and row collapse
- **AND** the expansion form itself does not import admin API clients, auth stores, toast helpers, or confirmation helpers

### Requirement: Edit Member Inline Form

The Members page MUST provide an inline edit panel that updates a member's role.

#### Scenario: Edit panel updates role

- **GIVEN** an admin selects Edit on a member row
- **WHEN** the row expands
- **THEN** the panel shows Name, Email, and editable Role fields in that order
- **AND** saving a role change issues a member-role update, collapses on success, refreshes the member list, and shows success notification
- **AND** backend last-admin protection failures keep the panel open and surface the rejection

#### Scenario: Members role edit expansion form emits save payload

- **GIVEN** the Members page renders role edit expansion content
- **WHEN** the admin submits role changes
- **THEN** the expansion form emits a typed save payload
- **AND** the Members page or focused composable performs auth checks, member/project API calls, success/error toast feedback, member refresh, and row collapse
- **AND** the expansion form itself does not import admin API clients, auth stores, toast helpers, or confirmation helpers

### Requirement: Remove Member Confirmation

The Members page MUST gate member removal behind a destructive confirmation dialog.

#### Scenario: Removal requires confirmation

- **GIVEN** an admin selects Remove on a member row
- **WHEN** the action is invoked
- **THEN** the page opens the shared confirmation dialog with a destructive confirm action
- **AND** confirming issues a member-remove request, refreshes the member list on success, and shows success notification
- **AND** cancelling sends no request
- **AND** backend last-admin protection failures are surfaced without removing the member

### Requirement: Members Table Emits Removal Intent

The Members page MUST keep member-removal API orchestration outside the Members table rendering component while preserving the existing remove-member user flow.

#### Scenario: Members table remove action emits intent

- **GIVEN** the Members table renders a member row in either desktop table or mobile card layout
- **WHEN** the admin invokes the row's `Remove` action
- **THEN** the table emits a `remove-member` intent with the selected member
- **AND** the table itself does not open the confirmation dialog, call the member-remove API, refresh loaded members, or show toast feedback

#### Scenario: Members page handles confirmed removal

- **GIVEN** the Members page receives a `remove-member` intent from the Members table
- **WHEN** the page handles the intent
- **THEN** it opens the shared destructive confirmation dialog using the selected member's display name or email
- **AND** confirming issues the member-remove request, refreshes the member list on success, and shows success toast feedback
- **AND** cancelling sends no member-remove request
- **AND** backend last-admin protection failures or other API errors are surfaced through error toast feedback without removing the row from loaded data

### Requirement: Pending Invitations Card
The Admin Members page SHALL render pending workspace invitations in a separate card below the members table.

#### Scenario: Pending invitations render documented fields
- **GIVEN** the admin opens the Members page
- **AND** pending invitations have loaded
- **WHEN** the pending invitations card renders
- **THEN** desktop and tablet layouts show Email, Role, Expires, and Actions columns
- **AND** mobile layout renders stacked records with the same fields
- **AND** the card uses the shared management-table/card visual language from the approved Admin Members design

#### Scenario: Pending invitations empty state
- **GIVEN** the invite list loads successfully with no pending invitations
- **WHEN** the pending invitations card renders
- **THEN** the page shows a distinct empty state for pending invitations
- **AND** it does not render the request-error state

#### Scenario: Pending invitations request error
- **GIVEN** the members data required by the page is available
- **AND** loading pending invitations fails
- **WHEN** the pending invitations card renders
- **THEN** the page shows a retryable request-error state scoped to pending invitations
- **AND** the error state remains distinct from an empty invite list

### Requirement: Pending Invitation Actions
The Admin Members page MUST provide accessible icon-only `Resend invite` and `Cancel invite` actions for each pending invitation.

#### Scenario: Resend pending invite
- **GIVEN** the admin selects `Resend invite` for a pending invitation
- **WHEN** the resend request succeeds
- **THEN** the page shows success toast feedback
- **AND** refreshes pending invite data

#### Scenario: Resend pending invite failure
- **GIVEN** the admin selects `Resend invite` for a pending invitation
- **WHEN** the resend request fails
- **THEN** the page shows error toast feedback using the backend message when available
- **AND** keeps the pending invitation row visible

#### Scenario: Cancel pending invite
- **GIVEN** the admin selects `Cancel invite` for a pending invitation
- **WHEN** the action is invoked
- **THEN** the page opens the shared destructive confirmation dialog
- **AND** confirming issues the cancel request, refreshes pending invite data, and shows success toast feedback
- **AND** cancelling sends no request

#### Scenario: Cancel pending invite failure
- **GIVEN** the admin confirms `Cancel invite` for a pending invitation
- **WHEN** the cancel request fails
- **THEN** the page shows error toast feedback using the backend message when available
- **AND** keeps the pending invitation row visible

#### Scenario: Pending invitation actions are accessible
- **GIVEN** the pending invitations card renders
- **WHEN** row actions are visible
- **THEN** each action is icon-only with a text tooltip
- **AND** each action exposes an accessible label matching `Resend invite` or `Cancel invite`
