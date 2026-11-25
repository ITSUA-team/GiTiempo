## ADDED Requirements

### Requirement: Project time management scope
The backend SHALL authorize every management request against current active workspace membership. An Admin can manage every project in that workspace. A PM can manage only explicitly assigned projects, regardless of visibility or invoice-view permission. These grants cover entries belonging to any owner in the authorized project.

#### Scenario: Manager works across owners
- **GIVEN** an Admin in the current workspace or a PM explicitly assigned to the selected project
- **WHEN** they list entries, create a completed entry for an eligible colleague, or edit or delete that colleague's completed unlinked entry
- **THEN** each operation succeeds within the selected project, including for a PM without invoice-view permission

#### Scenario: Public visibility and former assignments confer no management grant
- **GIVEN** a PM has no current assignment to a public project, including after removal of an earlier assignment
- **WHEN** they open project selection or directly request entries, create-form choices or a mutation for that project
- **THEN** selection omits it and targeted requests return 404 without revealing entries, choices or lock reasons

#### Scenario: Direct requests cannot cross workspace or project boundaries
- **GIVEN** a manager can access project A
- **WHEN** they request a project from a different workspace, address an entry from project B under project A, or submit a write in A with a destination task from B
- **THEN** the request returns 404 and neither project's records change
- **WHEN** they request create-member choices in A with a task filter from B
- **THEN** the lookup returns an empty page

#### Scenario: Ordinary member cannot manage entries
- **GIVEN** an authenticated workspace member with no Admin or PM role
- **WHEN** they call any management operation, including for a project where they track time
- **THEN** the backend returns 403

### Requirement: Project time management list
The backend SHALL return individual entries, including running and invoiced entries, for one manageable project. Search, member and started-at date filters SHALL compose before pagination, and the returned total SHALL count only matching entries.

#### Scenario: Combined filters exclude another project
- **GIVEN** two manageable projects contain matching task titles and time from the same member
- **WHEN** a manager requests one project's entries with a literal, case-insensitive partial task-title search, owner and date range
- **THEN** only matching entries in that project contribute to the page and total

#### Scenario: Historical filter choices and current creation choices
- **GIVEN** a manageable project has a former member with recorded time and a current member eligible for an active open task
- **WHEN** a manager opens the member filter, then requests creation choices
- **THEN** the filter includes the historical owner, while creation offers only current members and tasks that form at least one eligible pair

#### Scenario: Project assignment grants access to all trackable project tasks
- **GIVEN** a current workspace member is explicitly assigned to an active private project with several active, non-closed tasks, including one they have never tracked and one assigned to someone else
- **WHEN** an authorized manager lists task options for that member or creates a valid completed entry for them on any of those tasks
- **THEN** every such task is selectable and creation succeeds irrespective of task assignee or tracking history
- **AND** closed and inactive tasks remain unavailable for creation

### Requirement: Administrative creation and historical correction
The backend SHALL create completed manual entries for the selected owner using that person's current tracking access to the destination task. An edit SHALL preserve owner and project. A move to another task in the same project SHALL repeat the owner's eligibility check. Changes to the interval SHALL preserve a positive duration calculated from the resulting endpoints.

#### Scenario: Eligible owner differs from the acting manager
- **GIVEN** an active workspace member can track an open active task in an active public project without assignment
- **WHEN** an authorized manager creates an entry for that member on that task
- **THEN** the completed entry belongs to the selected member and its interval determines its duration

#### Scenario: Ineligible owner or work is rejected
- **GIVEN** the owner lacks current membership or access, or the selected destination task is closed or inactive or its project archived
- **WHEN** a manager creates an entry or moves one to that task
- **THEN** the backend rejects the ineligible combination with 422 without recording or moving time

#### Scenario: External own-time access applies to the exact task
- **GIVEN** an active owner only has own-time access to one active open task in a private external project
- **WHEN** an authorized manager creates time for that owner
- **THEN** creation is permitted for that exact task and denied for a sibling task the owner cannot track

#### Scenario: In-place corrections survive changes in tracking eligibility
- **GIVEN** a manager retains scope and a completed unlinked entry's project was archived, its task closed, or its owner lost access
- **WHEN** the manager corrects the interval, description or billable flag without moving the entry, or deletes it
- **THEN** the operation succeeds without requiring renewed tracking access

### Requirement: Administrative write protection for running and invoiced entries
Management edits and deletions SHALL check record state at the time of mutation. A running or invoice-linked entry SHALL remain visible, and a rejected request SHALL leave its fields and links intact. These rules apply to the management operations.

#### Scenario: Timer must be stopped before any management change
- **GIVEN** an entry is running
- **WHEN** a manager attempts any edit, including description alone, or deletes it
- **THEN** the backend returns 409 with code `time_entry_running` and an instruction to stop its timer first

#### Scenario: Invoice linkage protects every status
- **GIVEN** an entry is linked to a draft, sent or paid invoice
- **WHEN** a manager attempts to edit or delete it
- **THEN** the backend returns 409 with code `time_entry_invoiced` and explains that the entry is included in an invoice

#### Scenario: Invoice attachment wins a race with an administrative mutation
- **GIVEN** a manager viewed an editable entry and another request links it to an invoice before the manager's mutation takes effect
- **WHEN** the manager submits an edit or deletion using that earlier view
- **THEN** the backend returns the invoice conflict and preserves the linked entry and invoice

#### Scenario: Personal access remains independent
- **GIVEN** a caller has an active personal timer and can read a colleague's time through the project team list
- **WHEN** the caller uses the personal update endpoint
- **THEN** the caller can update their running timer's description under the personal rules and cannot update the colleague's entry through that endpoint
