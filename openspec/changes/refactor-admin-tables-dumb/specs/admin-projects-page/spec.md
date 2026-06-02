## ADDED Requirements

### Requirement: Projects Table Emits Archive Intents

The Projects page MUST keep project archive and unarchive API orchestration outside the Projects table rendering component while preserving the existing project-management user flows.

### Requirement: Projects Table Is A Dumb Presentational Table

The Projects table rendering component MUST NOT own project filtering, filtered-row derivation, expansion state, or project settings form rendering.

#### Scenario: Projects page owns table view model

- **GIVEN** the Projects page has loaded projects and workspace member data
- **WHEN** the page renders the Projects table
- **THEN** the page or a focused page composable derives the visible project table rows, filter options, empty-state copy, and expanded rows
- **AND** the Projects table receives those values as props and emits updates or row intents without storing or deriving them internally

#### Scenario: Projects table forwards presentational intents

- **GIVEN** the Projects table renders prepared desktop rows or mobile cards
- **WHEN** the admin changes a search/filter control or invokes Edit, Archive, or Unarchive
- **THEN** the table emits the corresponding filter update or row intent with the selected project
- **AND** the table itself does not filter projects, toggle expansion, collapse rows, render project settings forms, call APIs, show toasts, or open confirmations

#### Scenario: Projects expansion form emits save payload

- **GIVEN** the Projects page renders project settings expansion content
- **WHEN** the admin submits visibility or assigned-member changes
- **THEN** the expansion form emits a typed save payload
- **AND** the Projects page or focused composable performs auth checks, project update, assignment add/remove calls, success/error toast feedback, summary/row refresh, and row collapse
- **AND** the expansion form itself does not import admin API clients, auth stores, toast helpers, or confirmation helpers

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
- **THEN** it can render supplied rows, filters, mobile cards, row-expansion slots, archive controls, and unarchive controls without providing admin API clients, auth stores, toast services, confirmation services, workspace member derivation, or project settings form components
- **AND** existing Edit, Archive, and Unarchive action labels, tooltips, row expansion behavior, active/archived action visibility, and filter behavior remain unchanged from the user's perspective
