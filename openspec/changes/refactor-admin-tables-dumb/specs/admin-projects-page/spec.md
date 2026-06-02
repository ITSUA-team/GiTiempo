## ADDED Requirements

### Requirement: Projects Table Emits Archive Intents

The Projects page MUST keep project archive and unarchive API orchestration outside the Projects table rendering component while preserving the existing project-management user flows.

#### Scenario: Projects table archive action emits intent

- **GIVEN** the Projects table renders an active project row in either desktop table or mobile card layout
- **WHEN** the admin invokes the row's `Archive` action
- **THEN** the table emits an `archive` intent with the selected project
- **AND** the table itself does not open the confirmation dialog, call the project-update API, refresh loaded projects or summary stats, or show toast feedback

#### Scenario: Projects page handles confirmed archive

- **GIVEN** the Projects page receives an `archive` intent from the Projects table
- **WHEN** the page handles the intent
- **THEN** it opens the shared destructive confirmation dialog using the selected project's name
- **AND** confirming updates the project with `{ isActive: false }`, refreshes project rows and summary stats on success, and shows success toast feedback
- **AND** cancelling sends no project-update request
- **AND** archive API errors are surfaced through error toast feedback without removing or changing the row in loaded data

#### Scenario: Projects table unarchive action emits intent

- **GIVEN** the Projects table renders an archived project row in either desktop table or mobile card layout
- **WHEN** the admin invokes the row's `Unarchive` action
- **THEN** the table emits an `unarchive` intent with the selected project
- **AND** the table itself does not call the project-update API, refresh loaded projects or summary stats, or show toast feedback

#### Scenario: Projects page handles unarchive

- **GIVEN** the Projects page receives an `unarchive` intent from the Projects table
- **WHEN** the page handles the intent
- **THEN** it updates the project with `{ isActive: true }`, refreshes project rows and summary stats on success, and shows success toast feedback
- **AND** unarchive API errors are surfaced through error toast feedback without changing the row in loaded data

#### Scenario: Projects table remains presentational after archive refactor

- **WHEN** the Projects table is mounted for isolated component testing
- **THEN** it can render rows, filters, mobile cards, edit expansion, archive controls, and unarchive controls without providing admin API clients, auth stores, toast services, or confirmation services
- **AND** existing Edit, Archive, and Unarchive action labels, tooltips, row expansion behavior, active/archived action visibility, and filter behavior remain unchanged
