# Spec Delta

## ADDED Requirements

### Requirement: Login Accepts Optional Paired Google Credential
The strict login request SHALL accept `firebaseIdToken` and optional bounded `googleIdToken` strings, rejecting unknown keys. The Google field carries a signed credential, never a request-body email or provider selector. Existing Firebase-only callers and token-pair responses MUST remain compatible. Both credentials MUST be redacted from logs and MUST NOT be persisted as application state.

#### Scenario: Paired credential reaches login verification
- **WHEN** a client submits Firebase and Google ID tokens
- **THEN** request validation accepts the defined optional proof and the backend verifies its trust rules before granting access
- **AND** an arbitrary email, audience, provider or other unknown request field is rejected

## MODIFIED Requirements

### Requirement: Shared Registration Error Contract
The shared contracts SHALL define stable registration error identifiers for frontend error mapping.

#### Scenario: Registration errors use shared identifiers
- **WHEN** registration fails for an expected user-correctable or retryable reason
- **THEN** the frontend can map the failure to one of `duplicate_email`, `weak_password`, `invalid_workspace_name`, `rate_limited`, or `registration_service_unavailable`
- **AND** the API response does not require the frontend to parse provider-specific error messages

#### Scenario: Registration errors use the standard API envelope
- **WHEN** the backend returns a mapped registration failure
- **THEN** the response body includes the standard API error fields `statusCode`, `error`, and `message`
- **AND** the stable frontend-visible registration identifier is carried in `code`
- **AND** `error` remains the HTTP-category label rather than the registration-specific identifier

#### Scenario: Workspace name conflict is retired
- **GIVEN** a valid registration request reuses another workspace's display name
- **WHEN** the registration contract is applied
- **THEN** `workspace_name_unavailable` is not an allowed registration error identifier
- **AND** duplicate names alone cannot fail the request
