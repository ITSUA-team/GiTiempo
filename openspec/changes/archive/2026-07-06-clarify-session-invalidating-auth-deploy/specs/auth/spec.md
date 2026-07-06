## MODIFIED Requirements

### Requirement: API Session Token Pair

The backend SHALL issue an access token and refresh token pair after successful login for a user with active workspace membership. Access tokens MUST carry a minimal, non-sensitive payload suitable for stateless verification. Refresh tokens MUST be opaque, unguessable, stored only as a cryptographic hash at rest, and bound to the workspace membership selected when the session is issued.

#### Scenario: Refresh token stays bound to the issued workspace membership

- **GIVEN** the backend issues a session for a specific active workspace membership during login or first-owner registration
- **WHEN** the backend persists the refresh token for that session
- **THEN** the persisted refresh-token record keeps the selected workspace membership context
- **AND** later refresh attempts evaluate membership against that stored workspace context instead of selecting a different active membership for the same user

### Requirement: Membership-Gated Login

The backend MUST reject login and refresh attempts when the verified Firebase identity does not have an active workspace membership. Existing-workspace application access remains invite-only, and the login endpoint never creates users or memberships. First-workspace-owner registration is a separate public endpoint that may issue an initial session only after it creates a workspace and owner membership.

#### Scenario: Refresh is rejected when the issued workspace membership is gone

- **GIVEN** a client presents a valid refresh token that was issued for a specific active workspace membership
- **AND** the session owner no longer has that exact active workspace membership
- **WHEN** the refresh endpoint is called
- **THEN** the backend rejects the request as unauthorized (401)
- **AND** the backend does not silently move the session onto a different active workspace membership for the same user
