## ADDED Requirements

### Requirement: Separate Staging Workers For Frontend Apps

The frontend deployment system SHALL publish `apps/user-web` and `apps/admin-web` as separate Cloudflare Workers Static Assets deployments for staging.

#### Scenario: User web deploys to staging Worker
- **WHEN** the user-web staging deploy workflow runs successfully
- **THEN** the built user-web SPA is served by a dedicated user-web staging Worker
- **AND** the public staging hostname is `https://gitiempo.itsua.dev`

#### Scenario: Admin web deploys to staging Worker
- **WHEN** the admin-web staging deploy workflow runs successfully
- **THEN** the built admin-web SPA is served by a dedicated admin-web staging Worker
- **AND** the public staging hostname is `https://gitiempo-admin.itsua.dev`

### Requirement: SPA Route Fallback
Each staging frontend Worker MUST serve the Vite build output with single-page application fallback so Vue Router history-mode routes work on direct navigation and refresh.

#### Scenario: Unknown route is a frontend route
- **WHEN** a browser requests a non-asset path from either frontend staging hostname
- **THEN** Cloudflare Workers Static Assets returns the deployed SPA entrypoint
- **AND** the frontend router handles the requested path in the browser

### Requirement: Build-Time Staging Configuration
Frontend staging deploys MUST inject environment-specific `VITE_*` values at build time through the staging GitHub Environment or workflow variables, not through committed `.env` files.

#### Scenario: User web staging build receives required values
- **WHEN** the user-web staging deploy workflow builds the app
- **THEN** the build receives `VITE_API_BASE_URL` with value `https://gitiempo.itsua.dev`
- **AND** the build receives `VITE_ADMIN_APP_URL` with value `https://gitiempo-admin.itsua.dev`
- **AND** the build receives the Firebase client configuration values required by the app

#### Scenario: Admin web staging build receives required values
- **WHEN** the admin-web staging deploy workflow builds the app
- **THEN** the build receives `VITE_API_BASE_URL` with value `https://gitiempo.itsua.dev`
- **AND** the build receives `VITE_USER_APP_URL` with value `https://gitiempo.itsua.dev`
- **AND** the build receives the Firebase client configuration values required by the app

### Requirement: Staging Deploy Gates
Each frontend staging deploy workflow MUST run verification gates before publishing assets to Cloudflare.

#### Scenario: Verification passes before deploy
- **WHEN** a frontend staging deploy workflow is triggered
- **THEN** it runs lint, typecheck, tests, and build for the selected frontend app before invoking Wrangler deploy
- **AND** Wrangler deploy runs only after those verification steps succeed

#### Scenario: Verification fails before deploy
- **WHEN** lint, typecheck, tests, or build fails for the selected frontend app
- **THEN** the workflow does not invoke Wrangler deploy

### Requirement: Automatic Staging Deploy Triggers
Frontend automatic staging deploys MUST run from the `staging` branch using app-specific path filters.

#### Scenario: User web relevant change reaches staging branch
- **WHEN** a push to the `staging` branch changes user-web deployment-relevant files
- **THEN** the user-web staging deploy workflow runs
- **AND** the admin-web staging deploy workflow is not required to run unless its own path filters also match

#### Scenario: Admin web relevant change reaches staging branch
- **WHEN** a push to the `staging` branch changes admin-web deployment-relevant files
- **THEN** the admin-web staging deploy workflow runs
- **AND** the user-web staging deploy workflow is not required to run unless its own path filters also match

### Requirement: Manual Staging Deploy Dispatcher
The frontend deployment system SHALL provide a manual staging dispatcher that can deploy `user-web`, `admin-web`, or both apps.

#### Scenario: Manual deploy targets one app
- **WHEN** an operator manually runs the frontend staging deploy workflow with `target` set to `user-web` or `admin-web`
- **THEN** only the selected app is built, verified, and deployed

#### Scenario: Manual deploy targets both apps
- **WHEN** an operator manually runs the frontend staging deploy workflow with `target` set to `both`
- **THEN** both frontend apps are built, verified, and deployed independently

### Requirement: Deployment Guide
The repository MUST document the staging frontend deploy process in a short README guide.

#### Scenario: Operator reads deployment guide
- **WHEN** an operator needs to deploy frontend staging
- **THEN** `README.md` explains the staging hostnames, required GitHub Environment values, automatic trigger behavior, manual dispatch behavior, and the rule that implementation work must not run a live deploy
