## ADDED Requirements

### Requirement: Workspace Switching Preserves Authoritative Running Timer State

The frontend session flow SHALL treat workspace switching as an active-workspace context change without hiding, clearing, or replacing the authenticated user's authoritative running timer state.

#### Scenario: Workspace switch refreshes timer summary

- **GIVEN** the authenticated user belongs to multiple workspaces
- **AND** the user switches from workspace A to workspace B
- **WHEN** the frontend applies the new token pair for workspace B
- **THEN** user-web refreshes the authoritative current timer state for the authenticated user
- **AND** it does not treat the workspace switch itself as proof that no timer is running

#### Scenario: Workspace switch keeps one-running-timer invariant visible

- **GIVEN** the authenticated user has a running timer in workspace A
- **WHEN** the user switches the active session to workspace B
- **THEN** user-web keeps the one-running-timer invariant visible in the shell timer surface
- **AND** starting a workspace B timer is not presented as immediately available until the workspace A timer is stopped

#### Scenario: Workspace switch does not mutate running timer ownership

- **GIVEN** the authenticated user has a running timer in workspace A
- **WHEN** the user switches the active session to workspace B
- **THEN** the running timer remains owned by workspace A until the user explicitly stops it
- **AND** the workspace switch does not move the running entry to workspace B
