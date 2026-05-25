## MODIFIED Requirements

### Requirement: User Dashboard Overview
The user dashboard SHALL provide an authenticated overview page focused on weekly insight, recent entries, and optional summary stats, while relying on the global top-bar timer for timer controls.

#### Scenario: Dashboard overview uses UTC calendar windows for own-entry summaries
- **WHEN** the dashboard loads the current-week own time entries used for overview summaries
- **THEN** the list request sends `dateFrom` as the current UTC ISO week start converted to ISO
- **AND** it sends `dateTo` as the next UTC ISO week start converted to ISO
- **AND** the dashboard's Today and This Week summaries compare entry timestamps against UTC day and UTC ISO-week boundaries
- **AND** moving the implementation to `date-fns` and `@date-fns/utc` preserves those UTC calendar semantics

### Requirement: Time Entries Page Record Management
The Time Entries page MUST allow authenticated users to review, filter, create, edit, and delete their own time entries while keeping manual completed-entry creation out of the global top-bar timer surface.

#### Scenario: Time Entries date filters use UTC inclusive-start exclusive-end boundaries
- **GIVEN** the user is viewing their own time entries
- **WHEN** the user applies a date range filter
- **THEN** the page requests `GET /time-entries` with `dateFrom` set to the selected start date's UTC day start converted to ISO
- **AND** it sets `dateTo` to the next UTC day start after the selected end date converted to ISO
- **AND** backend filtering remains responsible for returning entries with `startedAt` greater than or equal to `dateFrom` and less than `dateTo`

#### Scenario: Time Entries day labels use UTC calendar comparisons
- **GIVEN** own time entries are grouped by UTC date keys
- **WHEN** the page renders Today or Yesterday day labels
- **THEN** it compares the group key against the current UTC day and previous UTC day
- **AND** moving the implementation to `date-fns` and `@date-fns/utc` does not switch those labels to browser-local day comparisons
