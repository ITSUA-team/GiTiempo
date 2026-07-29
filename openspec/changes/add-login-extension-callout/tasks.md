## 1. Configuration

- [x] 1.1 Add an optional `VITE_LANDING_URL` build-time value to the user-web environment typing and runtime config, following the `VITE_ADMIN_APP_URL` pattern.
- [x] 1.2 Resolve the landing extension destination in a single helper so the section anchor lives in one place rather than in the view markup.
- [x] 1.3 Add `VITE_LANDING_URL` to `apps/user-web/.env.example` with a comment stating it is optional and hides the callout when unset.
- [x] 1.4 Add unit coverage for the resolved destination: configured origin, trailing-slash origin, unset value, and an unparseable value.

## 2. Shared Intro Panel

- [x] 2.1 Add one optional slot to `AuthIntroPanel` after the feature cards, so an app can place extra intro content without the panel knowing what it is.
- [x] 2.2 Confirm the panel renders unchanged when the slot is not filled, keeping `apps/admin-web` untouched.
- [x] 2.3 Add a web-shared test covering both the filled and unfilled slot.

## 3. Login Callout

- [x] 3.1 Render the browser-extension callout from the user login view into the intro-panel slot, matching the approved `Login Page` `.pen` screen: puzzle icon, `Browser extension` title, `Track time right from your browser` subtitle, and forward arrow.
- [x] 3.2 Open the destination in a new tab with `rel="noreferrer"` so an in-progress sign-in is preserved.
- [x] 3.3 Omit the callout entirely when no destination is configured, leaving no placeholder or inactive link.
- [x] 3.4 Give the callout an accessible name that conveys it opens in a new tab.

## 4. Tests

- [x] 4.1 Add a login view test asserting the callout renders with the configured destination and the documented copy.
- [x] 4.2 Add a login view test asserting the callout is absent when the destination is unset.
- [x] 4.3 Assert the callout stays outside the sign-in form and does not disturb the existing sign-in actions.

## 5. Docs And Design

- [x] 5.1 Document the callout in the `docs/ui/pages-user.md` login section, including its placement in the intro panel, the landing anchor target, and the hidden-when-unconfigured behavior.
- [x] 5.2 Record the restyled auth visual system introduced by the redesign in `docs/ui/pages-user.md` so the doc matches the approved `.pen` auth screens.
- [x] 5.3 Add `VITE_LANDING_URL` to the frontend environment table in `docs/deployment.md`.

## 6. Verification

- [x] 6.1 Run `pnpm --filter web-shared test` and `pnpm --filter web-shared typecheck` for the shared panel change.
- [x] 6.2 Run `pnpm --filter user-web typecheck`.
- [x] 6.3 Run `pnpm --filter user-web test` for the login view and configuration suites.
- [x] 6.4 Run `pnpm --filter user-web lint`.
- [x] 6.5 Run `pnpm --filter admin-web typecheck` and its login view test to confirm the shared panel change left admin untouched.
- [x] 6.6 Confirm no API, OpenAPI, database, shared contract, or `apps/landing-web` changes were introduced.
