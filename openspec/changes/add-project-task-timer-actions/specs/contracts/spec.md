## ADDED Requirements

### Requirement: Shared Conditional Timer Stop Contract
The shared contracts SHALL define the optional timer-stop request payload used by the API, current web clients, and the Chrome extension.

#### Scenario: Conditional stop request carries the authoritative timer identity
- **GIVEN** a current client stops a running timer
- **WHEN** it validates the request payload against the shared contract
- **THEN** the payload accepts an `expectedTimerId` UUID
- **AND** the API uses that identifier to conditionally stop only the matching running timer
- **AND** a stale, completed, absent, or foreign identifier results in `409 Conflict`

#### Scenario: Legacy bodyless stop request remains valid
- **GIVEN** an installed legacy client stops a timer without a request body
- **WHEN** the API validates the stop request against the shared contract
- **THEN** the empty payload is accepted
- **AND** the API retains the user-global legacy stop behavior
- **AND** no running timer results in `404 Not Found`
