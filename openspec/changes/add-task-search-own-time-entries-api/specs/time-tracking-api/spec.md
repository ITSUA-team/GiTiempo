## MODIFIED Requirements

### Requirement: Own Time Entries Can Be Listed And Filtered
The backend MUST allow authenticated workspace members to list only their own time entries with shared pagination and time-entry filters, including task-title search.

#### Scenario: User lists own time entries
- **GIVEN** an authenticated workspace member has time entries
- **WHEN** the member lists time entries
- **THEN** the backend returns only entries owned by that member in the current workspace
- **AND** each entry includes core time-entry fields and task/project display context

#### Scenario: User filters own entries by started-at range
- **GIVEN** an authenticated workspace member has entries across multiple days
- **WHEN** the member supplies `dateFrom` and `dateTo`
- **THEN** the backend returns entries whose `startedAt` is greater than or equal to `dateFrom`
- **AND** whose `startedAt` is less than `dateTo`

#### Scenario: User filters own entries by project and task
- **GIVEN** an authenticated workspace member has entries across multiple tasks and projects
- **WHEN** the member supplies `projectId` or `taskId`
- **THEN** the backend returns only owned entries matching those filters

#### Scenario: User filters own entries by partial task title search
- **GIVEN** an authenticated workspace member has own time entries across tasks with different titles
- **WHEN** the member supplies `search` with part of a task title
- **THEN** the backend returns only owned entries whose task title contains that text
- **AND** the match is case-insensitive

#### Scenario: Own entry search composes with existing filters
- **GIVEN** an authenticated workspace member has own time entries across multiple dates, projects, and tasks
- **WHEN** the member supplies `search` together with date, project, or task filters
- **THEN** the backend returns only owned entries matching all supplied filters

#### Scenario: Own entry search updates pagination metadata
- **GIVEN** an authenticated workspace member has more own time entries than the requested page limit
- **WHEN** the member lists entries with `search`, `page`, and `limit`
- **THEN** the backend paginates the filtered result set
- **AND** the response metadata total and total pages reflect the filtered result set

#### Scenario: User cannot list another user's own-entry collection
- **GIVEN** an authenticated workspace member has no ownership of another user's entries
- **WHEN** the member lists own time entries
- **THEN** the backend excludes the other user's entries from the response

### Requirement: Project Time Entries Can Be Listed Read Only
The backend MUST allow authenticated users to list time entries for visible projects without allowing mutation of other users' entries, including task-title search within the visible project list.

#### Scenario: Admin lists project time entries
- **GIVEN** an authenticated admin belongs to the workspace
- **WHEN** the admin lists time entries for a project in that workspace
- **THEN** the backend returns entries for that project regardless of entry owner

#### Scenario: Non-admin lists active public project time entries
- **GIVEN** an authenticated PM or member belongs to the workspace
- **AND** the project is public and active
- **WHEN** the user lists time entries for that project
- **THEN** the backend returns entries for that project regardless of entry owner

#### Scenario: Assigned user lists active private project time entries
- **GIVEN** an authenticated PM or member is assigned to an active private project
- **WHEN** the user lists time entries for that project
- **THEN** the backend returns entries for that project regardless of entry owner

#### Scenario: User filters visible project time entries by partial task title search
- **GIVEN** an authenticated user can view a project's time entries
- **AND** the project has entries across tasks with different titles
- **WHEN** the user supplies `search` with part of a task title
- **THEN** the backend returns only project entries whose task title contains that text
- **AND** the match is case-insensitive
- **AND** project visibility rules remain unchanged

#### Scenario: Unassigned user cannot list private project time entries
- **GIVEN** an authenticated PM or member is not assigned to a private project
- **WHEN** the user attempts to list time entries for that project
- **THEN** the backend responds with 404 Not Found

#### Scenario: Project time-entry list is read only
- **GIVEN** an authenticated user can view another user's time entry through a project list
- **WHEN** the authenticated user attempts to update or delete that other user's entry through own-entry endpoints
- **THEN** the backend responds with 404 Not Found
