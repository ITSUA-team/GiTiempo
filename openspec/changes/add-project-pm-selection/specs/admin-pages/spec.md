## MODIFIED Requirements

### Requirement: Administrative Management Pages

The members, projects, and settings pages MUST support the documented administrative management flows.

#### Scenario: Add Project form includes PM selector

- **WHEN** an admin opens the Add Project form
- **THEN** the form includes a Project manager dropdown populated with PM-role workspace members
- **AND** selecting a PM causes that member to be assigned to the project upon creation
- **AND** the PM field is optional — the form can be submitted without selecting a PM
