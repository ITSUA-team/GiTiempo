## ADDED Requirements

### Requirement: Project Responses Include Assigned Members List

The system SHALL include a `members` array in every project response object (both list and single-project GET endpoints). Each element in the array SHALL represent one workspace member currently assigned to that project and SHALL contain at minimum: `userId`, `displayName`, `email`, `avatarUrl`, and `role`.

The `members` array SHALL be computed without additional per-project HTTP requests (i.e., in a single query alongside other project fields).

When a project has no assignments the `members` array SHALL be an empty array (`[]`), never `null`.

The `members` array SHALL be returned to any requester who has visibility to that project, regardless of their workspace role (`admin`, `pm`, or `member`). No additional permission is required beyond project visibility to read the member list.

#### Scenario: Project with assignments returns members array

- **GIVEN** a project has two workspace members assigned to it
- **WHEN** a requester with visibility to that project calls `GET /workspaces/:id/projects`
- **THEN** the project object includes a `members` array with two entries
- **AND** each entry contains `userId`, `displayName`, `email`, `avatarUrl`, and `role`

#### Scenario: Project with no assignments returns empty members array

- **GIVEN** a project has no workspace members assigned to it
- **WHEN** a requester with visibility to that project calls `GET /workspaces/:id/projects`
- **THEN** the project object includes a `members` array that is empty (`[]`)

#### Scenario: Single-project GET also returns members array

- **GIVEN** a project has one workspace member assigned to it
- **WHEN** a requester calls `GET /workspaces/:id/projects/:projectId`
- **THEN** the project object includes a `members` array with one entry containing correct member fields

#### Scenario: Non-admin requester sees members array for visible project

- **GIVEN** a requester has role `pm` or `member` in the workspace
- **AND** the requester has visibility to a project (public or assigned)
- **WHEN** the requester calls `GET /workspaces/:id/projects`
- **THEN** each visible project object includes the full `members` array with `userId`, `displayName`, `email`, `avatarUrl`, and `role`

### Requirement: Project Responses No Longer Include memberCount Scalar

The system SHALL NOT include a `memberCount` numeric field in project response objects. Consumers requiring a count SHALL derive it from `members.length`.

#### Scenario: Project list response shape excludes memberCount

- **WHEN** a requester calls `GET /workspaces/:id/projects`
- **THEN** no project object in the response contains a `memberCount` field

#### Scenario: Single-project GET response shape excludes memberCount

- **WHEN** a requester calls `GET /workspaces/:id/projects/:projectId`
- **THEN** the response object does not contain a `memberCount` field
