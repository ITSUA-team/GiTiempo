# Spec Delta

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
