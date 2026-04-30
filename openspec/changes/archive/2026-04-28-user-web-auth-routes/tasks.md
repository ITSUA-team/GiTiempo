## 1. Router And Shell Structure

- [x] 1.1 Extract the user-web router from `src/main.ts` into `src/router/index.ts` and define routes for `/login`, dashboard, timer, time entries, project view, and profile.
- [x] 1.2 Add route metadata for guest-only and authenticated routes and implement the global auth navigation guard.
- [x] 1.3 Create the authenticated app-shell layout component with the documented top bar, sidebar, and main-content container for protected routes.
- [x] 1.4 Add stub protected views or placeholders so every documented member route mounts through the shell.

## 2. Auth Session Bootstrap

- [x] 2.1 Add a user-web auth store in `src/stores/` that owns access token state, refresh token persistence, bootstrap status, and authenticated/anonymous session flags.
- [x] 2.2 Implement Firebase-to-backend login exchange actions for email/password and Google sign-in flows.
- [x] 2.3 Implement refresh-token-based session restoration and logout cleanup behavior in the auth store.
- [x] 2.4 Wire startup bootstrap into app initialization so the first protected navigation waits for session normalization.

## 3. Login Entry UI

- [x] 3.1 Create `LoginView.vue` to match the approved `GITiempo.pen` Login screen structure and project UI tokens.
- [x] 3.2 Connect the login form and Google continuation action to the auth store and post-login redirect behavior.
- [x] 3.3 Render unsupported secondary affordances from the design, such as `Forgot?`, in a safe MVP state until recovery flow requirements exist.

## 4. Verification

- [x] 4.1 Add or update focused tests for auth store bootstrap behavior and router redirect rules.
- [x] 4.2 Verify anonymous access redirects to `/login` and authenticated access redirects away from `/login` to the default protected route.
- [x] 4.3 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck` and resolve any issues.
- [x] 4.4 Add `apps/user-web/.env.example` documenting the required frontend auth environment variables.
