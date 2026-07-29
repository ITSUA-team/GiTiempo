## 1. Configuration

- [ ] 1.1 Add an optional `VITE_LANDING_URL` build-time value to the user-web environment typing and runtime config, following the `VITE_ADMIN_APP_URL` pattern.
- [ ] 1.2 Expose the landing extension destination as a single resolved value so the anchor lives in one place rather than in the view markup.
- [ ] 1.3 Add `VITE_LANDING_URL` to `apps/user-web/.env.example` with a comment stating it is optional and hides the callout when unset.
- [ ] 1.4 Add unit coverage for the resolved destination: configured origin, trailing-slash origin, and unset value.

## 2. Login Callout

- [ ] 2.1 Add the browser-extension callout below the login action stack, matching the approved `Login Page` `.pen` screen: puzzle icon, `Browser extension` title, `Track time right from your browser` subtitle, and forward arrow.
- [ ] 2.2 Render it as a secondary surface that does not read as a third sign-in action.
- [ ] 2.3 Open the destination in a new tab with `rel="noreferrer"` so an in-progress sign-in is preserved.
- [ ] 2.4 Omit the callout entirely when no destination is configured, leaving no placeholder or inactive link.
- [ ] 2.5 Give the callout an accessible name that conveys it opens in a new tab.

## 3. Tests

- [ ] 3.1 Add a login view test asserting the callout renders with the configured destination and the documented copy.
- [ ] 3.2 Add a login view test asserting the callout is absent when the destination is unset.
- [ ] 3.3 Assert the callout does not disturb the existing sign-in actions or their order.

## 4. Docs And Design

- [ ] 4.1 Document the callout in the `docs/ui/pages-user.md` login section, including its placement, secondary treatment, landing anchor target, and hidden-when-unconfigured behavior.
- [ ] 4.2 Record the restyled auth visual system introduced by the redesign in `docs/ui/pages-user.md` so the doc matches the approved `.pen` auth screens.
- [ ] 4.3 Add `VITE_LANDING_URL` to the frontend environment table in `docs/deployment.md`.

## 5. Verification

- [ ] 5.1 Run `pnpm --filter user-web typecheck`.
- [ ] 5.2 Run `pnpm --filter user-web test` for the login view and configuration suites.
- [ ] 5.3 Run `pnpm --filter user-web lint`.
- [ ] 5.4 Confirm no API, OpenAPI, database, shared contract, or `apps/landing-web` changes were introduced.
