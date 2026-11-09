# Spec Delta

## Purpose

Self-service password recovery for the GiTiempo web SPAs: lets a user who forgot their password request a Firebase reset email from the Login screen and confirm a new password on an in-app reset page that returns them to Login after success.

## ADDED Requirements

### Requirement: Login Screen Exposes Forgot Password Entry Point

The user-web and admin-web login screens SHALL expose a "Forgot password?" link from the shared sign-in form to the password recovery request route, placed inline with the password field per the approved `.pen` Login treatment, without altering login form state or submission behavior.

#### Scenario: Forgot password link is reachable on user-web login

- **GIVEN** an unauthenticated visitor is on the user-web `/login` route
- **WHEN** the login form renders
- **THEN** a "Forgot password?" link is visible in the password field row and navigates to the password recovery request route without submitting the login form or clearing entered email state

#### Scenario: Forgot password link is reachable on admin-web login

- **GIVEN** an unauthenticated administrator is on the admin-web `/login` route
- **WHEN** the login form renders
- **THEN** the same "Forgot password?" link is visible and navigates to the admin-web password recovery request route

#### Scenario: Link does not disturb login submission

- **GIVEN** the user has typed an email and password into the login form
- **WHEN** the user clicks "Forgot password?"
- **THEN** no login request is sent and the auth session layer's submitting state stays false

### Requirement: Password Recovery Request Accepts Registered Email

The password recovery request page SHALL accept a registered email address, validate it client-side, and trigger a Firebase password reset email via the Firebase client SDK with an in-app continue URL pointing at the reset password landing route. The page SHALL NOT send the email through a GiTiempo backend API.

#### Scenario: Valid email submits recovery request

- **GIVEN** an unauthenticated visitor is on the password recovery request route
- **WHEN** they enter a valid registered email and submit the form
- **THEN** the frontend calls the Firebase client SDK password reset email helper with a continue URL pointing to the in-app reset password landing route, and shows a persistent success confirmation (in-panel state) plus a success toast so the user knows to check their email

#### Scenario: Invalid email is rejected client-side

- **GIVEN** an unauthenticated visitor is on the password recovery request route
- **WHEN** they enter a malformed or empty email and submit
- **THEN** no Firebase call is made and an inline field validation error is shown (no toast, matching the project rule that pure client-side validation stays inline)

#### Scenario: Unknown email does not leak account existence

- **GIVEN** a visitor submits an email that is not registered in Firebase Auth
- **WHEN** the Firebase reset email call resolves
- **THEN** the UI shows the same in-panel success confirmation and success toast it shows for a known email, without revealing whether the account exists

#### Scenario: Firebase request failure shows recoverable error

- **GIVEN** the Firebase password reset email call fails for a recoverable reason (network or Firebase error)
- **WHEN** the error is received
- **THEN** an inline error message is shown AND an error toast is shown via the shared toast helper (manual dismiss), with a `logContext` identifying the send-password-reset action, so the user can retry submission

### Requirement: Reset Password Landing Confirms New Password In App

The reset password landing page SHALL consume Firebase action-code links of mode `resetPassword`, validate the action code with the Firebase client SDK, and confirm the new password with the Firebase client SDK. The page SHALL NOT send raw passwords to any GiTiempo API.

#### Scenario: Valid action code confirms new password

- **GIVEN** a visitor arrives at the reset password landing route with a valid `mode=resetPassword&oobCode=...` action link
- **WHEN** they enter and confirm a new password that meets the minimum length and submit
- **THEN** the frontend verifies the action code and confirms the new password through the Firebase client SDK without sending the raw password to a GiTiempo API

#### Scenario: Expired or invalid action code is rejected

- **GIVEN** a visitor arrives with an expired, already-used, or invalid `oobCode`
- **WHEN** the page validates the action code
- **THEN** the page switches to an invalid-link panel state that offers a way back to the password recovery request route, AND an error toast is shown via the shared toast helper (manual dismiss) with a `logContext` identifying the verify-password-reset-link action

#### Scenario: Weak password is rejected client-side

- **GIVEN** a visitor is on the reset password landing page with a valid action code
- **WHEN** they enter a password shorter than the documented minimum or leave the confirmation field mismatched
- **THEN** no Firebase confirm call is made and inline field validation errors are shown (no toast, matching the project rule that pure client-side validation stays inline)

#### Scenario: Missing action code parameters

- **GIVEN** a visitor arrives at the reset password landing route without `mode` or `oobCode`
- **WHEN** the page loads
- **THEN** the page switches to an invalid-link panel state that offers a way back to the password recovery request route (no toast, matching the invite password-setup precedent for missing parameters)

#### Scenario: Firebase confirm failure shows inline and toast error

- **GIVEN** a visitor submits a new password with a valid action code and the Firebase confirm call fails (for example `auth/weak-password` surfaced by Firebase rather than client-side, network, or other Firebase error)
- **WHEN** the error is received
- **THEN** an inline error message is shown AND an error toast is shown via the shared toast helper (manual dismiss) with a `logContext` identifying the confirm-password-reset action, and the user can retry submission

### Requirement: Successful Password Update Notifies And Returns To Login

After a successful password update on the reset password landing page, the frontend SHALL show a success toast through the shared toast helper and redirect the user to the same-app Login route.

#### Scenario: Success toast and redirect on user-web

- **GIVEN** a visitor has successfully confirmed a new password on the user-web reset password landing page
- **WHEN** the Firebase confirm call resolves successfully
- **THEN** a success toast is shown via the shared toast helper and the user is redirected to the user-web `/login` route

#### Scenario: Success toast and redirect on admin-web

- **GIVEN** an administrator has successfully confirmed a new password on the admin-web reset password landing page
- **WHEN** the Firebase confirm call resolves successfully
- **THEN** a success toast is shown via the shared toast helper and the user is redirected to the admin-web `/login` route

### Requirement: Recovery Notifications Follow Project Toast And Inline Conventions

The recovery flow SHALL use the shared createAppToast helper for toasts and inline Message components for field/form errors, matching the invite password-setup precedent. Client-side validation stays inline only; failed Firebase API calls surface both inline state and an error toast with a { action, feature } logContext; successes use a success toast. Raw passwords SHALL NOT appear in any toast, inline copy, or log output.

#### Scenario: Client-side validation stays inline only

- **GIVEN** a visitor submits the recovery request form with an invalid email, or the reset form with a weak or mismatched password
- **WHEN** the client-side validation rejects the input
- **THEN** an inline field `Message` is shown and no toast is displayed

#### Scenario: Firebase API failures use inline state plus error toast

- **GIVEN** a Firebase call in the recovery flow (send password reset email, verify action code, or confirm new password) fails
- **WHEN** the error is received
- **THEN** an inline error state is shown on the relevant surface AND an error toast is shown via the shared toast helper with a `logContext` of `{ action, feature }` form, requiring manual dismiss

#### Scenario: Successes use success toast

- **GIVEN** the recovery request email is sent or the new password is confirmed successfully
- **WHEN** the Firebase call resolves successfully
- **THEN** a success toast is shown via the shared toast helper with the default auto-dismiss life

#### Scenario: Passwords never appear in notifications or logs

- **GIVEN** any error or success outcome in the recovery flow
- **WHEN** a toast or inline message is composed
- **THEN** no raw password value appears in the toast summary/detail, the inline `Message` text, or the `logContext`/logger output

### Requirement: Recovery Routes Are Public Standalone Guest Flows

The password recovery request and reset password landing routes SHALL be public, standalone (outside the app shell), and available to unauthenticated visitors. The recovery request route SHALL be guest-only; the reset password landing route SHALL allow an authenticated guest flow so a signed-in user can still land from an action-code email.

#### Scenario: Recovery request route is guest-only

- **GIVEN** an authenticated user navigates to the password recovery request route
- **WHEN** the route guard evaluates
- **THEN** the user is redirected away from the recovery request route, mirroring the login route's guest-only behavior

#### Scenario: Reset password landing allows action-code arrival

- **GIVEN** a visitor (signed in or not) arrives at the reset password landing route from a Firebase reset email
- **WHEN** the route guard evaluates
- **THEN** the route renders so the action code can be consumed, mirroring the invite password setup route's allow-authenticated-guest-flow behavior

#### Scenario: Recovery routes render outside the app shell

- **GIVEN** a visitor is on either the recovery request or reset password landing route
- **WHEN** the route renders
- **THEN** the page is presented as a standalone auth screen sharing the approved login visual language, not inside the authenticated app shell