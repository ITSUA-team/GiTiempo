## Context

The `apps/api` backend was reviewed after the `workflow-and-members` change. Three issues were identified:

1. `INVITES_EMAIL_CONSOLE_FALLBACK` defaults to `true` in `env.validation.ts:78`, so a production deployment without explicit `.env` override will log raw invite URLs containing secret tokens to the console.
2. `MembersService.assertCanLoseAdminRole()` counts admin members then mutates without a lock, allowing concurrent demote/remove operations to both pass the check and leave zero admins.
3. `InvitesService.createInvite()` persists the invite, then calls `delivery.deliver()`. If SMTP fails, the API returns an error but the pending invite remains, making retries impossible ("Pending invite already exists").

Reference: `apps/api/AGENTS.md` for NestJS, Drizzle, and env-validation conventions.

## Goals / Non-Goals

**Goals:**

- Ensure invite tokens are never logged in production unless explicitly opted in
- Guarantee the last-admin invariant under concurrent mutations
- Allow invite retry after a transient delivery failure

**Non-Goals:**

- Partial unique index for duplicate pending invites (tracked separately)
- Centralized membership guard refactor (documented as architectural note, not a bug)
- Outbox/email-queue pattern for delivery — compensation is sufficient for current scale

## Decisions

### D1: Console fallback defaults to `false`, production hard-blocks it

Change the Zod default for `INVITES_EMAIL_CONSOLE_FALLBACK` from `'true'` to `'false'` in `env.validation.ts`. Additionally, add a runtime guard in `InviteDeliveryService.deliver()` that forces `consoleFallback = false` when `NODE_ENV === 'production'`, regardless of the env var value.

**Rationale:** Defence-in-depth. Even if someone copies `.env` incorrectly, production cannot accidentally log tokens.

**Alternative considered:** Only change the default. Rejected — a misconfigured `.env` with `INVITES_EMAIL_CONSOLE_FALLBACK=true` would still leak tokens in production.

### D2: `SELECT ... FOR UPDATE` on admin rows before count-check

Inside the existing transaction in `updateMemberRole()` and `removeMember()`, add a `SELECT ... FOR UPDATE` on `workspace_members` rows where `workspaceId` matches and `role = 'admin'`, before the count-check in `assertCanLoseAdminRole()`.

Drizzle supports `.for('update')` on select queries. This serializes all concurrent admin mutations for the same workspace.

**Rationale:** Minimal change — same transaction boundary, just adds a row lock. No new tables, no serializable isolation level change.

**Alternative considered:** Serializable transaction isolation. Rejected — heavier isolation affects all queries in the transaction, not just the admin-count check.

### D3: Compensation — cancel invite on delivery failure

Wrap `delivery.deliver()` in a try/catch inside `createInvite()`. On failure, update the just-created invite status to `'expired'` (same as manual cancel) and re-throw the error so the API returns 500/502.

**Rationale:** Reuses the existing cancel mechanism. The invite transitions to `expired` (not deleted), preserving audit trail. A retry creates a fresh invite naturally.

**Alternative considered:** Outbox pattern with async retry. Rejected — overengineering for current traffic. If volume grows, this can be revisited.

## Risks / Trade-offs

- **[D2] Lock contention on single-admin workspaces** — `FOR UPDATE` on admin rows is negligible for single-admin workspaces (one row locked). For multi-admin workspaces with frequent role changes, lock duration is bounded by the existing transaction (sub-millisecond). Acceptable trade-off.
- **[D3] Invite creation becomes non-idempotent on delivery failure** — the first call creates+expires, the retry creates a new one. This is actually desirable: each attempt gets a fresh token.
- **[D1] Breaking change for developers relying on console fallback** — developers must now explicitly set `INVITES_EMAIL_CONSOLE_FALLBACK=true` in `.env`. This is intentional and documented.

## Migration Plan

1. Deploy is backward-compatible — no contract changes, no DB migrations
2. Developers need to add `INVITES_EMAIL_CONSOLE_FALLBACK=true` to `.env` if they rely on console delivery (already likely set in existing `.env` files)
3. Update `.env.example` with new default and comment

## Open Questions

_(none — all decisions are resolved)_
