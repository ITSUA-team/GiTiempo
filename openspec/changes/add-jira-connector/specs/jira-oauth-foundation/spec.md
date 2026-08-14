## ADDED Requirements

### Requirement: Jira Connection Status

An authenticated member SHALL be able to read whether their Atlassian account is connected, and the status MUST distinguish a healthy connection from one that needs re-authorization.

#### Scenario: No connection yet

- **WHEN** a member with no Atlassian connection requests their Jira connection status
- **THEN** the response reports the account as not connected

#### Scenario: Healthy connection

- **GIVEN** a member with a stored Atlassian connection whose tokens can be refreshed
- **WHEN** they request their Jira connection status
- **THEN** the response reports the account as connected with its Atlassian identity

#### Scenario: Connection that lost its refresh token family

- **GIVEN** a stored connection whose refresh was rejected by Atlassian
- **WHEN** the member requests their Jira connection status
- **THEN** the response reports that re-authorization is required
- **AND** the stored connection is not silently deleted

### Requirement: Jira Authorization URL Creation

The backend SHALL create the Atlassian OAuth 2.0 (3LO) authorization URL server-side, requesting only read scopes and offline access, with a single-use state bound to the requesting member.

#### Scenario: Authorization URL is requested

- **WHEN** an authenticated member requests to connect Jira
- **THEN** the backend returns an authorization URL for the configured Atlassian app
- **AND** the requested scopes are limited to reading Jira work, reading identity, and offline access
- **AND** the state parameter is single-use and bound to that member

#### Scenario: Missing Jira configuration fails fast

- **GIVEN** the Jira client id, secret, or callback URL is absent from the environment
- **WHEN** the application boots
- **THEN** it fails by naming the missing value rather than failing later at connect time

### Requirement: Jira OAuth Callback Completion

The backend SHALL complete the OAuth callback by validating the state, exchanging the code, resolving the account's accessible sites, and storing the connection, before redirecting to a safe destination.

#### Scenario: Callback completes a connection

- **WHEN** the member returns from Atlassian with a valid code and state
- **THEN** the backend exchanges the code for tokens
- **AND** it resolves the sites the account can access
- **AND** it stores the connection for that member
- **AND** it redirects to a destination read from configuration, never from the request

#### Scenario: Invalid or replayed state is refused

- **WHEN** the callback carries a state that is unknown, expired, or already used
- **THEN** no connection is stored
- **AND** the member is returned to the safe destination with an error indicator

### Requirement: Jira Token Storage And Rotating Refresh

Atlassian tokens MUST be stored encrypted with the workspace encryption approach. Access tokens expire and refresh tokens rotate on use, so refresh MUST be single-flight per connection, and a rejected refresh MUST mark the connection as needing re-authorization.

#### Scenario: Tokens are stored encrypted

- **WHEN** a connection is stored or refreshed
- **THEN** access and refresh tokens are encrypted at rest
- **AND** plaintext tokens never appear in logs or API responses

#### Scenario: Expired access token is refreshed once under concurrency

- **GIVEN** a connection whose access token has expired
- **WHEN** several requests need the token at the same time
- **THEN** exactly one refresh call reaches Atlassian
- **AND** the other requests wait for and reuse its result
- **AND** the rotated refresh token replaces the previous one

#### Scenario: Rejected refresh degrades to re-authorization

- **WHEN** Atlassian rejects the refresh token
- **THEN** the connection is marked as needing re-authorization
- **AND** dependent Jira features report the connection state instead of a generic failure

### Requirement: Jira Disconnect

A member SHALL be able to disconnect their Atlassian account, removing the stored tokens.

#### Scenario: Member disconnects

- **WHEN** a connected member requests to disconnect Jira
- **THEN** the stored connection and its tokens are deleted
- **AND** Jira features report the account as not connected afterwards
