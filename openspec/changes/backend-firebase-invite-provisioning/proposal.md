## Why

Firebase email/password self-signup is disabled for the project, so the current invite accept flow cannot create first-time Firebase users from the browser and fails with `ADMIN_ONLY_OPERATION`. Invite onboarding needs to remain invite-only while allowing admins to invite new email/password users without sending or storing raw passwords in the application database.

## What Changes

- Provision invited Firebase identities from the backend with the Firebase Admin SDK during invite creation/delivery instead of calling browser Firebase self-signup from the User SPA.
- Generate and deliver a Firebase password setup/reset action link with the invite email for first-time email/password invitees, configured to open an app-hosted password setup page.
- Keep `POST /invites/accept` as the membership-creation boundary after Firebase sign-in returns an ID token.
- Update the User SPA invite accept flow to sign in and accept only; remove the browser create-account form and confirm-password field.
- Add an app-hosted password setup route that handles Firebase reset action codes with the Firebase browser SDK, then returns the user to the invite accept link.
- Preserve Google sign-in as an alternative identity path when the returned Firebase identity email matches the invite email.
- Keep passwords entirely outside GiTiempo APIs and storage.

## Capabilities

### New Capabilities
- `firebase-invite-provisioning`: Backend Firebase Admin SDK provisioning and app-targeted password setup/reset action-link delivery for invited users.

### Modified Capabilities
- `workspace-invites`: Invite delivery and acceptance requirements change from frontend Firebase self-signup to backend-provisioned Firebase identities plus sign-in-based acceptance.
- `frontend-auth`: Invite accept UI and auth flow change from browser account creation to app-hosted password setup plus sign-in-based invite acceptance.

## Impact

- Backend: `apps/api` invite creation/delivery services, Firebase Admin abstraction/real/fake providers, tests, action-code settings/continue URL handling, environment/config validation if Firebase action-code settings require new values.
- Contracts/OpenAPI: likely unchanged for `POST /invites/accept`; shared contracts should be updated only if a resend/setup endpoint is introduced.
- Frontend: `apps/user-web` invite accept route, app-hosted password setup route, tests, and shared Firebase runtime usage to remove invite self-signup behavior while confirming password resets through Firebase only.
- Docs/design: already updated docs and approved `GITiempo.pen` should remain the parity source for implementation.
- External systems: Firebase Admin SDK user creation/reuse and password reset/setup link generation; SMTP invite delivery includes both invite accept and password setup guidance.
