# Project Members List Specification

## Purpose

Define assigned member list behavior for project response objects across project list and single-project read endpoints.

## Requirements

### Requirement: Project Responses Include Assigned Members List

Every project response object MUST include a `members` array in both project list and single-project GET endpoints. For full-project scope, each member entry MUST represent one workspace member currently assigned to that project and MUST include at minimum `userId`, `displayName`, `email`, `avatarUrl`, and `role`.

The `members` array MUST be computed alongside project fields without additional per-project HTTP requests.

Projects with no assignments MUST return `members: []`, never `null`.

A requester with full project access MUST be able to read the assigned `members` array regardless of workspace role. Own-time access alone MUST return `members: []` and MUST NOT expose peer identities. The response accessScope SHALL distinguish redaction from an actual empty full-project list.

#### Scenario: Project with assignments returns members array
- **GIVEN** the requester has full project access, independently of own-time access
- **AND** a project has two workspace members assigned to it
- **WHEN** a requester with visibility to that project calls `GET /workspaces/:id/projects`
- **THEN** the project object includes a `members` array with two entries
- **AND** each entry contains `userId`, `displayName`, `email`, `avatarUrl`, and `role`

#### Scenario: Project with no assignments returns empty members array
- **GIVEN** the requester has full project access, independently of own-time access
- **AND** a project has no workspace members assigned to it
- **WHEN** a requester with visibility to that project calls `GET /workspaces/:id/projects`
- **THEN** the project object includes a `members` array that is empty (`[]`)

#### Scenario: Single-project GET also returns members array
- **GIVEN** the requester has full project access, independently of own-time access
- **AND** a project has one workspace member assigned to it
- **WHEN** a requester calls `GET /workspaces/:id/projects/:projectId`
- **THEN** the project object includes a `members` array with one entry containing correct member fields

#### Scenario: Non-admin requester sees members array for visible project
- **GIVEN** the requester has full project access, independently of own-time access
- **AND** a requester has role `pm` or `member` in the workspace
- **AND** the requester has visibility to a project (public or assigned)
- **WHEN** the requester calls `GET /workspaces/:id/projects`
- **THEN** each visible project object includes the full `members` array with `userId`, `displayName`, `email`, `avatarUrl`, and `role`

#### Scenario: Own-time access redacts assigned members
- **GIVEN** an external project has assigned members and the requester has only own-time access
- **WHEN** they read it through a list or detail endpoint
- **THEN** members is empty and accessScope is own-time without exposing the assignments

### Requirement: Project Responses Exclude Member Count Scalar

Project response objects MUST NOT include a `memberCount` numeric field. Full-project consumers requiring a count MUST derive it from `members.length`. Own-time consumers MUST hide the count and MUST NOT interpret the redacted empty array as zero assigned members.

#### Scenario: Project list response shape excludes memberCount

- **WHEN** a requester calls `GET /workspaces/:id/projects`
- **THEN** no project object in the response contains a `memberCount` field

#### Scenario: Single-project GET response shape excludes memberCount

- **WHEN** a requester calls `GET /workspaces/:id/projects/:projectId`
- **THEN** the response object does not contain a `memberCount` field

#### Scenario: Own-time rendering hides assigned-member count
- **GIVEN** a response has own-time scope and a redacted empty members array
- **WHEN** a consumer renders project metadata
- **THEN** it hides assigned-member count rather than rendering zero
