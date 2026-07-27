## Why

GiTiempo has an approved public landing-page content contract and responsive Pencil screens, but no landing application or deployment path exists in the monorepo. Adding the site now gives visitors a stable public entry point that explains the product and sends them directly into the user or admin apps without implying that either app is only a preview.

## What Changes

- Add a standalone Astro and Tailwind CSS v4 landing application at `apps/landing-web`, served at `/` and built as static HTML with no client framework runtime. The documented illustrative preview timer is the sole approved framework-free inline browser script.
- Implement the approved desktop, tablet, and mobile landing screens, content order, anchor navigation, accessibility behavior, SEO metadata, robots/sitemap output, and shared visual tokens.
- Configure the landing CTAs to use environment-provided user-app and admin-app entry URLs. User-facing actions say `Start tracking` or `Start tracking now`; admin actions say `Open admin workspace`.
- Add landing-specific workspace, validation, CI target detection, and Cloudflare Workers Static Assets staging deployment support.
- Keep the landing app isolated from the Vue SPA runtime, Firebase authentication, and backend APIs; the landing page only links into existing application entry routes.

## Capabilities

### New Capabilities

- `public-landing-page`: Defines the static public site, approved content and responsive layout, app-entry CTA behavior, accessibility, SEO, and performance requirements.

### Modified Capabilities

- `frontend-staging-deploys`: Extends staging deployment requirements with a separate landing Worker, landing-specific build configuration, validation gates, path filtering, and manual target selection.

## Impact

- Adds `apps/landing-web` and its Astro/Tailwind configuration, static assets, components, tests, and public environment example.
- Updates pnpm/Turborepo workspace integration and CI target detection so landing changes validate independently.
- Extends frontend staging deployment automation and operator documentation for `https://gitiempo-landing.itsua.dev`.
- Reuses frontend visual tokens from `packages/web-config` without importing Vue, PrimeVue, Pinia, Firebase, or shared API contracts.
- Does not change backend endpoints, OpenAPI contracts, authentication rules, or the existing user/admin application routes.
