# Project Management Specification

## Purpose

Define project visibility, creation, update, and assignment behavior for workspace-scoped provider-neutral projects.

## Requirements

### Requirement: Project Visibility Is Role And Assignment Scoped

The system MUST enforce project visibility from workspace membership, project visibility, and project assignments.

#### Scenario: Admin lists all projects

- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester lists projects
- **THEN** the system returns active and inactive projects in that workspace
- **AND** the result includes both public and private projects

#### Scenario: Non-admin lists active public and assigned projects

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **WHEN** the requester lists projects
- **THEN** the system returns active public projects in that workspace
- **AND** the system returns active private projects assigned to that requester
- **AND** projects matching both public and assigned scope are returned once

#### Scenario: Non-admin can read active public project

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the project is active and public
- **WHEN** the requester reads that project by id
- **THEN** the system returns the project

#### Scenario: Non-admin can read assigned private project

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the requester is assigned to an active private project
- **WHEN** the requester reads that project by id
- **THEN** the system returns the project

#### Scenario: Non-admin cannot read unassigned private project

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the requester is not assigned to a private project
- **WHEN** the requester reads that project by id
- **THEN** the system responds with 404 Not Found

#### Scenario: Non-admin cannot read inactive project

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the project is inactive
- **WHEN** the requester reads that project by id
- **THEN** the system responds with 404 Not Found

### Requirement: Project Summaries Are Scope Aware

The system MUST expose project summary data using the requester's project visibility scope.

#### Scenario: Admin reads management project summary

- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester calls `GET /projects/management-summary`
- **THEN** `activeProjects` equals the number of active projects in the workspace
- **AND** `privateProjects` equals the number of active private projects in the workspace
- **AND** `publicProjects` equals the number of active public projects in the workspace

#### Scenario: PM reads management project summary

- **GIVEN** the requester is a `pm` member of the workspace
- **WHEN** the requester calls `GET /projects/management-summary`
- **THEN** the counts include active public projects and active assigned projects visible to that PM
- **AND** projects matching both public and assigned scope are counted once
- **AND** inactive projects are excluded

#### Scenario: User reads project summary

- **GIVEN** the requester is an active workspace member
- **WHEN** the requester calls `GET /projects/my-summary`
- **THEN** `visibleProjects` equals the number of active projects visible to the requester
- **AND** `trackedHoursWeek` equals the requester's own completed tracked hours in the current calendar week
- **AND** `trackedHoursMonth` equals the requester's own completed tracked hours in the current calendar month

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

### Requirement: Admin And PM Can Create Projects

The system MUST allow admins and project managers to create provider-neutral projects.

#### Scenario: Admin creates project

- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester creates a project with valid project fields
- **THEN** the system creates the project in the requester's workspace
- **AND** the admin does not require a project assignment row for access

#### Scenario: PM creates project and is assigned

- **GIVEN** the requester is a `pm` member of the workspace
- **WHEN** the requester creates a project with valid project fields
- **THEN** the system creates the project in the requester's workspace
- **AND** the system assigns the requester to the created project

#### Scenario: Member cannot create project

- **GIVEN** the requester is a `member` in the workspace
- **WHEN** the requester attempts to create a project
- **THEN** the system responds with 403 Forbidden

### Requirement: Project Updates Follow Role And Visibility Policy

The system MUST restrict project updates by role, project visibility, and project active state.

#### Scenario: Admin updates any project

- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester updates an active or inactive project in that workspace
- **THEN** the system applies the valid mutable project fields

#### Scenario: PM updates visible active project metadata

- **GIVEN** the requester is a `pm` member of the workspace
- **AND** the requester can see an active project through public visibility or assignment
- **WHEN** the requester updates that project's mutable metadata
- **THEN** the system applies the valid mutable project fields except active state

#### Scenario: PM cannot change project active state

- **GIVEN** the requester is a `pm` member of the workspace
- **AND** the requester can see an active project through public visibility or assignment
- **WHEN** the requester attempts to change the project's active state
- **THEN** the system responds with 403 Forbidden

#### Scenario: PM cannot update unassigned private project

- **GIVEN** the requester is a `pm` member of the workspace
- **AND** the requester is not assigned to a private project
- **WHEN** the requester attempts to update that project
- **THEN** the system responds with 404 Not Found

#### Scenario: PM cannot update inactive project

- **GIVEN** the requester is a `pm` member of the workspace
- **AND** the project is inactive
- **WHEN** the requester attempts to update that project
- **THEN** the system responds with 404 Not Found

#### Scenario: Member cannot update project

- **GIVEN** the requester is a `member` with visibility to a project
- **WHEN** the requester attempts to update that project
- **THEN** the system responds with 403 Forbidden

### Requirement: Admin Manages Project Assignments

The system MUST allow admins to list, create, and remove project assignments for `pm` and `member` workspace users.

#### Scenario: Admin lists project assignments

- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester lists assignments for a project in that workspace
- **THEN** the system returns the assigned users for that project

#### Scenario: Admin assigns PM or member to project

- **GIVEN** the requester is an admin member of the workspace
- **AND** the target user is an active workspace member with role `pm` or `member`
- **WHEN** the requester assigns the target user to a project
- **THEN** the target user gains visibility to that active project

#### Scenario: Admin cannot assign another admin

- **GIVEN** the requester is an admin member of the workspace
- **AND** the target user has role `admin`
- **WHEN** the requester attempts to assign the target user to a project
- **THEN** the system responds with 422 Unprocessable Entity

#### Scenario: Non-admin cannot manage assignments

- **GIVEN** the requester is authenticated but not an admin member of the workspace
- **WHEN** the requester attempts to list, create, or remove project assignments
- **THEN** the system responds with 403 Forbidden

#### Scenario: Assignment survives PM member role changes

- **GIVEN** a user is assigned to a project
- **WHEN** the user's workspace role changes between `pm` and `member`
- **THEN** the assignment remains stored
- **AND** the user's role controls allowed actions while the assignment controls project visibility

### Requirement: Project Time Entry Visibility Follows Project Visibility

The system MUST use project visibility rules when exposing project-scoped time-entry lists.

#### Scenario: Admin reads time entries for any workspace project

- **GIVEN** the requester is an admin member of the workspace
- **WHEN** the requester lists time entries for a project in that workspace
- **THEN** the system returns time entries for that project

#### Scenario: Assigned non-admin reads active project time entries

- **GIVEN** the requester is a `pm` or `member` assigned to an active private project
- **WHEN** the requester lists time entries for that project
- **THEN** the system returns time entries for that project

#### Scenario: Non-admin reads active public project time entries

- **GIVEN** the requester is a `pm` or `member` in the workspace
- **AND** the project is active and public
- **WHEN** the requester lists time entries for that project
- **THEN** the system returns time entries for that project

#### Scenario: Unassigned non-admin cannot read private project time entries

- **GIVEN** the requester is a `pm` or `member` not assigned to a private project
- **WHEN** the requester attempts to list time entries for that project
- **THEN** the system responds with 404 Not Found

#### Scenario: Project time entry visibility does not grant mutation rights

- **GIVEN** the requester can view another user's time entry through project visibility
- **WHEN** the requester attempts to update or delete that other user's entry
- **THEN** the system still enforces own-entry mutation rules
