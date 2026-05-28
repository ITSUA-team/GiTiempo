## MODIFIED Requirements

### Requirement: Admin-only routes reject member tokens with 403
The system SHALL reject requests from authenticated users with a non-admin role on all routes protected by `WorkspaceAdminGuard`, returning HTTP 403.

#### Scenario: Member token on PATCH /workspace
- **WHEN** a user with role "member" sends PATCH /workspace with a valid JWT
- **THEN** the system responds with 403 Forbidden

#### Scenario: Member token on GET /workspace/settings
- **WHEN** a user with role "member" sends GET /workspace/settings with a valid JWT
- **THEN** the system responds with 403 Forbidden

#### Scenario: Member token on PATCH /workspace/settings
- **WHEN** a user with role "member" sends PATCH /workspace/settings with a valid JWT
- **THEN** the system responds with 403 Forbidden

#### Scenario: Member token on GET /members
- **WHEN** a user with role "member" sends GET /members with a valid JWT
- **THEN** the system responds with 403 Forbidden

#### Scenario: Member token on PATCH /members/:id/role
- **WHEN** a user with role "member" sends PATCH /members/:id/role with a valid JWT
- **THEN** the system responds with 403 Forbidden

#### Scenario: Member token on DELETE /members/:id
- **WHEN** a user with role "member" sends DELETE /members/:id with a valid JWT
- **THEN** the system responds with 403 Forbidden

#### Scenario: Member token on GET /invites
- **WHEN** a user with role "member" sends GET /invites with a valid JWT
- **THEN** the system responds with 403 Forbidden

#### Scenario: Member token on POST /invites
- **WHEN** a user with role "member" sends POST /invites with a valid JWT
- **THEN** the system responds with 403 Forbidden

#### Scenario: Member token on POST /invites/:id/resend
- **WHEN** a user with role "member" sends POST /invites/:id/resend with a valid JWT
- **THEN** the system responds with 403 Forbidden

#### Scenario: Member token on DELETE /invites/:id
- **WHEN** a user with role "member" sends DELETE /invites/:id with a valid JWT
- **THEN** the system responds with 403 Forbidden

### Requirement: Admin-only routes reject unauthenticated requests with 401
The system SHALL reject requests without a valid JWT on all routes protected by `JwtAuthGuard`, returning HTTP 401.

#### Scenario: No token on PATCH /workspace
- **WHEN** a request is sent to PATCH /workspace without an Authorization header
- **THEN** the system responds with 401 Unauthorized

#### Scenario: No token on GET /workspace/settings
- **WHEN** a request is sent to GET /workspace/settings without an Authorization header
- **THEN** the system responds with 401 Unauthorized

#### Scenario: No token on PATCH /workspace/settings
- **WHEN** a request is sent to PATCH /workspace/settings without an Authorization header
- **THEN** the system responds with 401 Unauthorized

#### Scenario: No token on GET /members
- **WHEN** a request is sent to GET /members without an Authorization header
- **THEN** the system responds with 401 Unauthorized

#### Scenario: No token on PATCH /members/:id/role
- **WHEN** a request is sent to PATCH /members/:id/role without an Authorization header
- **THEN** the system responds with 401 Unauthorized

#### Scenario: No token on DELETE /members/:id
- **WHEN** a request is sent to DELETE /members/:id without an Authorization header
- **THEN** the system responds with 401 Unauthorized

#### Scenario: No token on GET /invites
- **WHEN** a request is sent to GET /invites without an Authorization header
- **THEN** the system responds with 401 Unauthorized

#### Scenario: No token on POST /invites
- **WHEN** a request is sent to POST /invites without an Authorization header
- **THEN** the system responds with 401 Unauthorized

#### Scenario: No token on POST /invites/:id/resend
- **WHEN** a request is sent to POST /invites/:id/resend without an Authorization header
- **THEN** the system responds with 401 Unauthorized

#### Scenario: No token on DELETE /invites/:id
- **WHEN** a request is sent to DELETE /invites/:id without an Authorization header
- **THEN** the system responds with 401 Unauthorized
