# Spec Delta

## MODIFIED Requirements

### Requirement: Password Recovery Request Accepts Registered Email

The password recovery request page SHALL accept a registered email address, validate it client-side, and trigger a Firebase password reset email via the Firebase client SDK with an in-app continue URL pointing at the reset password landing route. The page SHALL NOT send the email through a GiTiempo backend API.

#### Scenario: Valid email submits recovery request

- **GIVEN** an unauthenticated visitor is on the password recovery request route
- **WHEN** they enter a valid registered email and submit the form
- **THEN** the frontend calls the Firebase client SDK password reset email helper with a continue URL pointing to the in-app reset password landing route, and shows a persistent account-safe in-panel confirmation instructing the visitor to check their email, without a duplicate success toast

#### Scenario: Invalid email is rejected client-side

- **GIVEN** an unauthenticated visitor is on the password recovery request route
- **WHEN** they enter a malformed or empty email and submit
- **THEN** no Firebase call is made and an inline field validation error is shown (no toast, matching the project rule that pure client-side validation stays inline)

#### Scenario: Unknown email does not leak account existence

- **GIVEN** a visitor submits an email that is not registered in Firebase Auth
- **WHEN** the Firebase reset email call resolves
- **THEN** the UI shows the same in-panel success confirmation without a success toast that it shows for a known email, without revealing whether the account exists

#### Scenario: Firebase request failure shows recoverable error

- **GIVEN** the Firebase password reset email call fails for a recoverable reason (network or Firebase error)
- **WHEN** the error is received
- **THEN** an inline error message is shown AND an error toast is shown via the shared toast helper (manual dismiss), with a `logContext` identifying the send-password-reset action, so the user can retry submission

### Requirement: Recovery Notifications Follow Project Toast And Inline Conventions

The recovery flow SHALL use the shared createAppToast helper for toasts and inline Message components for field/form errors, matching the invite password-setup precedent. Client-side validation stays inline only; failed Firebase API calls surface both inline state and an error toast with a { action, feature } logContext; recovery-request success uses its persistent panel without a duplicate toast, while successful password confirmation retains its success toast and login redirect. Raw passwords SHALL NOT appear in any toast, inline copy, or log output.

#### Scenario: Client-side validation stays inline only

- **GIVEN** a visitor submits the recovery request form with an invalid email, or the reset form with a weak or mismatched password
- **WHEN** the client-side validation rejects the input
- **THEN** an inline field `Message` is shown and no toast is displayed

#### Scenario: Firebase API failures use inline state plus error toast

- **GIVEN** a Firebase call in the recovery flow (send password reset email, verify action code, or confirm new password) fails
- **WHEN** the error is received
- **THEN** an inline error state is shown on the relevant surface AND an error toast is shown via the shared toast helper with a `logContext` of `{ action, feature }` form, requiring manual dismiss

#### Scenario: Recovery request success is quiet beyond its panel

- **GIVEN** the recovery email request is accepted
- **WHEN** the Firebase call resolves successfully
- **THEN** the persistent account-safe check-your-email panel remains visible without a duplicate success toast

#### Scenario: Successes use success toast

- **GIVEN** the new password is confirmed successfully
- **WHEN** the Firebase call resolves successfully
- **THEN** a success toast is shown via the shared toast helper with the default auto-dismiss life and the existing login redirect is preserved

#### Scenario: Passwords never appear in notifications or logs

- **GIVEN** any error or success outcome in the recovery flow
- **WHEN** a toast or inline message is composed
- **THEN** no raw password value appears in the toast summary/detail, the inline `Message` text, or the `logContext`/logger output
