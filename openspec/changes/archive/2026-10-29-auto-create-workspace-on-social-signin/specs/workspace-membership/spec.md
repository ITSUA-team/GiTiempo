# Spec Delta

## MODIFIED Requirements

### Requirement: Active Workspace Membership Gates Application Access
The system MUST treat an active workspace membership as a prerequisite for application access. Eligible Google or GitHub sign-in with zero memberships SHALL create a personal workspace and admin membership before issuing access. Authenticated recovery proving the exact UID of a retained manual-registration reservation SHALL complete or reuse that original foundation before issuing access. Other membership-less login and all refresh attempts without the issued membership MUST remain unauthorized.

#### Scenario: User with membership is eligible for application access
- **GIVEN** a verified identity maps to a local user with an active workspace membership
- **WHEN** that user establishes or renews an application session
- **THEN** the system may issue or refresh application access for that membership

#### Scenario: Eligible social user receives membership before access
- **GIVEN** a verified Google or GitHub identity resolves to an account with zero memberships
- **WHEN** ordinary sign-in completes successfully
- **THEN** the system creates the personal workspace and admin membership before issuing the session
- **AND** protected requests use that persisted membership's workspace and role

#### Scenario: User without membership is denied application access
- **GIVEN** a verified identity has no membership and is completing neither eligible social sign-in nor authenticated exact-UID recovery of its original manual-registration reservation
- **WHEN** that user attempts to establish an application session
- **THEN** the system rejects the request as unauthorized

#### Scenario: Renewal cannot create membership
- **GIVEN** a refresh session's selected membership has been removed
- **WHEN** the user attempts to renew that session
- **THEN** the system rejects the request as unauthorized
- **AND** it does not create or select a replacement membership
