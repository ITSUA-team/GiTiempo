# Tasks

## 1. Docs and design

- [x] 1.1 Update the Members section of `docs/ui/pages-admin.md` and the Member settings frame in `GITiempo.pen`. Check the field order, role choices, Admin access message, PM invoice toggle, shared save and self-removal visibility against issue #465.

## 2. API and effective permissions

- [x] 2.1 Cover promotion, demoting self or another admin, cross-workspace rejection and PM/Member denial via the existing members endpoint. Verify the stored memberships and account/workspace identity after renewal.
- [x] 2.2 Verify that a previously issued admin token can no longer perform admin-only operations after demotion. Exercise both member management and a representative protected operation outside Members. Correct any authorization gaps and rerun the affected API suites.
- [x] 2.3 Verify last-admin demotion and deletion conflicts in the isolated PostgreSQL e2e suite, including competing demotions and a demotion racing with removal. Confirm at least one admin remains and rejected writes leave the target intact.

## 3. Admin-web

- [x] 3.1 Separate open-settings and removal eligibility in the row model, table, mobile cards and view. Test opening self and another admin, with removal absent for self.
- [x] 3.2 Add the role selector, typed submit event and shared Save changes action to the member form. Test cancel, role-only and combined saves, Admin access copy, Member/PM assignments and PM invoice permissions.
- [x] 3.3 Connect the role action to the existing membership client. Test the membership ID and selected role, failed saves, in-place updates to items and counters after success, and switching account/workspace while a save is pending.
- [x] 3.4 Handle successful self-demotion before a members reload. Renew the session, reconcile the profile and route, and clear privileged data. Test both new roles, refresh failure, and recovery after an uncertain write outcome without restoring stale privileges.
- [x] 3.5 Exercise promotion and a rejected last-admin demotion through the assembled Members view on desktop and mobile. Compare both layouts with the updated design and record any remaining differences.

## 4. Integration verification

- [x] 4.1 Run workspace lint, typecheck and unit tests, plus the isolated API e2e suite. If shared session or router code changes, verify both web apps' suites.
- [x] 4.2 With two admins in a test workspace, promote another member, step down, and verify the current account immediately loses admin access. Repeat with a sole admin and confirm the rejection leaves the role intact. Run strict OpenSpec validation.

## Verification notes

The assembled Members view tests cover promotion and last-admin rejection in both layouts. In local Chrome at 1440 × 1000, one click on `Save changes` changed a Member to PM and assigned one project. At 390 × 844, the same button handled promotion, redirected a self-demoted admin to `/403`, and kept the sole admin’s form open when demotion was rejected. The field order and shared footer action match the updated desktop and mobile design frames.

An in-place update check in local Chrome confirmed that a combined save sent only the role update and assignment writes on desktop. A mobile role save sent only the role update. The edited item and relevant counters updated immediately in both layouts.
