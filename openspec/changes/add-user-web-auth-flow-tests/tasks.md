## 1. Auth Store Flow Coverage

- [x] 1.1 Extend `apps/user-web/src/stores/auth.spec.ts` to cover failed login exchange handling without leaving stale authenticated state behind
- [x] 1.2 Extend `apps/user-web/src/stores/auth.spec.ts` to verify refresh-based bootstrap restoration and rejected-refresh fallback against the documented frontend auth model
- [x] 1.3 Extend `apps/user-web/src/stores/auth.spec.ts` to verify logout returns the store to guest state for both successful and failing backend logout calls

## 2. Router Guard Coverage

- [x] 2.1 Extend `apps/user-web/src/router/index.spec.ts` to verify anonymous users are redirected from protected routes to `/login` with the requested destination preserved
- [x] 2.2 Extend `apps/user-web/src/router/index.spec.ts` to verify authenticated users are redirected away from `/login` to the default protected route or preserved redirect target

## 3. Verification And Gap Documentation

- [x] 3.1 Document the remaining user-web auth test gaps that still require future browser-level end-to-end coverage
- [x] 3.2 Run `pnpm --filter user-web test`, `pnpm --filter user-web lint`, and `pnpm --filter user-web typecheck` and resolve any issues
