## ADDED Requirements

### Requirement: Refresh Token Session Workspace Binding Is Persisted

The backend data model MUST persist a required workspace binding for each refresh-token session so refresh and switch-session rotation preserve the selected workspace context.

#### Scenario: Refresh-token session stores selected workspace context

- **GIVEN** a refresh-token session row is stored
- **WHEN** the row is represented in the backend data model
- **THEN** the row includes a non-null `workspace_id`
- **AND** `workspace_id` references an existing workspace
- **AND** the backend can index refresh-token sessions by `workspace_id`

#### Scenario: Existing refresh-token sessions are backfilled deterministically

- **GIVEN** existing refresh-token rows predate the `workspace_id` column
- **WHEN** the migration is applied
- **THEN** rows for users with a resolvable active membership are backfilled to that user's deterministic default workspace membership
- **AND** deterministic default membership is chosen by ascending `joined_at`, then ascending `workspace_id`

#### Scenario: Unresolvable legacy refresh-token sessions are removed before binding becomes required

- **GIVEN** an existing refresh-token row cannot be resolved to any active workspace membership
- **WHEN** the migration is applied
- **THEN** that refresh-token row is deleted before `workspace_id` becomes required
