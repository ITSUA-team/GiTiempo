# Tasks

## 1. Admin web

- [x] 1.1 Extend `apps/admin-web/src/views/ForbiddenView.spec.ts` with a click test for a member with a single workspace. Configure a user-app URL ending in `/login` and assert navigation to that origin's root. Confirm the test fails on the current handler.
- [x] 1.2 Exercise the primary action for both admin and PM and assert the named admin dashboard route. Retain coverage for the separate membership switcher.
- [x] 1.3 Update the admin 403 primary handler to use the existing role-aware dashboard destination logic. Run the view and router tests, then the repository lint, typecheck and unit tests.

## 2. Acceptance

- [x] 2.1 In a browser, follow issue #555 from the signed-in user dashboard into the admin panel as a member. Click `Back to dashboard` on 403 and confirm the user dashboard opens for the same workspace. Record the destination and result.
- [x] 2.2 Exercise admin and PM recovery from the standalone 403 page and confirm each reaches the admin dashboard. Check the action labels and conditional workspace switcher against the approved Admin 403 Forbidden frame.
- [x] 2.3 Run strict OpenSpec validation for `fix-admin-403-dashboard-recovery`.

### Browser results

Checked revision `25422e2d` with the implementation diff in an isolated local environment using both web apps, PostgreSQL, and the Firebase Auth Emulator.

- **PASS · Member.** From the signed-in user dashboard, opened `Admin workspace` and signed into the admin app with the same test account. The app opened `http://localhost:15554/403`. `Back to dashboard` returned to `http://localhost:15553/?focusPeriod=week` with the same account and its sole workspace.
- **PASS · Admin and PM.** From the standalone 403 page, each role reached the admin dashboard at `http://localhost:15554/`. The admin with two memberships could open and close `Switch workspace`. The PM and member with one membership each saw only `Back to dashboard`, consistent with the approved Admin 403 Forbidden frame.
