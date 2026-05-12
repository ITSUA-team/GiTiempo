# Project Members List Specification

## Purpose

Define assigned member list behavior for project response objects across project list and single-project read endpoints.

## Requirements

### Requirement: Project Responses Include Assigned Members List

Every project response object MUST include a `members` array in both project list and single-project GET endpoints. Each member entry MUST represent one workspace member currently assigned to that project and MUST include at minimum `userId`, `displayName`, `email`, `avatarUrl`, and `role`.

The `members` array MUST be computed alongside project fields without additional per-project HTTP requests.

Projects with no assignments MUST return `members: []`, never `null`.

Any requester with visibility to a project MUST be able to read that project's `members` array regardless of workspace role. No permission beyond project visibility is required to read the member list.

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

### Requirement: Project Responses Exclude Member Count Scalar

Project response objects MUST NOT include a `memberCount` numeric field. Consumers requiring a count MUST derive it from `members.length`.

#### Scenario: Project list response shape excludes memberCount

- **WHEN** a requester calls `GET /workspaces/:id/projects`
- **THEN** no project object in the response contains a `memberCount` field

#### Scenario: Single-project GET response shape excludes memberCount

- **WHEN** a requester calls `GET /workspaces/:id/projects/:projectId`
- **THEN** the response object does not contain a `memberCount` field
