# Spec Delta

## ADDED Requirements

### Requirement: Admin Login Page Links To Password Recovery

The admin-web login page SHALL expose a "Forgot password?" link from the shared sign-in form to the admin-web password recovery request route, placed inline with the password field per the approved `.pen` Admin Login treatment, without changing login form state or triggering login submission. This keeps admin login entry behavior aligned with user-web.

#### Scenario: Forgot password link navigates without submitting on admin-web

- **GIVEN** an unauthenticated administrator is on the admin-web `/login` route with an email and password typed into the login form
- **WHEN** the administrator clicks the "Forgot password?" link in the password field row
- **THEN** the admin-web frontend navigates to the admin-web password recovery request route and no login request is sent

#### Scenario: Admin forgot password link matches approved visual treatment

- **GIVEN** the admin-web login page renders
- **WHEN** the shared sign-in form is displayed
- **THEN** the "Forgot password?" link matches the approved `.pen` Login Page — Admin treatment (brand color, 13px, weight 600, inline with the password field) and the rest of the approved Admin Login visual language is preserved