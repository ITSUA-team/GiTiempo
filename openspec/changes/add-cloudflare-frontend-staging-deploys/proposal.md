## Why

The repository already documents Cloudflare Workers Static Assets as the frontend hosting target, but there are no app-owned Wrangler configs, GitHub Actions workflows, or deploy guide for publishing the two Vue SPAs to staging. Adding staging-only deploy infrastructure lets `user-web` and `admin-web` be released independently without coupling frontend releases to the API VPS rollout.

## What Changes

- Add staging Cloudflare Workers Static Assets configuration for `apps/user-web` and `apps/admin-web`.
- Serve Vite `dist/` output with SPA fallback so direct browser visits to Vue Router history routes return `index.html`.
- Route staging traffic through the `itsua.dev` Cloudflare zone:
  - `user-web`: `https://gitiempo.itsua.dev`
  - `admin-web`: `https://gitiempo-admin.itsua.dev`
- Add GitHub Actions deployment workflows for staging only:
  - app-owned automatic workflows for affected `user-web` and `admin-web` changes on the `staging` branch
  - a manual frontend staging dispatcher with `target=user-web|admin-web|both`
  - a reusable workflow that contains shared install, check, build, and Wrangler deploy logic
- Inject frontend `VITE_*` values at build time through the staging GitHub Environment.
- Add a short README deployment guide documenting local prerequisites, required GitHub Environment values, manual dispatch, automatic deploy behavior, and the explicit rule that implementation must not trigger an actual deploy.

## Capabilities

### New Capabilities

- `frontend-staging-deploys`: Staging deployment behavior for the two frontend SPAs on Cloudflare Workers Static Assets.

### Modified Capabilities

None.

## Impact

- Adds Wrangler configuration under `apps/user-web` and `apps/admin-web`.
- Adds GitHub Actions workflow files under `.github/workflows`.
- Adds frontend deployment documentation, including the short staging deploy guide requested for `README.md`.
- Requires staging GitHub Environment configuration for Cloudflare credentials and build-time frontend variables.
- Requires Firebase Auth authorized domains to include the staging frontend hostnames before login can work end-to-end.
- Does not run a deploy as part of this OpenSpec change or implementation task.
