## ADDED Requirements

### Requirement: Members Table Emits Removal Intent

The Members page MUST keep member-removal API orchestration outside the Members table rendering component while preserving the existing remove-member user flow.

### Requirement: Members Table Is A Dumb Presentational Table

The Members table rendering component MUST NOT own member filtering, filtered-row derivation, expansion state, expansion-mode state, or edit/assignment form rendering.

#### Scenario: Members page owns table view model

- **GIVEN** the Members page has loaded members and project membership data
- **WHEN** the page renders the Members table
- **THEN** the page or a focused page composable derives the visible member table rows, filter options, empty-state copy, expanded rows, and expansion mode
- **AND** the Members table receives those values as props and emits updates or row intents without storing or deriving them internally

#### Scenario: Members table forwards presentational intents

- **GIVEN** the Members table renders prepared desktop rows or mobile cards
- **WHEN** the admin changes a search/filter control or invokes Assign PM, Edit, or Remove
- **THEN** the table emits the corresponding filter update or row intent with the selected member
- **AND** the table itself does not filter members, toggle expansion, collapse rows, render edit/assignment forms, call APIs, show toasts, or open confirmations

#### Scenario: Members expansion forms emit save payloads

- **GIVEN** the Members page renders member assignment or role edit expansion content
- **WHEN** the admin submits assignment or role changes
- **THEN** the expansion form emits a typed save payload
- **AND** the Members page or focused composable performs auth checks, member/project API calls, success/error toast feedback, member refresh, and row collapse
- **AND** the expansion form itself does not import admin API clients, auth stores, toast helpers, or confirmation helpers

#### Scenario: Members table remove action emits intent

- **GIVEN** the Members table renders a member row in either desktop table or mobile card layout
- **WHEN** the admin invokes the row's `Remove` action
- **THEN** the table emits a `remove-member` intent with the selected member
- **AND** the table itself does not open the confirmation dialog, call the member-remove API, refresh loaded members, or show toast feedback

#### Scenario: Members page handles confirmed removal

- **GIVEN** the Members page receives a `remove-member` intent from the Members table
- **WHEN** the page handles the intent
- **THEN** it opens the shared destructive confirmation dialog using the selected member's display name or email
- **AND** confirming issues the member-remove request, refreshes the member list on success, and shows success toast feedback
- **AND** cancelling sends no member-remove request
- **AND** backend last-admin protection failures or other API errors are surfaced through error toast feedback without removing the row from loaded data

#### Scenario: Members table remains presentational after removal refactor

- **WHEN** the Members table is mounted for isolated component testing
- **THEN** it can render supplied rows, filters, mobile cards, row-expansion slots, and row action controls without providing admin API clients, auth stores, toast services, confirmation services, project membership derivation, or edit/assignment form components
- **AND** existing Assign PM, Edit, and Remove action labels, tooltips, row expansion behavior, and filter behavior remain unchanged from the user's perspective
