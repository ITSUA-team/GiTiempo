## Purpose

Give administrators and assigned project managers one place to review and correct individual team time entries within a project.

## ADDED Requirements

### Requirement: Project selection and entry discovery
The page SHALL show the projects the viewer can manage and the paginated entries of the selected project, with partial task-title search, member and entry start-time filters. Desktop SHALL use a project sidebar and table. Mobile SHALL place a project selector above entry cards.

#### Scenario: Review the selected project
- **GIVEN** a manager has selected a project
- **WHEN** its entries load
- **THEN** each row or card shows the task, description when present, member, time interval, duration, billable state, status and applicable actions
- **AND** a running interval is identifiable while its end time is unknown

#### Scenario: Filter and change projects
- **GIVEN** a project has several pages of entries
- **WHEN** the manager searches or changes a member or date filter
- **THEN** matching entries and pagination totals reflect the selected project and filters starting at the first page
- **WHEN** the manager selects another project
- **THEN** that project's results and eligible controls replace the previous selection, even if a previous request finishes later

#### Scenario: Filter by a historical member
- **GIVEN** a past contributor has entries in the project and no longer has access
- **WHEN** the manager filters entries by member
- **THEN** that contributor remains selectable for filtering even though they cannot receive a new entry

#### Scenario: No authorized projects or no matching time
- **GIVEN** the project list or filtered entry list has loaded
- **WHEN** the viewer has no manageable project or no entries match in the selected project
- **THEN** the page distinguishes those empty states and offers creation only when a selected project can accept new entries

### Requirement: Manage completed entries
The page SHALL support manual creation for an eligible member, editing an eligible entry's task within the project, interval, description and billable flag, and confirmed deletion. Edits SHALL preserve project and owner.

#### Scenario: Create time on behalf of a member
- **GIVEN** the manager has selected a project
- **WHEN** they choose New time entry, select an eligible member and task, enter a valid completed interval and save
- **THEN** the entry belongs to that member in the selected project and the list refreshes under its current filters

#### Scenario: Correct historical time
- **GIVEN** the manager can access a completed unbilled entry whose owner lost access or whose task or project is inactive
- **WHEN** the manager corrects its interval or description without changing its task
- **THEN** the form accepts the correction without requiring selection of a currently eligible owner or task

#### Scenario: Delete requires confirmation
- **GIVEN** a completed unbilled entry
- **WHEN** the manager cancels its delete confirmation
- **THEN** the entry stays in the list
- **WHEN** the manager confirms deletion and the server accepts it
- **THEN** the list and pagination reflect its removal

### Requirement: Explain read-only entry states
The page SHALL show running and invoiced entries with an accessible reason for blocked editing and deletion. A server rejection SHALL surface its reason and refresh the affected data without presenting the operation as successful.

#### Scenario: Entries are already locked
- **GIVEN** a running entry or one linked to an invoice of any status
- **WHEN** its row or mobile card is displayed
- **THEN** the running entry explains that the timer must be stopped and the invoiced entry explains that it is included in an invoice
- **AND** neither state offers an enabled edit or delete action

#### Scenario: Status changes after opening an action
- **GIVEN** the manager opened an edit form or delete confirmation while an entry was editable
- **WHEN** the server rejects the action because the entry has since been invoiced
- **THEN** the page explains the invoice conflict and shows the refreshed entry as read-only
