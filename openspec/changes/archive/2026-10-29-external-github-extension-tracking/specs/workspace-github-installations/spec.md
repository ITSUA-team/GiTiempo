## MODIFIED Requirements

### Requirement: Installation Lifecycle Changes Revoke Tracking Access
The system SHALL process authenticated GitHub installation and repository-access lifecycle events idempotently, invalidate affected credential caches, and block new starts for suspended, removed, or locally disconnected associations. The backend MUST verify required resources on every new installation-authorized GitHub start and treat provider denial as authoritative even when a lifecycle event is delayed. Reordered or repeated events MUST NOT reactivate a disconnected or removed link without current verification.
 This requirement SHALL apply to installation-authorized managed starts, including managed routing from the reference entry point. External-reference recording SHALL remain independent of installation state and MUST NOT be selected as failure fallback for a managed target.

#### Scenario: Installation is suspended or uninstalled
- **GIVEN** the requested target uses managed installation-authorized tracking
- **AND** GitHub suspends or removes an associated installation
- **WHEN** a verified lifecycle event is received or a subsequent provider check detects the loss
- **THEN** the association cannot authorize new starts
- **AND** owned running timers can still be stopped without a GitHub call


#### Scenario: A repository is removed from installation access
- **GIVEN** the requested target uses managed installation-authorized tracking
- **AND** a cached installation token and a previously accessible repository
- **WHEN** GitHub removes access to that repository
- **THEN** new starts for its issues are rejected without task or time-entry writes
- **AND** access to other repositories is evaluated independently


#### Scenario: Forged or replayed lifecycle delivery arrives
- **GIVEN** the requested target uses managed installation-authorized tracking
- **AND** a delivery with an invalid signature or a previously processed delivery identifier
- **WHEN** the webhook is handled
- **THEN** an invalid signature causes rejection and no state mutation
- **AND** a repeated valid delivery causes no duplicate side effects

#### Scenario: Reference recording survives installation removal
- **GIVEN** a member targets an external-reference project with current local authorization
- **WHEN** an unrelated or same-organization installation is removed or disconnected
- **THEN** reference starts and owned stopping remain available without provider calls or policy conversion
