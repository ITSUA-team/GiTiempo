# Frontend Staging Deploys Specification

## Purpose

Define the Cloudflare Workers Static Assets staging deployment requirements for the user and admin frontend apps, including hostnames, SPA fallback behavior, build-time configuration, verification gates, triggers, manual dispatch, and operator documentation.

## Requirements

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

### Requirement: Separate Landing Staging Worker

The frontend deployment system SHALL publish `apps/landing-web` as a separate Cloudflare Workers Static Assets deployment for staging without changing the user-web or admin-web Workers.

#### Scenario: Landing web deploys to staging Worker

- **WHEN** the landing-web staging deploy workflow runs successfully
- **THEN** the built static landing site is served by a dedicated landing-web staging Worker
- **AND** the public staging hostname is `https://gitiempo-landing.itsua.dev`

#### Scenario: Landing deployment remains isolated

- **WHEN** landing-web is deployed
- **THEN** user-web and admin-web are not rebuilt or redeployed
- **AND** their SPA fallback configuration is unchanged

### Requirement: SPA Route Fallback

Each staging frontend Worker MUST serve the Vite build output with single-page application fallback so Vue Router history-mode routes work on direct navigation and refresh.

#### Scenario: Unknown route is a frontend route

- **WHEN** a browser requests a non-asset path from either frontend staging hostname
- **THEN** Cloudflare Workers Static Assets returns the deployed SPA entrypoint
- **AND** the frontend router handles the requested path in the browser

### Requirement: Build-Time Staging Configuration

Frontend staging deploys MUST inject environment-specific `VITE_*` values at build time through the staging GitHub Environment, not through committed `.env` files.

#### Scenario: User web staging build receives required values

- **WHEN** the user-web staging deploy workflow builds the app
- **THEN** the build receives `VITE_API_BASE_URL` from the staging GitHub Environment with value `https://gitiempo-api.itsua.dev`
- **AND** the build receives `VITE_ADMIN_APP_URL` from the staging GitHub Environment with value `https://gitiempo-admin.itsua.dev`
- **AND** the build receives the Firebase client configuration values required by the app

#### Scenario: Admin web staging build receives required values

- **WHEN** the admin-web staging deploy workflow builds the app
- **THEN** the build receives `VITE_API_BASE_URL` from the staging GitHub Environment with value `https://gitiempo-api.itsua.dev`
- **AND** the build receives `VITE_USER_APP_URL` from the staging GitHub Environment with value `https://gitiempo.itsua.dev`
- **AND** the build receives the Firebase client configuration values required by the app

### Requirement: Landing Build-Time Staging Configuration

The landing staging deploy MUST inject the public site origin, user-app entry URL, and admin-app entry URL at build time through the staging GitHub Environment and MUST NOT require Firebase or API configuration.

#### Scenario: Landing staging build receives required values

- **WHEN** the landing-web staging deploy workflow builds the app
- **THEN** the build receives the public site origin `https://gitiempo-landing.itsua.dev`
- **AND** the build receives the user-app entry URL `https://gitiempo.itsua.dev/login`
- **AND** the build receives the configured admin-app entry URL for `https://gitiempo-admin.itsua.dev`

#### Scenario: Landing build is independent of SPA configuration

- **WHEN** the landing workflow validates its environment
- **THEN** it does not require Firebase client values or `VITE_API_BASE_URL`

### Requirement: Staging Deploy Gates

Each frontend staging deploy workflow MUST run verification gates before publishing assets to Cloudflare.

#### Scenario: Verification passes before deploy

- **WHEN** a frontend staging deploy workflow is triggered
- **THEN** it runs lint, typecheck, tests, and build for the selected frontend app before invoking Wrangler deploy
- **AND** Wrangler deploy runs only after those verification steps succeed

#### Scenario: Verification fails before deploy

- **WHEN** lint, typecheck, tests, or build fails for the selected frontend app
- **THEN** the workflow does not invoke Wrangler deploy

### Requirement: Landing Staging Deploy Gates

The landing staging deploy workflow MUST run landing lint, typecheck, tests, and build before publishing assets to Cloudflare.

#### Scenario: Landing verification passes before deploy

- **WHEN** all landing verification commands succeed
- **THEN** the workflow may invoke Wrangler to deploy the generated static assets

#### Scenario: Landing verification fails before deploy

- **WHEN** any landing lint, typecheck, test, configuration validation, or build command fails
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

### Requirement: Landing-Specific Automatic Trigger

Landing automatic staging deploys MUST run from the `staging` branch using landing-specific dependency and workflow path filters.

#### Scenario: Landing-relevant change reaches staging

- **WHEN** a push to `staging` changes landing source, shared visual tokens, workspace manifests, landing target detection, or the landing deploy workflow
- **THEN** the landing staging deploy workflow runs
- **AND** the user-web and admin-web deploy workflows are not required to run unless their own path filters match

#### Scenario: Unrelated application change reaches staging

- **WHEN** a push to `staging` changes no landing deployment-relevant path
- **THEN** the landing staging deploy workflow does not publish a new landing build

### Requirement: Manual Staging Deploy Dispatcher

The frontend deployment system SHALL provide a manual staging dispatcher that can deploy `user-web`, `admin-web`, or both apps.

#### Scenario: Manual deploy targets one app

- **WHEN** an operator manually runs the frontend staging deploy workflow with `target` set to `user-web` or `admin-web`
- **THEN** only the selected app is built, verified, and deployed

#### Scenario: Manual deploy targets both apps

- **WHEN** an operator manually runs the frontend staging deploy workflow with `target` set to `both`
- **THEN** both frontend apps are built, verified, and deployed independently

### Requirement: Manual Landing Staging Deploy

The frontend deployment system SHALL provide a manual landing staging dispatch with an optional branch, tag, or SHA ref.

#### Scenario: Operator manually deploys landing

- **WHEN** an operator manually runs the landing staging workflow
- **THEN** only landing-web is verified and deployed from the selected ref

### Requirement: Deployment Guide

The repository MUST document the staging frontend deploy process in `docs/deployment.md`, with `README.md` linking to that canonical operator guide. The guide MUST explain staging hostnames, required GitHub Environment values and their variable/secret ownership, the shared `deploy/github-environment.staging.example.env` example, automatic trigger behavior, manual dispatch behavior, the rule that implementation work must not run a live deploy, and independent rollback for each frontend app.

#### Scenario: Operator reads deployment guide

- **WHEN** an operator needs to deploy or roll back frontend staging
- **THEN** `docs/deployment.md` explains the landing, user-web, and admin-web staging hostnames and required GitHub Environment configuration
- **AND** it explains the separate landing workflow and its manual dispatch behavior
- **AND** it states that a landing rollback redeploys only a previously published landing Worker version
- **AND** it states that implementation and local verification do not invoke a live deployment
