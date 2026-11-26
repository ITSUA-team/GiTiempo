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
The page SHALL support manual creation, editing the project, member, task, interval, description and billable flag on completed entries with no invoice link, and confirmed deletion. Edit SHALL open with the entry's current values and use the same eligible destination options as creation.

#### Scenario: Create time on behalf of a member
- **GIVEN** the manager has selected a project
- **WHEN** they choose New time entry, select an eligible member and task, enter a valid completed interval and save
- **THEN** the entry belongs to that member in the selected project and the list refreshes under its current filters

#### Scenario: Select task or member first
- **WHEN** the manager opens New time entry
- **THEN** the project defaults to the sidebar selection and both pickers are available once their options load
- **WHEN** the manager selects a task first
- **THEN** they can choose an eligible member and save with the original task still selected
- **WHEN** the manager starts with an explicitly assigned member instead
- **THEN** they can choose any active, non-closed task in that project

#### Scenario: Choose between tasks with the same title
- **GIVEN** multiple tasks in the picker have the same title, ignoring case
- **WHEN** the manager searches for that title
- **THEN** the choices show distinct task ID prefixes
- **AND** typing the shared title alone does not select either task

#### Scenario: Change the draft project before saving
- **GIVEN** the manager has entered start, end and description and chosen a member and task in project A
- **WHEN** they choose another active manageable project B inside the create dialog
- **THEN** the task clears, start, end and description retain their values, and the member stays selected only with a current explicit assignment to B
- **AND** a late response for A cannot restore its options or clear a valid selection in B
- **WHEN** they complete a valid selection and save
- **THEN** the entry is created in B and the sidebar still shows A under its existing filters

#### Scenario: Change only the member within the current project
- **GIVEN** the manager opens an editable entry whose active task is trackable by another current member of the workspace
- **WHEN** they select that member and save
- **THEN** the same entry is assigned to the new member and keeps the project and task
- **AND** the table reflects the new member or removes the row if it falls outside the current filters

#### Scenario: Replace an incompatible member and task
- **GIVEN** the entry's current task is unavailable to the intended member
- **WHEN** the manager clears the task to choose that member first, or clears the member to choose a different task first
- **THEN** they can select a new eligible pair in either order and save only after both selections are valid

#### Scenario: Move an existing entry to another project
- **GIVEN** the manager is editing a completed entry with no invoice link in project A and can also manage active project B
- **WHEN** they choose project B in the dialog
- **THEN** the task clears and the member stays selected only with a current explicit assignment to B
- **AND** start, end, description and the current billable value stay in the draft
- **WHEN** they choose an eligible member and task and save
- **THEN** the same entry moves to B and disappears from the list for A
- **AND** the page keeps its selected project and filters while reconciling the list and pagination

#### Scenario: Correct historical time
- **GIVEN** the manager can access a completed entry with no invoice link whose owner lost access or whose task or project is inactive
- **WHEN** the manager corrects its interval, description or billable flag while keeping the original project, member and task
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

#### Scenario: Try saving again after a concurrent update
- **GIVEN** a manager submits an edit and the API returns `time_entry_concurrent_update`
- **WHEN** the editor shows the conflict message and refreshes the list
- **THEN** the draft stays available and the manager can try saving it again
