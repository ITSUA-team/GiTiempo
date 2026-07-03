## Why

The current branch adds workspace-bound refresh tokens and a migration that intentionally invalidates existing sessions because legacy rows cannot be assigned a required workspace safely. That behavior should be documented as an active auth and release/deploy change before canonical OpenSpec specs are synchronized.

## What Changes

- Document session-invalidating auth migrations as planned release behavior for this change instead of editing the canonical deploy spec directly.
- Define that deploy and release documentation must call out expected forced logout behavior before rollout when a committed migration cannot preserve persisted sessions safely.
- Document that persisted refresh tokens are bound to the workspace membership selected at issuance, and that refresh fails when that exact membership no longer exists.
- Keep the operational deployment guide aligned with the branch behavior while the change remains active.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-vps-docker-deploy`: Clarify how deploy documentation and operators handle a committed migration that intentionally invalidates persisted app sessions.
- `auth`: Clarify that refresh tokens remain bound to the workspace membership selected at issuance, and that refresh rejects tokens whose exact membership has been removed.

## Impact

- OpenSpec change artifacts under `openspec/changes/clarify-session-invalidating-auth-deploy/`
- Auth refresh-token behavior spec delta under `openspec/changes/clarify-session-invalidating-auth-deploy/specs/auth/spec.md`
- Deployment documentation in `docs/deployment.md`
- Auth refresh-token schema, repository, and service behavior under `apps/api/src/auth/`
- Migration intent note in `apps/api/drizzle/0013_jazzy_thanos.sql`
