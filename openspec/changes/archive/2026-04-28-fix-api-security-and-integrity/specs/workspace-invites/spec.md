## MODIFIED Requirements

### Requirement: Invite Delivery Supports SMTP And Console Fallback
The system MUST support SMTP invite delivery and an environment-controlled console fallback mode. Console fallback mode MUST be disabled by default and MUST NOT be active in production, regardless of environment variable configuration.

#### Scenario: SMTP delivery sends invite message
- **GIVEN** SMTP delivery is configured and console fallback is disabled
- **WHEN** an admin creates an invite
- **THEN** the system sends the invite through the configured SMTP transport

#### Scenario: Console fallback logs invite delivery
- **GIVEN** console fallback mode is enabled
- **AND** the application is not running in production mode
- **WHEN** an admin creates an invite
- **THEN** the system records the invite delivery in application logs instead of using SMTP

#### Scenario: Console fallback is blocked in production
- **GIVEN** the application is running in production mode
- **WHEN** an admin creates an invite
- **THEN** the system MUST use SMTP delivery regardless of the console fallback configuration value

## ADDED Requirements

### Requirement: Invite Creation Compensates On Delivery Failure
The system MUST cancel (expire) a pending invite when its delivery fails, so that a retry creates a fresh invite.

#### Scenario: SMTP failure expires the invite
- **GIVEN** an admin creates an invite for an email
- **AND** the invite is persisted as pending
- **WHEN** the delivery transport throws an error
- **THEN** the system transitions the invite to expired status
- **AND** the system returns a delivery error to the caller

#### Scenario: Retry after delivery failure succeeds
- **GIVEN** a previous invite creation failed due to delivery error and the invite was expired
- **WHEN** the admin retries the same invite creation
- **THEN** the system creates a new pending invite with a fresh token
- **AND** attempts delivery again
