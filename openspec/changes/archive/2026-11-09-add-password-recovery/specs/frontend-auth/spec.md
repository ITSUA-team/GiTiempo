# Spec Delta

## ADDED Requirements

### Requirement: Login Page Links To Password Recovery

The user-web login page SHALL expose a "Forgot password?" link from the shared sign-in form to the password recovery request route, placed inline with the password field per the approved `.pen` Login treatment, without changing login form state or triggering login submission.

#### Scenario: Forgot password link navigates without submitting

- **GIVEN** an unauthenticated visitor is on the user-web `/login` route with an email and password typed into the login form
- **WHEN** the visitor clicks the "Forgot password?" link in the password field row
- **THEN** the user-web frontend navigates to the password recovery request route and no login request is sent

#### Scenario: Forgot password link matches approved visual treatment

- **GIVEN** the user-web login page renders
- **WHEN** the shared sign-in form is displayed
- **THEN** the "Forgot password?" link matches the approved `.pen` Login Page treatment (brand color, 13px, weight 600, inline with the password field) and the rest of the approved Login visual language is preserved