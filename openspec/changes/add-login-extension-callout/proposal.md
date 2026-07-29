## Why

The redesigned auth screens introduced a `Browser extension` callout on the user login page — a puzzle-icon card reading "Track time right from your browser" with a forward arrow. It exists in the approved `.pen` screens but nowhere in the app, so the one moment a user is guaranteed to be looking at GiTiempo in a browser passes without telling them the Chrome extension exists. The same redesign changed the visual language of all four auth screens without any of it reaching `docs/ui`, which `apps/user-web` treats as the UI source of truth.

## What Changes

- Add the `Browser extension` callout to the user login page's intro panel, directly below the feature highlights, matching the approved `Login Page` `.pen` screen.
- Give the shared auth intro panel an optional content slot so the callout can be supplied by the user app alone; the admin login and the register screens keep no callout, as their approved screens show none.
- Point the callout at the public landing section that describes the Chrome extension, opened in a new tab so an in-progress sign-in is never interrupted.
- Introduce a landing URL configuration value for `apps/user-web`, following the existing `VITE_ADMIN_APP_URL` pattern for cross-app destinations.
- Render the callout only when that destination is configured, so environments without a deployed landing show no dead link.
- Update `docs/ui/pages-user.md` to describe the callout and the restyled auth visual system the redesign introduced.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `user-pages`: the `Login Entry Page` requirement gains the browser-extension callout as part of the approved login entry design.

## Impact

- Affected app: `apps/user-web` (login view, configuration, tests).
- Affected package: `packages/web-shared` — `AuthIntroPanel` gains one optional slot. The addition is backward compatible, so `apps/admin-web` renders exactly as it does today.
- Affected configuration: a new `VITE_LANDING_URL` build-time value in `apps/user-web/.env.example` and the deployment environment tables in `docs/deployment.md`.
- Affected source-of-truth: `openspec/specs/user-pages/spec.md` through this change's delta spec, `docs/ui/pages-user.md`, and the approved `GITiempo.pen` auth screens.
- No API, OpenAPI, database, or shared contract changes: the callout is a static outbound link.
- No `apps/landing-web` changes: the callout targets the existing extension content anchor on the landing page.
