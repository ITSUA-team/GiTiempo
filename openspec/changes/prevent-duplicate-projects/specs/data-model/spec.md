## MODIFIED Requirements

### Requirement: External Provider References Are Stored Separately

The backend data model MUST store provider-specific project and task identity in external reference records. Uniqueness MUST compare external keys without regard to letter case, and project mappings and task mappings MUST follow the same rule, so one external object cannot occupy two mappings under two spellings. The stored key MUST keep the casing the provider reports.

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

#### Scenario: Keys differing only by case are one mapping

- **GIVEN** a workspace already maps a repository to a project
- **WHEN** a second mapping is attempted for the same repository under different letter casing
- **THEN** the backend refuses it as a duplicate provider mapping
- **AND** the existing mapping is left untouched

#### Scenario: Project mappings and task mappings agree on identity

- **GIVEN** task mappings treat two keys differing only by letter case as one object
- **WHEN** the same two keys are used for project mappings
- **THEN** they are treated as one object there as well

#### Scenario: The stored key keeps the provider's casing

- **GIVEN** a provider reports an external key containing uppercase letters
- **WHEN** the mapping is stored
- **THEN** the stored key keeps that casing
- **AND** only the uniqueness comparison ignores it

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
