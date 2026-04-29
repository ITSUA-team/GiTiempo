## ADDED Requirements

### Requirement: Shared Cross-App Workspace Link Resolution
The `user-web` and `admin-web` frontends MUST use the same shared frontend leaf logic to resolve counterpart-workspace URLs when the resolution rules are identical.

#### Scenario: Counterpart SPA link resolution stays aligned
- **WHEN** either SPA renders a link to the counterpart workspace
- **THEN** it uses the same shared frontend workspace-link resolver
- **AND** configured app URLs, localhost port fallback, and same-origin fallback rules stay consistent across both SPAs

#### Scenario: Workspace-link resolver behavior is regression-tested
- **WHEN** the shared counterpart-workspace link resolver is implemented
- **THEN** focused tests cover configured app URLs, localhost port fallback, same-origin fallback, and no-window fallback behavior
- **AND** tests cover both user-to-admin and admin-to-user target configurations
