## ADDED Requirements

### Requirement: Single Project Detail Includes Header Summary Fields

The system MUST return project detail summary fields from `GET /projects/:id` so the user Project page can render its header without per-row or per-section reconstruction calls.

#### Scenario: Visible project detail returns editable description

- **GIVEN** the requester can read a project through existing project visibility rules
- **WHEN** the requester calls `GET /projects/:id`
- **THEN** the response includes the project's `description`
- **AND** `description` is either a string or `null`

#### Scenario: Project detail returns provider summary

- **GIVEN** the requester can read a project through existing project visibility rules
- **WHEN** the requester calls `GET /projects/:id`
- **THEN** the response includes a `providerSummary`
- **AND** manual projects return `source: manual` with nullable provider detail fields set to `null`
- **AND** GitHub-linked projects return `source: github` with display-safe external reference detail when available

#### Scenario: Project detail returns tracked summary

- **GIVEN** the requester can read a project through existing project visibility rules
- **WHEN** the requester calls `GET /projects/:id`
- **THEN** the response includes `trackedSummary.totalSeconds` from completed time entries linked through project tasks
- **AND** the response includes `trackedSummary.billableSeconds` from completed billable time entries linked through project tasks
- **AND** running entries with no duration do not increase either total

#### Scenario: Project detail returns billable share

- **GIVEN** a readable project has completed tracked entries
- **WHEN** the requester calls `GET /projects/:id`
- **THEN** `trackedSummary.billableShare` equals billable seconds divided by total seconds
- **AND** projects with zero completed tracked seconds return `billableShare: null`

#### Scenario: Project detail returns last activity from tracked work

- **GIVEN** a readable project has completed tracked entries
- **WHEN** the requester calls `GET /projects/:id`
- **THEN** `trackedSummary.lastActivityAt` equals the latest `startedAt` among completed tracked entries for that project
- **AND** projects with no completed tracked entries return `lastActivityAt: null`

#### Scenario: Project detail returns assigned-member summary

- **GIVEN** the requester can read a project through existing project visibility rules
- **WHEN** the requester calls `GET /projects/:id`
- **THEN** the response includes `assignedMembersSummary.count` equal to the number of assigned users
- **AND** the response includes up to three assigned users in `assignedMembersSummary.previewMembers`
- **AND** the response includes `assignedMembersSummary.remainingCount` for assigned users not present in the preview
- **AND** the response does not introduce a dedicated PM owner field

### Requirement: Project Description Is Editable Metadata

The system MUST store project descriptions as editable provider-neutral project metadata.

#### Scenario: Project can be created with description

- **GIVEN** the requester has permission to create projects
- **WHEN** the requester creates a project with a valid `description`
- **THEN** the system stores the description on the project
- **AND** subsequent project reads return that description

#### Scenario: Project description can be updated

- **GIVEN** the requester has permission to update a project
- **WHEN** the requester updates the project with a valid `description`
- **THEN** the system stores the new description
- **AND** subsequent project reads return the updated description

#### Scenario: Project description can be cleared

- **GIVEN** the requester has permission to update a project
- **WHEN** the requester updates the project with `description: null`
- **THEN** the system clears the stored description
- **AND** subsequent project reads return `description: null`
