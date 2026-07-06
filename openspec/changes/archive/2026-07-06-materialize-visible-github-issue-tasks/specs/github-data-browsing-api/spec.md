## MODIFIED Requirements

### Requirement: GitHub Repository Issues Can Be Listed

The system SHALL allow connected users to list GitHub issues for a repository visible to the connected GitHub account, including the canonical repository mapped to a visible local GitHub-backed project.

#### Scenario: User lists repository issues through a visible GitHub-backed project
- **GIVEN** an authenticated user can see an active local project whose canonical external mapping points to a GitHub repository
- **WHEN** the user requests repository issues through that local project scope
- **THEN** the system resolves the mapped repository from the local project
- **AND** it returns normalized issue items for that repository
- **AND** the response includes unified page-token pagination metadata

#### Scenario: Local project issue browsing rejects non-GitHub project scope
- **GIVEN** an authenticated user requests repository issues through a visible local project
- **AND** that project has no canonical GitHub repository mapping
- **WHEN** the system evaluates the request
- **THEN** the system rejects the request without returning repository issue data

### Requirement: GitHub Browsing Is Read Only

The system SHALL keep GitHub browsing separate from local GiTiempo project, task, and timer mutation behavior, even when browsing occurs through a visible local GitHub-backed project.

#### Scenario: Project-scoped GitHub browsing stays read only
- **GIVEN** a connected user lists repository issues through a visible local GitHub-backed project
- **WHEN** the system returns the browsing response
- **THEN** the system MUST NOT create local projects
- **AND** the system MUST NOT create local tasks
- **AND** the system MUST NOT start, stop, or update timers
- **AND** later local task creation requires a separate explicit mutation request
