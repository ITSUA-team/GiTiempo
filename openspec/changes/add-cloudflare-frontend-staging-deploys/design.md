## Context

`docs/deployment.md` and ADR 005 already define Cloudflare Workers Static Assets as the frontend hosting target for both Vue/Vite SPAs. The current repo has Vue Router history-mode routes, Vite build scripts, shared frontend packages, and a root `wrangler` dev dependency, but it does not yet have app-local Wrangler configuration or GitHub Actions workflows.

This change is staging-only. Production routes, production approvals, and API deployment are deliberately excluded. The staging user app hostname is `gitiempo.itsua.dev`; the staging admin app hostname is `gitiempo-admin.itsua.dev`. The staging frontend API base URL is `https://gitiempo.itsua.dev` unless later API deployment work changes the public staging API URL.

Affected areas:

- `apps/user-web`: app-local Wrangler config and staging deploy target.
- `apps/admin-web`: app-local Wrangler config and staging deploy target.
- `.github/workflows`: reusable deploy workflow, app-owned automatic workflows, and manual staging dispatcher.
- `README.md`: short staging deploy guide.

## Goals / Non-Goals

**Goals:**

- Add staging-only Cloudflare Workers Static Assets deployment configuration for both frontend SPAs.
- Ensure direct visits to Vue Router history routes work by using Workers Static Assets SPA fallback.
- Use custom hostnames under the Cloudflare-managed `itsua.dev` zone.
- Keep `user-web` and `admin-web` deployable independently.
- Support automatic staging deploys from the `staging` branch with app-specific path filters.
- Support manual staging deploys for `user-web`, `admin-web`, or both apps.
- Keep shared deploy logic in one reusable workflow to avoid duplicating install/check/build/deploy steps.
- Document required setup and deploy commands briefly in `README.md`.

**Non-Goals:**

- Do not configure production frontend deployment.
- Do not run `wrangler deploy` during implementation of this change.
- Do not deploy or configure the API VPS.
- Do not add runtime Worker logic or an API proxy in the frontend Workers.
- Do not store real secrets or environment-specific credentials in the repository.
- Do not solve Firebase configuration beyond documenting that staging hostnames must be authorized.

## Decisions

### Use Workers Static Assets with app-local Wrangler configs

Each app gets its own Wrangler configuration in its app directory. The config points at `./dist` so the deploy command can run from the app directory after the Vite build completes. Each config includes:

- app-specific Worker name
- `compatibility_date`
- `[assets] directory = "./dist"`
- `[assets] not_found_handling = "single-page-application"`
- staging route under `itsua.dev`

Rationale: app-local config matches `docs/deployment.md`, keeps each SPA independently deployable, and avoids root-relative path ambiguity.

Alternative considered: one root Wrangler config for both apps. This was rejected because Wrangler deploy targets and asset directories are app-specific, and root-level config would make independent deploy ownership less clear.

### Use Wrangler-managed custom hostnames under `itsua.dev`

Wrangler staging config should bind Workers to these custom-domain hostnames:

- `gitiempo.itsua.dev` for `user-web`
- `gitiempo-admin.itsua.dev` for `admin-web`

Rationale: the Cloudflare account already manages `itsua.dev`, so Wrangler can attach Workers to hostnames in that zone during deploy. The implementation should use route config with `zone_name = "itsua.dev"` and `custom_domain = true` instead of requiring `*.workers.dev` URLs or manually maintained dashboard-only hostname bindings.

Alternative considered: deploy to `workers.dev` first and add custom hostnames manually later. This was rejected because the staging target hostnames are already known and should be represented as source-controlled deployment intent.

### Inject Vite configuration at build time through GitHub Environment values

The deployment workflows pass `VITE_*` values into the build step. For staging:

- both apps use `VITE_API_BASE_URL=https://gitiempo.itsua.dev`
- `user-web` uses `VITE_ADMIN_APP_URL=https://gitiempo-admin.itsua.dev`
- `admin-web` uses `VITE_USER_APP_URL=https://gitiempo.itsua.dev`
- Firebase client values come from the staging GitHub Environment once configured

Rationale: Vite embeds `VITE_*` values at build time. Worker runtime vars or secrets would not update already-built frontend bundles.

Alternative considered: Worker runtime bootstrap config. This is intentionally deferred; ADR 005 keeps room for edge logic later, but this staging change does not need it.

### Use hybrid reusable GitHub Actions workflows

The workflow structure should be:

- reusable workflow: performs checkout, pnpm install, lint, typecheck, tests, build, and Wrangler deploy for one app
- `deploy-user-web-staging`: automatic app-owned workflow for `user-web` path filters on the `staging` branch
- `deploy-admin-web-staging`: automatic app-owned workflow for `admin-web` path filters on the `staging` branch
- `deploy-frontend-staging`: manual dispatcher with `target=user-web|admin-web|both`

Rationale: this preserves app-owned automatic workflows while avoiding duplicated deploy logic and satisfying the documented manual `target` behavior.

Alternative considered: one matrix workflow for everything. This was rejected because app ownership and path filters become less explicit.

Alternative considered: two fully duplicated app workflows. This was rejected because install/check/build/deploy logic would drift.

### Use Turbo-aware checks before deploy

Deploy workflows must install with pnpm and run app-focused gates before `wrangler deploy`. Because direct filtered commands may not build workspace dependencies the same way as root Turbo tasks, the reusable workflow should either run Turbo-filtered tasks or explicitly run the affected app commands after dependencies are available. The deployment gate must include lint, typecheck, tests, and build for the selected app.

Rationale: docs require lint/typecheck/tests before deployment, and both SPAs depend on shared workspace packages.

## Risks / Trade-offs

- Firebase authorized domains not ready -> Login fails after deploy. Mitigation: document `gitiempo.itsua.dev` and `gitiempo-admin.itsua.dev` as required Firebase authorized domains before smoke testing auth.
- `VITE_API_BASE_URL` points at the user frontend hostname while the API staging URL is not finalized -> API calls may fail until backend staging routing exists. Mitigation: treat `VITE_API_BASE_URL` as a staging GitHub Environment value and document it as the current agreed placeholder/value.
- Wrangler custom-domain deployment may require Cloudflare token permissions beyond basic Worker deploy -> First deploy can fail. Mitigation: document that the API token must cover Workers deploy and route/custom-domain management for the `itsua.dev` zone.
- Automatic deploys can publish incomplete staging builds if branch hygiene is weak -> Staging instability. Mitigation: keep deploy gates in the workflow before `wrangler deploy` and limit automatic triggers to the `staging` branch.
- Custom hostname behavior can vary depending on Cloudflare account setup -> First deploy might require DNS/route verification. Mitigation: keep routes source-controlled and do the first deploy manually after Cloudflare/Firebase settings are ready.

## Migration Plan

1. Add app-local Wrangler configs for `user-web` and `admin-web` staging.
2. Add GitHub Actions reusable and staging dispatcher workflows without running them locally.
3. Add `README.md` staging deploy guide.
4. Verify local builds and checks only; do not run a live deploy in the implementation task.
5. After Firebase authorized domains and GitHub Environment values are prepared, trigger `deploy-frontend-staging` manually.
6. Validate that both staging hostnames serve app routes and that direct route refreshes return the SPA.

Rollback is Cloudflare-side: redeploy a previous Worker version or rerun the workflow from a known-good ref. Because this change only adds static frontend deployment infrastructure, there is no database or API migration rollback.

## Open Questions

- Is `https://gitiempo.itsua.dev` permanently the staging API base URL, or will API staging later move to a distinct API hostname?
- Which exact GitHub Environment variable names will be used for Firebase client values if the repository already has naming conventions outside the current docs?
