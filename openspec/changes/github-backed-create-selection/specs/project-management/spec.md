## ADDED Requirements

### Requirement: Project Creation Can Persist GitHub External References
The system SHALL create local projects from valid project create requests with optional GitHub provider-reference metadata and SHALL persist the local project and external reference atomically.

#### Scenario: Admin creates project from GitHub repository reference
- **GIVEN** the requester has permission to create projects
- **WHEN** the requester creates a project with valid fields and GitHub repository provider-reference metadata
- **THEN** the system SHALL create the project in the requester's workspace
- **AND** the system SHALL persist a project external reference for the GitHub repository in the same transaction
- **AND** subsequent project reads SHALL derive the project source as `github`

#### Scenario: PM creates project from GitHub Project V2 reference
- **GIVEN** the requester is a `pm` member of the workspace
- **WHEN** the requester creates a project with valid fields and GitHub Project V2 provider-reference metadata
- **THEN** the system SHALL create the project in the requester's workspace
- **AND** the system SHALL assign the requester to the created project
- **AND** the system SHALL persist a project external reference for the GitHub Project V2 project in the same transaction

#### Scenario: Manual project creation remains provider-neutral
- **GIVEN** the requester has permission to create projects
- **WHEN** the requester creates a project without provider-reference metadata
- **THEN** the system SHALL create the project without a provider external reference
- **AND** subsequent project reads SHALL derive the project source as `manual`

#### Scenario: Duplicate GitHub project reference is rejected atomically
- **GIVEN** a project external reference already exists for a GitHub repository or Project V2 project in the workspace
- **WHEN** a requester attempts to create another project with the same provider, external type, and external key
- **THEN** the system SHALL reject the create request with a conflict response
- **AND** the system SHALL NOT leave behind an unlinked local project from the failed request

#### Scenario: Project create validates permissions before storing GitHub reference
- **GIVEN** the requester does not have permission to create projects
- **WHEN** the requester attempts to create a project with GitHub provider-reference metadata
- **THEN** the system SHALL reject the request under the existing project create authorization policy
- **AND** the system SHALL NOT store a project external reference
