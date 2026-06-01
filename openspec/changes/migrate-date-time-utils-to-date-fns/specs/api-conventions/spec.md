## ADDED Requirements

### Requirement: Shared Backend Date-Time Leaves Preserve API Calendar Semantics

The backend codebase SHALL centralize repeated API UTC date, calendar-boundary, and date-window helper logic in a backend-owned utility leaf when the same behavior is used by multiple API services.

#### Scenario: Repeated backend date-time helpers use one backend owner

- **WHEN** backend services need the same UTC day, UTC ISO-week, UTC month, or next-UTC-month boundary behavior
- **THEN** those services SHALL consume one backend helper implementation instead of maintaining parallel local date arithmetic
- **AND** the helper SHALL live inside `apps/api` rather than in browser-only frontend packages.

#### Scenario: Backend utility extraction preserves report date defaults

- **WHEN** report services resolve omitted `dateFrom` or `dateTo` filters
- **THEN** the default `dateFrom` SHALL remain the start of the current UTC calendar month
- **AND** the default `dateTo` SHALL remain the start of the next UTC calendar month
- **AND** report started-at filtering SHALL preserve the existing closed-open date window semantics.

#### Scenario: Backend utility extraction preserves project summary windows

- **WHEN** project services calculate weekly or monthly tracked-hour summaries
- **THEN** the weekly window SHALL still start at Monday 00:00:00 UTC of the current ISO week
- **AND** the monthly window SHALL still start at 00:00:00 UTC on the first day of the current calendar month.

#### Scenario: Backend date-time helpers do not change public contracts

- **WHEN** backend date-time helper logic is centralized
- **THEN** API request shapes, response shapes, generated OpenAPI endpoint paths, database schema, seed data, auth behavior, and permission behavior SHALL remain unchanged
- **AND** any OpenAPI diff SHALL be limited to already-planned behavior changes outside this utility migration.
