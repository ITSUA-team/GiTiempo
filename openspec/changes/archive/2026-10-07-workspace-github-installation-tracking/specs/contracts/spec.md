## MODIFIED Requirements

### Requirement: Shared Time Entry Request Validation
The shared contracts SHALL define validation rules for manual entry creation, entry updates including optional task reassignment, timer actions including optional timer-start descriptions, Chrome Extension timer starts, and list filters including task-title search.

#### Scenario: Manual create request uses shared schema
- **GIVEN** a client constructs a manual time-entry create request
- **WHEN** the request payload is validated
- **THEN** the payload requires a task identifier, start time, and end time
- **AND** rejects unknown additional fields

#### Scenario: Time entry update request uses shared schema
- **GIVEN** a client constructs a time-entry update request
- **WHEN** the request payload is validated
- **THEN** the payload accepts optional task identifier, start time, end time, description, and billable fields
- **AND** requires at least one mutable time-entry field
- **AND** rejects unknown additional fields

#### Scenario: Time entry update can change task only by identifier
- **GIVEN** a client constructs a time-entry update request that moves an entry to another task
- **WHEN** the request payload is validated
- **THEN** the payload accepts a valid `taskId`
- **AND** does not accept embedded task or project objects

#### Scenario: Timer start request uses shared schema
- **GIVEN** a client constructs a timer start request
- **WHEN** the request payload is validated
- **THEN** the payload requires a task identifier
- **AND** accepts an optional nullable `description` field
- **AND** rejects unknown additional fields

#### Scenario: Timer start description follows time-entry description limits
- **GIVEN** a client constructs a timer start request with `description`
- **WHEN** the request payload is validated
- **THEN** the shared schema accepts a string description within the time-entry description length limit or `null`
- **AND** rejects descriptions that exceed that limit

#### Scenario: Chrome GitHub start request uses shared schema
- **GIVEN** the Chrome Extension constructs a GitHub issue timer request
- **WHEN** the request payload is validated
- **THEN** the payload requires a GitHub repository key and positive integer issue number, accepts an optional GitHub Project identifier as a verification hint, and rejects client-supplied issue titles, project assignments, workspace credentials, or installation tokens
- **AND** rejects unknown additional fields

#### Scenario: Time entry list query uses shared schema
- **GIVEN** a client constructs a time-entry list query
- **WHEN** the query is validated
- **THEN** the query accepts shared pagination fields and time-entry filters
- **AND** accepts an optional task-title `search` filter
- **AND** rejects invalid filter values

## ADDED Requirements

### Requirement: Shared Installation Management Contracts Are Credential Free
Shared contracts SHALL define strict workspace installation setup, completion, status, re-verification, and disconnect shapes. Safe status responses SHALL contain association ID, stable organization ID and display login, installation ID, verification timestamp, lifecycle status, and safe recovery reason. Requests MUST NOT accept a client assertion of verified status or contain the App private key or installation tokens. The workspace MUST come from the authenticated context and setup state.

#### Scenario: Admin reads installation status
- **GIVEN** an authenticated workspace admin
- **WHEN** the backend returns installation associations
- **THEN** responses validate against shared schemas and contain only that workspace's safe association metadata
- **AND** no provider credential or unrelated workspace data is exposed

#### Scenario: Client tries to assert verification
- **GIVEN** a setup payload containing a forged verified status, workspace override, or token
- **WHEN** the payload is validated
- **THEN** it is rejected without activating an association

### Requirement: GitHub Tracking Errors Have Stable Codes
The API SHALL use the existing domain-error envelope with a stable `code` and safe `message` for installation-backed GitHub tracking failures. API DTOs, shared schemas, OpenAPI, user-web, and extension consumers SHALL agree on these codes. `project_assignment_required` MUST use HTTP 403 and the exact message from issue #420 without protected project metadata. Provider credential failures MUST NOT be returned as a GiTiempo-session HTTP 401.

#### Scenario: Assignment failure is distinguishable
- **GIVEN** the backend denies an otherwise eligible member for missing assignment
- **WHEN** a client validates the error response
- **THEN** it can identify `project_assignment_required` independently of installation or personal connection failures
- **AND** the response contains no protected project data

#### Scenario: Installation mapping and provider failures remain distinguishable
- **GIVEN** a rejected GitHub start
- **WHEN** the backend classifies the failure
- **THEN** the contract distinguishes `github_installation_required`, `github_installation_unavailable`, `github_installation_permissions_required`, `github_organization_not_allowed`, `github_resource_unavailable`, `github_project_mapping_required`, `github_project_mapping_ambiguous`, and `github_provider_unavailable`
- **AND** errors contain safe recovery copy without raw GitHub payloads or credentials

#### Scenario: Existing timer responses remain compatible
- **GIVEN** a successful GitHub start or owned-timer stop
- **WHEN** the client validates the response
- **THEN** it uses the existing time-entry response schema and stable issue linkage
- **AND** the new installation management metadata is not added to ordinary timer responses

### Requirement: Setup Responses Support Existing Installations
The shared setup response SHALL retain opaque `state`, `installationUrl`, and `expiresAt` fields and MAY include `existingInstallationId` as a positive decimal string of at most 30 digits. A discovered ID MUST NOT grant access without normal setup completion verification.

#### Scenario: Existing installation candidate is returned
- **GIVEN** App-authenticated discovery identifies the configured App installation for the selected stable organization
- **WHEN** setup returns its shared response
- **THEN** the client submits the candidate ID and opaque state to the completion endpoint
- **AND** no installation token or App credential is exposed

#### Scenario: Explicit setup has no existing installation candidate
- **GIVEN** an administrator explicitly starts setup for an allowed organization and discovery returns GitHub 404
- **WHEN** setup returns its shared response without `existingInstallationId`
- **THEN** the client uses `installationUrl` containing opaque setup state to open the configured App installation flow
- **AND** automatic background discovery does not navigate using that URL

### Requirement: Installation Completion Errors Explain Authority Recovery
Installation completion SHALL return HTTP 409 with `Reconnect GitHub, then retry installation verification` when successful provider lookups show that the exact installation is inaccessible to the administrator's user token. If installation access is confirmed but active owner authority or organization identity does not match, it SHALL return HTTP 403 with `GitHub organization owner authority is required`. These setup errors SHALL remain distinct from the stable timer-start domain error codes.

#### Scenario: Setup recovery does not alter timer error contracts
- **GIVEN** setup completion rejects installation access or owner authority
- **WHEN** the client receives the failure
- **THEN** it displays the corresponding safe setup message
- **AND** no new timer-start domain code or personal-connection requirement for tracking members is introduced
