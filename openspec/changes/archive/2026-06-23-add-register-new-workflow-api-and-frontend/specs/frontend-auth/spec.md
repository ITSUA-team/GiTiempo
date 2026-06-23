## ADDED Requirements

### Requirement: Register Route Is A Standalone Guest Flow
The user-web frontend SHALL provide `/register` as a standalone unauthenticated route-level page for first-workspace-owner registration after backend registration support exists.

#### Scenario: Anonymous user opens register route
- **WHEN** an anonymous user navigates to `/register`
- **THEN** the frontend renders the register page outside the authenticated app shell
- **AND** the page does not render the sidebar, top-bar timer surface, or in-shell workspace navigation

#### Scenario: Authenticated user opens register route
- **GIVEN** the browser already has an authenticated GiTiempo app session
- **WHEN** the user navigates to `/register`
- **THEN** the router redirects to the default authenticated route or preserved redirect target

### Requirement: Login Page Links To Registration
The user-web login page SHALL expose the approved secondary registration entry point without changing login form state.

#### Scenario: Create workspace action opens register flow
- **WHEN** the login page renders
- **THEN** it shows a secondary outlined `Create workspace` action below `Continue with Google`
- **AND** the action navigates to `/register`
- **AND** the action is visually secondary to both sign-in actions

#### Scenario: Login errors stay scoped to login
- **GIVEN** a login attempt has failed
- **WHEN** the user navigates from `/login` to `/register`
- **THEN** the register page does not display the stale login error

### Requirement: Register Page Matches Approved Workflow
The user-web register page MUST follow the approved docs and `.pen` screens for content hierarchy, fields, actions, and responsive structure.

#### Scenario: Register form renders default fields
- **WHEN** the register page renders
- **THEN** the form fields are ordered `Work email`, `Full name`, `Workspace name`, `Password`, then `Confirm password`
- **AND** the owner acknowledgement checkbox follows the password fields
- **AND** the primary action is `Create workspace`
- **AND** the secondary account action is an inline `Sign in` link to `/login`

#### Scenario: Register form validates before submit
- **GIVEN** required fields are blank, password confirmation does not match, or owner acknowledgement is unchecked
- **WHEN** the user submits the register form
- **THEN** the frontend shows inline validation
- **AND** no registration API request is sent

#### Scenario: Register page excludes unapproved account actions
- **WHEN** the register page renders
- **THEN** it does not show Google sign-up, invite acceptance, or password setup actions

### Requirement: Register Submission Establishes Session
The user-web frontend MUST submit registration through a typed shared-contract client and enter the normal authenticated session after success.

#### Scenario: Registration succeeds
- **GIVEN** the user submits a valid register form
- **AND** the registration endpoint returns the normal token pair
- **WHEN** the frontend handles the response
- **THEN** it stores the access token in session state
- **AND** persists the refresh token for later restoration
- **AND** redirects to the dashboard

#### Scenario: Registration submit remains single-flight
- **GIVEN** a registration request is in progress
- **WHEN** the user interacts with the register form
- **THEN** the `Create workspace` action shows loading
- **AND** duplicate submissions are prevented
- **AND** the panel shape remains stable

#### Scenario: Registration failure is mapped
- **GIVEN** registration fails with a known registration error
- **WHEN** the frontend handles the failure
- **THEN** the page shows inline error feedback in the register panel
- **AND** also uses toast feedback for the failed submission
- **AND** the user remains on `/register`
