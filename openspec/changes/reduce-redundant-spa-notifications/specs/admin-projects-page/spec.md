# Spec Delta

## MODIFIED Requirements

### Requirement: Admin Can Inline-Edit Project Via Row Expansion

The admin Projects page MUST allow editing a project's visibility and member assignments through an inline expanded row form.

#### Scenario: Edit form saves project changes

- **WHEN** the admin edits an active project row
- **THEN** the row expands with current visibility and members pre-filled
- **AND** saving visibility calls `PATCH /projects/:id`
- **AND** saving member changes creates and removes assignment records for the changed members
- **AND** the page refreshes project rows and summary stats after save

#### Scenario: Projects expansion form emits save payload

- **GIVEN** the Projects page renders project settings expansion content
- **WHEN** the admin submits visibility or assigned-member changes
- **THEN** the expansion form emits a typed save payload
- **AND** the Projects page or focused composable performs auth checks, project update, assignment add/remove calls, actionable error toast feedback, summary/row refresh, and row collapse without redundant success/info notifications
- **AND** the expansion form itself does not import admin API clients, auth stores, toast helpers, or confirmation helpers

### Requirement: Project Settings Expansion Emits Archive Intents

The Projects page MUST keep project archive and unarchive API orchestration outside the Projects table and project settings rendering components while preserving the documented inline-settings action placement.

#### Scenario: Project settings archive action emits intent

- **GIVEN** the Projects page renders inline project settings for an active project
- **WHEN** the admin invokes the settings section's `Archive project` action
- **THEN** the page-owned settings content emits an `archive` intent with the selected project
- **AND** the Projects table itself does not expose row-level archive controls, open the confirmation dialog, call the project-update API, refresh loaded projects or summary stats, or show toast feedback

#### Scenario: Projects page handles confirmed archive

- **GIVEN** the Projects page receives an `archive` intent from the page-owned inline settings content
- **WHEN** the page handles the intent
- **THEN** it opens the shared destructive confirmation dialog using the selected project's name
- **AND** confirming updates the project with `{ isActive: false }`, refreshes project rows and summary stats on success without a redundant success/info notification
- **AND** cancelling sends no project-update request
- **AND** archive API errors are surfaced through error toast feedback without removing or changing the row in loaded data

#### Scenario: Project settings unarchive action emits intent

- **GIVEN** the Projects page renders inline project settings for an archived project
- **WHEN** the admin invokes the settings section's `Unarchive project` action
- **THEN** the page-owned settings content emits an `unarchive` intent with the selected project
- **AND** the Projects table itself does not expose row-level unarchive controls, call the project-update API, refresh loaded projects or summary stats, or show toast feedback

#### Scenario: Projects page handles unarchive

- **GIVEN** the Projects page receives an `unarchive` intent from the page-owned inline settings content
- **WHEN** the page handles the intent
- **THEN** it updates the project with `{ isActive: true }`, refreshes project rows and summary stats on success without a redundant success/info notification
- **AND** unarchive API errors are surfaced through error toast feedback without changing the row in loaded data

#### Scenario: Unarchive explains an automatic rename

- **GIVEN** another active project already holds the archived project's original name
- **WHEN** unarchive succeeds with a different authoritative name
- **THEN** the refreshed project displays its resulting name
- **AND** retained feedback explains the rename and its cause
