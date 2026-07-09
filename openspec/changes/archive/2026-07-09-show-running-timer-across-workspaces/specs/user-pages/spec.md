## ADDED Requirements

### Requirement: Global Top-Bar Timer Shows Cross-Workspace Running State

The user-web authenticated shell SHALL keep the authenticated user's authoritative running timer visible after workspace switching, including when the running timer belongs to a different workspace than the active session workspace.

#### Scenario: Cross-workspace running timer shown after workspace switch

- **GIVEN** the authenticated user has a running timer in workspace A
- **AND** the user switches the active session to workspace B
- **WHEN** any authenticated user-web page renders after the workspace switch completes
- **THEN** the global top-bar timer surface shows the running timer instead of an idle timer state
- **AND** the running timer surface includes live `HH:MM:SS`, project/task context, and a visible label identifying workspace A
- **AND** the elapsed display advances while the timer remains active without requiring a page refresh

#### Scenario: Mobile cross-workspace running timer shown after workspace switch

- **GIVEN** the authenticated user has a running timer in workspace A
- **AND** the user switches the active session to workspace B
- **WHEN** an authenticated user-web page renders below the mobile breakpoint
- **THEN** the mobile timer strip shows the running timer instead of an idle timer state
- **AND** the strip includes live `HH:MM:SS`, project/task context, and a visible label identifying workspace A
- **AND** the `Task & timer` opener remains available outside the profile menu area

#### Scenario: Cross-workspace running timer opens stop-first picker state

- **GIVEN** the authenticated user has a running timer in workspace A
- **AND** the active session workspace is workspace B
- **WHEN** the user opens the top-bar timer task picker
- **THEN** the dialog shows that the timer is currently running in workspace A
- **AND** the dialog exposes a popup-owned `Stop timer` action for the running timer
- **AND** active-workspace Project -> Task selection and `Change task` are unavailable until the running timer is stopped

#### Scenario: User stops old workspace timer before starting in active workspace

- **GIVEN** the authenticated user has a running timer in workspace A
- **AND** the active session workspace is workspace B
- **WHEN** the user stops the running timer from the top-bar timer task picker
- **THEN** the app refreshes the authoritative timer state
- **AND** the timer surface returns to the active-workspace idle selection state when no running timer remains
- **AND** the user can then choose a visible workspace B project/task and start a fresh timer in workspace B

#### Scenario: Start attempt conflict refreshes cross-workspace timer state

- **GIVEN** the user-web timer state is stale and appears idle in workspace B
- **AND** the backend has a running timer for the authenticated user in workspace A
- **WHEN** the user attempts to start a timer in workspace B and the backend rejects the request because a timer is already running
- **THEN** the app refreshes the authoritative current timer state
- **AND** the global timer surface shows the workspace A running timer with workspace context
- **AND** the app does not clear the user's active-workspace draft as if the start had succeeded
