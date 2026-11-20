# Tasks

## 1. Admin web

- [ ] 1.1 Extend `apps/admin-web/src/views/ForbiddenView.spec.ts` with a click test for a member with a single workspace. Configure a user-app URL ending in `/login` and assert navigation to that origin's root. Confirm the test fails on the current handler.
- [ ] 1.2 Exercise the primary action for both admin and PM and assert the named admin dashboard route. Retain coverage for the separate membership switcher.
- [ ] 1.3 Update the admin 403 primary handler to use the existing role-aware dashboard destination logic. Run the view and router tests, then the repository lint, typecheck and unit tests.

## 2. Acceptance

- [ ] 2.1 In a browser, follow issue #555 from the signed-in user dashboard into the admin panel as a member. Click `Back to dashboard` on 403 and confirm the user dashboard opens for the same workspace. Record the destination and result.
- [ ] 2.2 Exercise admin and PM recovery from the standalone 403 page and confirm each reaches the admin dashboard. Check the action labels and conditional workspace switcher against the approved Admin 403 Forbidden frame.
- [ ] 2.3 Run strict OpenSpec validation for `fix-admin-403-dashboard-recovery`.
