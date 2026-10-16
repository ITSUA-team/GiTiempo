## ADDED Requirements

### Requirement: Project Tracking Policy Is Persisted Independently
The system SHALL persist server-owned managed or external-reference tracking policy for each project. Existing projects MUST migrate to managed. New external-reference projects MUST remain private. Caller input, GitHub connection state, successful API verification, and later import MUST NOT implicitly change tracking policy.

#### Scenario: Existing projects retain policy
- **GIVEN** a workspace contains existing public, private, repository and board projects
- **WHEN** the feature migration runs
- **THEN** all existing projects retain their IDs, access, assignments and history under managed policy


#### Scenario: Reference materialization records policy
- **GIVEN** a reference start needs a new project
- **WHEN** it commits successfully
- **THEN** the project is private and explicitly external-reference without auto-assignment


### Requirement: Repository Reference Identity Is Case Insensitive Within Workspace
GitHub repository references MUST be unique by workspace, provider, repository type and case-insensitive owner/repository key. Issue references MUST retain equivalent workspace-wide issue-key uniqueness. Every writer including import and materialization SHALL observe the same constraint. Historical collisions MUST be reported before enforcing the migration rather than silently deleting or merging records.

#### Scenario: Case-only repository variants cannot duplicate
- **GIVEN** two writers use different casing for the same workspace repository
- **WHEN** they attempt to establish repository mappings
- **THEN** only one mapping wins and the other reuses the authoritative identity or receives a safe conflict


#### Scenario: Historical collision blocks destructive migration
- **GIVEN** preflight discovers multiple conflicting repository mappings
- **WHEN** the migration is prepared
- **THEN** it reports the conflicting records and requires explicit operational resolution without losing tasks or time history


### Requirement: Reference Provenance Is Distinct From Synchronization
Provider references SHALL distinguish user-supplied issue context from provider-verified metadata. A user-supplied reference MUST NOT receive a false synchronization timestamp or verified claim. Tracking MUST NOT persist a permanent participation or assignment record as a substitute for current own-time existence.

#### Scenario: Page context is stored as a reference
- **GIVEN** a first external start uses only browser context
- **WHEN** reference records are created
- **THEN** their provenance is user-supplied and synchronization time is not fabricated


#### Scenario: Last own entry removes derived visibility
- **GIVEN** the last own entry is removed under existing entry rules
- **WHEN** authorization is evaluated
- **THEN** no stale participation row preserves derived project/task access

## MODIFIED Requirements

### Requirement: Project Hour Totals Use Completed Time Entries

The backend MUST derive project response time totals from completed time entries linked through project tasks and expose those totals in seconds. Full-project responses SHALL aggregate all authorized project tasks as before. Own-time responses MUST include only the caller's completed entry durations. A running entry SHALL grant derived visibility but MUST NOT add duration before completion.

#### Scenario: Project total includes completed entries
- **GIVEN** the response uses full-project scope
- **AND** a project has tasks with completed time entries
- **WHEN** the backend derives the project total seconds
- **THEN** the total equals the sum of completed entry durations for those tasks expressed in seconds

#### Scenario: Project total excludes running entries
- **GIVEN** the response uses full-project scope
- **AND** a project has a running time entry without a duration
- **WHEN** the backend derives the project total seconds
- **THEN** that running entry does not increase the total

#### Scenario: Project with no completed entries has zero seconds
- **GIVEN** the response uses full-project scope
- **AND** a project has no completed time entries
- **WHEN** the backend derives the project total seconds
- **THEN** the total is zero

#### Scenario: Own-time totals exclude completed peer entries
- **GIVEN** a task has 600 completed seconds for the caller and 1200 for a colleague
- **AND** the caller has only own-time project access
- **WHEN** project total seconds are calculated
- **THEN** the returned total is 600 seconds

#### Scenario: First running entry grants visibility with zero completed total
- **GIVEN** the caller has only a running entry in the external project and no separate project grant
- **WHEN** they read the project
- **THEN** the project is visible with own-time scope and zero completed seconds
