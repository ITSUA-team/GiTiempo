# GitHub OAuth Foundation Specification

## Purpose

Define the GitHub App OAuth foundation behavior for authenticated users, including connection status, authorization URL creation, callback completion, token handling, disconnects, and safe redirects.

## Requirements

### Requirement: GitHub Connection Status

The system SHALL allow an authenticated user to read their GitHub connection status without exposing token material.

#### Scenario: User has no GitHub connection
- **GIVEN** an authenticated user has no stored GitHub connection
- **WHEN** the user requests GitHub connection status
- **THEN** the system SHALL return `{ status: "disconnected", account: null }`
- **AND** the response MUST NOT include access tokens, refresh tokens, or token secrets

#### Scenario: User has active GitHub connection
- **GIVEN** an authenticated user has an active GitHub connection
- **WHEN** the user requests GitHub connection status
- **THEN** the system SHALL return `status: "connected"`
- **AND** the response SHALL include `account.githubUserId`, `account.login`, `account.avatarUrl`, `account.connectedAt`, and `account.updatedAt`
- **AND** the response MUST NOT include access tokens, refresh tokens, or token secrets

### Requirement: GitHub Authorization URL Creation

The system SHALL allow an authenticated user to create a GitHub App OAuth authorization URL backed by an unguessable opaque server-side state id and PKCE.

#### Scenario: Authenticated user starts GitHub OAuth
- **GIVEN** an authenticated user requests a GitHub authorization URL
- **WHEN** the system creates the OAuth request
- **THEN** the system SHALL create server-side OAuth state owned by that user
- **AND** the state value SHALL be an unguessable opaque id, not a self-contained signed JWT
- **AND** the system SHALL bind a PKCE verifier to that state
- **AND** the system SHALL return a GitHub authorization URL containing state id and PKCE challenge parameters

### Requirement: GitHub OAuth Callback Completion

The system SHALL complete GitHub App OAuth from the public callback endpoint by atomically consuming server-side state before exchanging the authorization code.

#### Scenario: GitHub callback succeeds
- **GIVEN** GitHub redirects back with a valid authorization code and unexpired state
- **WHEN** the system processes the callback
- **THEN** the system SHALL atomically claim the opaque state id if it exists, is unexpired, and is unconsumed
- **AND** the system SHALL identify the bound application user from the claimed state
- **AND** the system SHALL exchange the authorization code with GitHub using the stored PKCE verifier
- **AND** the system SHALL store the resulting GitHub connection for that user

#### Scenario: Concurrent callbacks use the same state
- **GIVEN** two callbacks attempt to use the same unconsumed OAuth state concurrently
- **WHEN** both callbacks are processed
- **THEN** at most one callback SHALL atomically claim the state
- **AND** any callback that does not claim the state MUST NOT exchange the authorization code with GitHub

#### Scenario: Callback state is replayed
- **GIVEN** an OAuth state has already been consumed
- **WHEN** the callback is submitted again with that state
- **THEN** the system MUST reject the callback
- **AND** the system MUST NOT exchange the authorization code with GitHub

#### Scenario: Callback state is expired
- **GIVEN** an OAuth state is past its expiry time
- **WHEN** the callback is submitted with that state
- **THEN** the system MUST reject the callback
- **AND** the system MUST NOT create or update a GitHub connection

### Requirement: GitHub Token Storage And Refresh

The system SHALL store GitHub token material encrypted and SHALL provide an internal way to obtain a valid GitHub user access token for future GitHub API calls.

#### Scenario: Tokens are stored after successful OAuth
- **GIVEN** GitHub returns a user access token and refresh token during OAuth completion
- **WHEN** the system persists the GitHub connection
- **THEN** the system SHALL encrypt the token values before storage
- **AND** the system SHALL store access token and refresh token expiry metadata
- **AND** the system MUST NOT expose raw token values in API responses

#### Scenario: Internal workflow requests an expired token
- **GIVEN** a connected user's stored GitHub access token is expired or near expiry
- **WHEN** an internal GitHub workflow requests a valid access token
- **THEN** the system SHALL refresh the token using the stored refresh token
- **AND** the system SHALL persist the refreshed token values encrypted
- **AND** the system SHALL return only the valid access token to the internal caller

#### Scenario: GitHub refresh fails
- **GIVEN** GitHub rejects the stored refresh token
- **WHEN** an internal GitHub workflow requests a valid access token
- **THEN** the system MUST NOT return an invalid access token
- **AND** the system SHALL mark the connection as requiring reconnection or disconnected

### Requirement: GitHub Disconnect

The system SHALL allow an authenticated user to disconnect their GitHub account.

#### Scenario: User disconnects GitHub
- **GIVEN** an authenticated user has a stored GitHub connection
- **WHEN** the user disconnects GitHub
- **THEN** the system SHALL mark the connection disconnected
- **AND** the system SHALL clear stored encrypted token material
- **AND** future connection status requests SHALL report the connection as disconnected

### Requirement: Safe OAuth Redirects

The system SHALL redirect users only to `USER_SPA_URL/profile` after GitHub OAuth completion.

#### Scenario: OAuth completes successfully
- **GIVEN** a GitHub OAuth callback is processed successfully
- **WHEN** the system redirects the browser
- **THEN** the redirect destination SHALL be `USER_SPA_URL/profile`
- **AND** the redirect SHALL include only safe success indicators

#### Scenario: OAuth completion fails
- **GIVEN** a GitHub OAuth callback cannot be validated or completed
- **WHEN** the system redirects the browser
- **THEN** the redirect destination SHALL be `USER_SPA_URL/profile`
- **AND** the redirect SHALL include only a safe error code
- **AND** the redirect MUST NOT include raw GitHub token, authorization code, or provider error details
