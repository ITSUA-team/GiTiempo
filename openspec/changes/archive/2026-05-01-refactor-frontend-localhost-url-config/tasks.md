## 1. Frontend URL source of truth

- [x] 1.1 Decide and implement the steady-state counterpart workspace URL strategy in `packages/web-shared` and the two SPAs using explicit frontend env configuration.
- [x] 1.2 Remove duplicated inline localhost port literals from `apps/user-web` and `apps/admin-web` shell and login surfaces.
- [x] 1.3 Align `apps/user-web/.env.example` and `apps/admin-web/.env.example` so both document the expected counterpart workspace URL for local development.

## 2. Frontend tests and tooling alignment

- [x] 2.1 Update workspace-link and shared component tests in `packages/web-shared` to follow the new counterpart URL source of truth.
- [x] 2.2 Update `user-web` and `admin-web` view and shell tests to assert the new counterpart URL behavior without duplicating ad hoc localhost assumptions.
- [x] 2.3 Update any frontend-only test environment config that embeds counterpart SPA localhost URLs so it matches the chosen strategy.

## 3. Verification

- [x] 3.1 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck && pnpm --filter user-web test`.
- [x] 3.2 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck && pnpm --filter admin-web test`.
- [x] 3.3 Run `pnpm --filter @gitiempo/web-shared lint && pnpm --filter @gitiempo/web-shared typecheck && pnpm --filter @gitiempo/web-shared test`.
