## MODIFIED Requirements

### Requirement: External Provider References Are Stored Separately

The backend data model MUST store provider-specific project and task identity in external reference records. Uniqueness MUST compare external keys the way the provider treats identity, so a provider whose identifiers are case-insensitive cannot occupy two mappings for one object.

#### Scenario: Project external reference stores provider identity

- **GIVEN** a core project is linked to an external provider object
- **WHEN** the link is stored
- **THEN** the system stores provider, external type, external id when available, external key, URL, metadata, and sync timestamp outside the project row

#### Scenario: Task external reference stores provider identity

- **GIVEN** a core task is linked to an external provider work item
- **WHEN** the link is stored
- **THEN** the system stores provider, external type, external id when available, external key, URL, metadata, and sync timestamp outside the task row

#### Scenario: Provider lookup remains unique within workspace

- **GIVEN** two external reference records use the same workspace, provider, external type, and external key
- **WHEN** both records would point to different core records
- **THEN** the backend prevents duplicate provider mappings

#### Scenario: GitHub keys differing only by case are one mapping

- **GIVEN** a workspace already maps a GitHub repository to a project
- **WHEN** a second mapping is attempted for the same repository under different letter casing
- **THEN** the backend refuses it as a duplicate provider mapping
- **AND** the existing mapping is left untouched

#### Scenario: Case-sensitive providers keep exact matching

- **GIVEN** a provider whose identifiers are case-sensitive
- **WHEN** two of its external keys differ only by letter case
- **THEN** they remain two distinct mappings

## ADDED Requirements

### Requirement: Active Project Names Are Unique Within A Workspace

Two active projects in one workspace MUST NOT carry the same name, compared without regard to letter case. The constraint MUST be scoped to the workspace, so one workspace's names never restrict another. Disabled projects MUST NOT reserve a name.

#### Scenario: A second active project cannot reuse a name

- **GIVEN** an active project in a workspace
- **WHEN** another active project in that workspace would be stored with the same name in any letter casing
- **THEN** the backend refuses to store it

#### Scenario: Another workspace is unaffected

- **GIVEN** an active project in one workspace
- **WHEN** a different workspace stores an active project with that same name
- **THEN** it is stored

#### Scenario: Disabling a project releases its name

- **GIVEN** a project holding a name is disabled
- **WHEN** a new active project is stored with that name in the same workspace
- **THEN** it is stored
- **AND** the disabled project keeps its own name unchanged
