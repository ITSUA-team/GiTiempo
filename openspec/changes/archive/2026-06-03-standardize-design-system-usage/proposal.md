## Why

The web apps already have shared tokens, a PrimeVue preset, and UI documentation, but implementation can still drift into raw Tailwind values, raw HTML controls, bespoke status surfaces, and `!important` overrides. This change makes the design-system rules explicit at the spec level so future user-web, admin-web, and shared Vue UI work uses one predictable component and styling model.

## What Changes

- Require touched standard SPA UI to use PrimeVue components when PrimeVue has an equivalent for buttons, inputs, tables, tags, avatars, dialogs, pickers, pagination, loading, and confirmation/toast surfaces.
- Require token-backed Tailwind utilities and shared theme tokens for standard colors, surfaces, radii, shadows, and typography instead of raw hex values or one-off visual values in markup.
- Require PrimeVue customization to flow through the shared preset first and component `pt` overrides second, using documented pass-through keys and Vue-style `class`/`style` bindings.
- Prohibit `!important` Tailwind utilities and deep selectors for normal PrimeVue styling fixes; implementation must resolve these through preset tokens, `pt` overrides, or CSS layer/source registration.
- Clarify when repeated page/header/card/table/loading/empty/error surfaces should move into small PrimeVue-based shared Vue components in `packages/web-shared`.
- Keep route-level views, app shell orchestration, stores, routers, and product-specific page behavior app-local unless an existing spec explicitly defines a shared component boundary.
- Keep the Chrome extension Tailwind-only and independent from SPA runtime packages while still sharing token styling where extension-safe.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `components`: Tighten design-token, PrimeVue-first, pass-through, and override rules for standard SPA UI components.
- `frontend-shared-leaves`: Clarify shared Vue component extraction boundaries for repeated PrimeVue-based UI leaves and keep app orchestration local.
- `layout`: Clarify shared page/header layout usage where page chrome, card shells, and repeated layout surfaces rely on shared component conventions.

## Impact

- Affected apps: `apps/user-web` and `apps/admin-web` UI components, route views, and tests touched by future design-system cleanup tasks.
- Affected shared packages: `packages/web-config` for PrimeVue preset and Tailwind token source; `packages/web-shared` for reusable PrimeVue-based UI leaves.
- Affected docs: `docs/ui/*` remains the source of truth for implementation details and should stay aligned when spec-level design-system rules change.
- Affected extension boundary: `apps/chrome-ext` may use shared token CSS or equivalent token values but must not depend on PrimeVue, Vue Router, Pinia, or SPA bootstrap modules.
- No backend API, database, shared contract, OpenAPI, or authentication behavior changes are planned.
