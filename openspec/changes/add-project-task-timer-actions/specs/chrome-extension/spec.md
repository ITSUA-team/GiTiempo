## MODIFIED Requirements

### Requirement: Extension Uses Existing Timer API Contracts
The extension SHALL consume existing timer endpoints and shared request/response shapes without requiring new backend behavior. When stopping a timer, it SHALL first read the authoritative current timer and submit that entry's identity to the conditional stop contract.

#### Scenario: Start request matches shared GitHub timer contract
- **WHEN** the extension starts a timer from a GitHub issue
- **THEN** the request body contains only `githubRepo`, `issueNumber`, and `issueTitle`
- **AND** it matches the existing shared `startTimerFromGitHub` contract

#### Scenario: Extension conditionally stops the authoritative timer
- **GIVEN** the extension receives a timer-stop action
- **WHEN** it reads the authoritative current timer from the API
- **THEN** it sends that timer's identifier as `expectedTimerId` to `POST /time-entries/timer/stop`
- **AND** a changed timer is reported as a recoverable `409 Conflict`

#### Scenario: Current timer is reconciled from API
- **WHEN** the popup or injected control loads authenticated state
- **THEN** it queries the current timer endpoint before deriving idle or running UI
- **AND** it uses the backend response as authoritative state

#### Scenario: API failures remain retryable
- **GIVEN** a timer API call fails because of network, auth, conflict, or validation errors
- **WHEN** the extension renders the failure
- **THEN** it shows user-visible error feedback in the popup or injected control
- **AND** it preserves enough local page/session context for retry or sign-in recovery
