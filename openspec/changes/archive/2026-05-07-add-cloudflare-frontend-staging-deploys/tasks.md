## 1. Wrangler Configuration

- [x] 1.1 Add `apps/user-web/wrangler.toml` for the staging Worker Static Assets deployment with `./dist` assets and SPA fallback.
- [x] 1.2 Add the user-web staging custom-domain route for `gitiempo.itsua.dev` in the `itsua.dev` Cloudflare zone.
- [x] 1.3 Add `apps/admin-web/wrangler.toml` for the staging Worker Static Assets deployment with `./dist` assets and SPA fallback.
- [x] 1.4 Add the admin-web staging custom-domain route for `gitiempo-admin.itsua.dev` in the `itsua.dev` Cloudflare zone.

## 2. GitHub Actions Workflows

- [x] 2.1 Add a reusable frontend staging deploy workflow that accepts the app target and runs install, lint, typecheck, tests, build, and Wrangler deploy for one SPA.
- [x] 2.2 Configure the reusable workflow to read staging build-time `VITE_*` values, including `VITE_API_BASE_URL=https://gitiempo-api.itsua.dev`, counterpart app URLs, and Firebase client values from the staging GitHub Environment.
- [x] 2.3 Add the app-owned automatic `user-web` staging deploy workflow with `staging` branch and user-web/shared frontend path filters.
- [x] 2.4 Add the app-owned automatic `admin-web` staging deploy workflow with `staging` branch and admin-web/shared frontend path filters.
- [x] 2.5 Add the manual frontend staging dispatcher with `target=user-web|admin-web|both`.

## 3. Documentation

- [x] 3.1 Add a short `README.md` guide for frontend staging deploys, including hostnames, required GitHub Environment values, Firebase authorized domains, automatic triggers, and manual dispatcher usage.
- [x] 3.2 Document that implementation of this change must not run a live deploy; the first live deploy is a separate operator action after GitHub/Firebase/Cloudflare setup is ready.
- [x] 3.3 Document the shared staging GitHub Environment example at `deploy/github-environment.staging.example.env`.

## 4. Verification

- [x] 4.1 Verify `pnpm --filter user-web lint`, `pnpm --filter user-web typecheck`, `pnpm --filter user-web test`, and `pnpm --filter user-web build` locally.
- [x] 4.2 Verify `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, `pnpm --filter admin-web test`, and `pnpm --filter admin-web build` locally.
- [x] 4.3 Validate the OpenSpec change with `openspec validate add-cloudflare-frontend-staging-deploys --strict`.
- [x] 4.4 Do not run `wrangler deploy` as part of verification for this implementation.
