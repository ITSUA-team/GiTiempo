## Why

Code review identified three security and data-integrity issues in `apps/api`: invite tokens leak into logs by default, the last-admin invariant is vulnerable to race conditions under concurrent mutations, and failed email delivery leaves orphaned pending invites that cannot be retried. All three violate documented invariants and should be fixed before the next release.

## What Changes

- **P0 — Secure invite delivery fallback default**: Change `INVITES_EMAIL_CONSOLE_FALLBACK` default from `true` to `false` so production never logs raw invite URLs/tokens unless explicitly opted in. Add a `NODE_ENV` guard so the console fallback is only usable outside production.
- **P1 — Last-admin race condition fix**: Serialize admin-role mutations (demote, remove) per workspace using a `SELECT ... FOR UPDATE` lock on the workspace's admin member rows before counting, preventing concurrent requests from both passing the last-admin check and leaving zero admins.
- **P1 — Orphan invite compensation on delivery failure**: In `createInvite()`, catch delivery errors and immediately cancel the just-created pending invite, so a retry produces a fresh invite instead of hitting "Pending invite already exists".

## Capabilities

### New Capabilities

_(none — all fixes target existing capabilities)_

### Modified Capabilities

- `workspace-membership`: last-admin invariant must be enforced under concurrent mutations via row-level locking
- `workspace-invites`: delivery fallback must default to safe (no token logging); invite creation must compensate on delivery failure

## Impact

- **Backend (`apps/api`)**: `invite-delivery.service.ts`, `invites.service.ts`, `members.service.ts`, `env.validation.ts`
- **Config**: `apps/api/.env.example` — update default and comment for `INVITES_EMAIL_CONSOLE_FALLBACK`
- **Tests**: unit tests for compensation logic, e2e tests for race-condition scenarios
- **No contract/API-shape changes** — all fixes are server-side behavioral corrections
