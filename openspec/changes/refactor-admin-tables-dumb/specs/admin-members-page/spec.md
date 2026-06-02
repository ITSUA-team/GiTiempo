## ADDED Requirements

### Requirement: Members Table Emits Removal Intent

The Members page MUST keep member-removal API orchestration outside the Members table rendering component while preserving the existing remove-member user flow.

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
- **THEN** it can render rows, filters, mobile cards, assign expansion, edit expansion, and remove controls without providing admin API clients, auth stores, toast services, or confirmation services
- **AND** existing Assign PM, Edit, and Remove action labels, tooltips, row expansion behavior, and filter behavior remain unchanged
