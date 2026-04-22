# Backend Authentication Specification

## Purpose

Define server-side authentication behavior for verifying identity, issuing API tokens, and enforcing authenticated access in the NestJS API.

## Requirements

### Requirement: Firebase Identity Verification

The backend MUST accept a Firebase identity token during login and verify it before creating an authenticated API session.

#### Scenario: Login with valid Firebase identity

- GIVEN a frontend client has authenticated a user with Firebase Auth
- WHEN the client sends the Firebase identity token to the API login endpoint
- THEN the backend verifies the token with Firebase Admin credentials
- AND the backend associates the verified identity with a local user record

#### Scenario: Login with invalid Firebase identity

- GIVEN a frontend client sends an invalid, expired, or unverifiable Firebase identity token
- WHEN the API login endpoint processes the request
- THEN the backend rejects the request as unauthorized
- AND no application session tokens are issued

### Requirement: API Session Token Pair

The backend SHALL issue an access token and refresh token pair after successful login.

#### Scenario: Successful login returns token pair

- GIVEN the backend has verified the Firebase identity token
- WHEN the login flow completes successfully
- THEN the response includes an access token for authenticated API calls
- AND the response includes a refresh token for session renewal

#### Scenario: Refresh rotates session credentials

- GIVEN a client presents a valid refresh token
- WHEN the refresh endpoint is called
- THEN the backend invalidates the previous refresh token
- AND the backend returns a fresh access token and refresh token pair

### Requirement: Authenticated Request Enforcement

Protected backend endpoints MUST require a valid API access token in the `Authorization` header.

#### Scenario: Authenticated access to protected route

- GIVEN a client includes a valid access token in the `Authorization: Bearer` header
- WHEN the client calls a protected API endpoint
- THEN the backend allows the request to proceed
- AND the authenticated user context is available to downstream request handling

#### Scenario: Missing access token on protected route

- GIVEN a protected API endpoint is called without a valid bearer token
- WHEN the backend evaluates the request
- THEN the backend rejects the request as unauthorized

### Requirement: Local User Upsert On First Login

The backend MUST ensure that a verified Firebase identity maps to a local user record.

#### Scenario: First login creates local user

- GIVEN a verified Firebase identity has no matching local user record
- WHEN the user completes the login flow
- THEN the backend creates a local user with the verified identity attributes
- AND future authenticated requests resolve to that same local user

#### Scenario: Returning login updates mapped user

- GIVEN a verified Firebase identity already maps to a local user record
- WHEN the user logs in again
- THEN the backend reuses the existing local user record
- AND the backend may refresh mutable profile fields sourced from identity data
