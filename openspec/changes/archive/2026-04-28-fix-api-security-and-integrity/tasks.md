## 1. Secure Invite Delivery Fallback Default

- [x] 1.1 Change `INVITES_EMAIL_CONSOLE_FALLBACK` Zod default from `'true'` to `'false'` in `apps/api/src/config/env.validation.ts`
- [x] 1.2 Add a `NODE_ENV === 'production'` guard in `InviteDeliveryService.deliver()` that forces `consoleFallback = false`, overriding any env var value
- [x] 1.3 Update `apps/api/.env.example` — change default to `false` and add comment explaining the production hard-block

## 2. Last-Admin Race Condition Fix

- [x] 2.1 Add a `SELECT ... FOR UPDATE` lock on admin member rows in `assertCanLoseAdminRole()` using Drizzle's `.for('update')` before the count query, scoped to the workspace's admin memberships
- [x] 2.2 Verify that `updateMemberRole()` and `removeMember()` both pass `tx` (transaction reference) through to `assertCanLoseAdminRole()` so the lock participates in the same transaction

## 3. Invite Delivery Failure Compensation

- [x] 3.1 Wrap `this.delivery.deliver(...)` in a try/catch inside `InvitesService.createInvite()`
- [x] 3.2 In the catch block, transition the just-created invite to `'expired'` status (reuse cancel semantics) and re-throw the error
- [x] 3.3 Ensure the compensation runs against the same `this.db` outside the transaction boundary (or within if delivery is moved inside)

## 4. Verification

- [x] 4.1 Add/update unit tests for `InviteDeliveryService` confirming that `NODE_ENV=production` forces SMTP even when `INVITES_EMAIL_CONSOLE_FALLBACK=true`
- [x] 4.2 Add/update unit tests for `MembersService.assertCanLoseAdminRole` confirming the lock is acquired within the transaction
- [x] 4.3 Add unit test for `InvitesService.createInvite` confirming invite is expired when delivery throws
- [x] 4.4 Add unit test for `InvitesService.createInvite` confirming retry succeeds after previous delivery failure expired the invite
- [x] 4.5 Run `pnpm --filter @gitiempo/api lint && pnpm --filter @gitiempo/api typecheck && pnpm --filter @gitiempo/api test`
