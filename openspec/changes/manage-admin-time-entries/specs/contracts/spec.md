## ADDED Requirements

### Requirement: Management project and picker contracts
Management lookups SHALL return only choices within the caller's current workspace and management scope. Clients SHALL be able to distinguish historical entry owners for filtering from eligible owners and destination tasks for creation.

#### Scenario: Project selection and member filtering
- **GIVEN** a caller can manage a project with records by a former member
- **WHEN** the client lists management projects and requests the project's filter members
- **THEN** the project option includes its ID, name and active state and the filter includes that historical owner
- **AND** lookup pagination totals cover only authorized choices

#### Scenario: Owner and task options respect current eligibility
- **GIVEN** an authorized manager is creating an entry in the selected project
- **WHEN** the client loads create-member options and then task options for a selected owner
- **THEN** the former member is absent from the create choices and the task options contain only currently trackable tasks for that owner in that project
- **AND** each task option includes its ID, title and default billable value

#### Scenario: Task selection before owner selection
- **WHEN** the client requests project task options without `userId`
- **THEN** each active, non-closed task trackable by at least one current workspace member appears once across the paginated result
- **WHEN** the client supplies one of those task IDs to the create-member lookup
- **THEN** its items and total include only distinct current members eligible for that task

#### Scenario: Check assignment independently of task availability
- **WHEN** the client requests task options with `userId`
- **THEN** the response identifies whether that current workspace member has an explicit assignment to the requested project, including when the task list is empty
- **AND** implicit tracking access alone does not count as an assignment

### Requirement: Managed entry list and write contracts
The managed list SHALL return the shared time-entry items and pagination metadata. Managed creation SHALL accept the completed manual-entry fields and a required owner identifier. A patch SHALL accept only mutable entry fields. The path SHALL identify the project and the session SHALL identify the workspace.

#### Scenario: Filters compose within one project
- **GIVEN** entries from multiple owners and dates
- **WHEN** a client supplies `userId`, literal case-insensitive task-title `search`, `dateFrom`, `dateTo`, `page` and `limit`
- **THEN** the returned items and totals use the same filters, including the lower started-at boundary and excluding the upper boundary

#### Scenario: Manager creates a completed entry
- **GIVEN** an eligible owner and task
- **WHEN** a valid create body supplies `userId`, `taskId`, `startedAt`, `endedAt`, and optionally `description` and `isBillable`
- **THEN** the API returns 201 with the created time-entry representation for that owner, its calculated duration and manual source
- **AND** omitting the billable flag uses the task default

#### Scenario: Mutation contract keeps ownership fixed
- **GIVEN** an editable entry
- **WHEN** a client patches a nonempty subset of task, start, end, description and billable fields
- **THEN** a successful patch returns 200 with the updated entry and a successful subsequent delete returns 204 with no body
- **AND** a patch containing owner, project, workspace, invoice, or other undeclared fields fails validation without changing the entry

### Requirement: Managed entry conflict responses
Management mutations blocked by record state SHALL return HTTP 409 using the standard error envelope with a stable code and explanatory message.

#### Scenario: Client distinguishes both lock reasons
- **GIVEN** an authorized manager issues a patch or delete
- **WHEN** the entry is running
- **THEN** the response includes `code: time_entry_running` and instructs the caller to stop the timer first
- **WHEN** the completed entry has an invoice link
- **THEN** the response includes `code: time_entry_invoiced` and explains that the entry is included in an invoice
