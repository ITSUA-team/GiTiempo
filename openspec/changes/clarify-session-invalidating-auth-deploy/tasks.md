## 1. OpenSpec Alignment

- [x] 1.1 Keep `openspec/specs/api-vps-docker-deploy/spec.md` free of this branch-only forced-logout requirement until the change is applied or archived.
- [x] 1.2 Add a delta spec under `openspec/changes/clarify-session-invalidating-auth-deploy/specs/api-vps-docker-deploy/spec.md` that captures session-invalidating migration handling as active deploy behavior.
- [x] 1.3 Document the rationale in `proposal.md` and `design.md`, including why this change stays out of canonical specs for now.
- [x] 1.4 Add an auth delta spec under `openspec/changes/clarify-session-invalidating-auth-deploy/specs/auth/spec.md` documenting that refresh tokens stay bound to the workspace membership selected at issuance and that refresh is rejected when that exact membership no longer exists.

## 2. Release Documentation

- [x] 2.1 Keep the intent comment in `apps/api/drizzle/0013_jazzy_thanos.sql` so the destructive session reset is explicit at the migration site.
- [x] 2.2 Update `docs/deployment.md` so operators treat forced logout as planned release behavior when a committed migration cannot preserve persisted sessions safely.

## 3. Verification

- [x] 3.1 Run `openspec validate clarify-session-invalidating-auth-deploy --strict --no-interactive`.
- [x] 3.2 Run `git diff --check`.
