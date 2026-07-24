## ADDED Requirements

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

### Requirement: Landing Staging Deploy Gates

The landing staging deploy workflow MUST run landing lint, typecheck, tests, and build before publishing assets to Cloudflare.

#### Scenario: Landing verification passes before deploy

- **WHEN** all landing verification commands succeed
- **THEN** the workflow may invoke Wrangler to deploy the generated static assets

#### Scenario: Landing verification fails before deploy

- **WHEN** any landing lint, typecheck, test, configuration validation, or build command fails
- **THEN** the workflow does not invoke Wrangler deploy

### Requirement: Landing-Specific Automatic Trigger

Landing automatic staging deploys MUST run from the `staging` branch using landing-specific dependency and workflow path filters.

#### Scenario: Landing-relevant change reaches staging

- **WHEN** a push to `staging` changes landing source, shared visual tokens, workspace manifests, landing target detection, or the landing deploy workflow
- **THEN** the landing staging deploy workflow runs
- **AND** the user-web and admin-web deploy workflows are not required to run unless their own path filters match

#### Scenario: Unrelated application change reaches staging

- **WHEN** a push to `staging` changes no landing deployment-relevant path
- **THEN** the landing staging deploy workflow does not publish a new landing build

### Requirement: Manual Landing Staging Deploy

The frontend deployment system SHALL provide a manual landing staging dispatch with an optional branch, tag, or SHA ref.

#### Scenario: Operator manually deploys landing

- **WHEN** an operator manually runs the landing staging workflow
- **THEN** only landing-web is verified and deployed from the selected ref
