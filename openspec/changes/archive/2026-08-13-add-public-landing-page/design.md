## Context

The repository currently contains Vue SPAs for authenticated user and admin work, but no public web application. The approved landing contract lives in `docs/ui/pages-landing.md`, deployment requirements live in `docs/deployment.md`, and responsive visual references live in the `GITiempo Landing Page`, `GITiempo Landing Page — Tablet`, and `GITiempo Landing Page — Mobile` frames in `GITiempo.pen`.

The landing page is a separate product surface with different runtime needs: it is public, content-led, SEO-sensitive, and does not require authentication or API access. The implementation must follow the root `AGENTS.md`, a new nearest `apps/landing-web/AGENTS.md`, and the project landing rules. Repository documentation remains authoritative when disabled future-state elements remain visible in Pencil.

## Goals / Non-Goals

**Goals:**

- Add a production-ready Astro application at `apps/landing-web` that renders the approved page at `/`.
- Preserve the approved content hierarchy, responsive behavior, shared design tokens, and visual parity at the documented desktop, tablet, and mobile widths.
- Link visitors directly to configured user and admin application entry URLs using action-oriented CTA copy.
- Ship semantic, accessible, indexable static HTML with canonical/social metadata, robots, sitemap, and optimized assets. The approved illustrative preview timer is the sole framework-free inline browser script; no client application runtime or hydrated island is permitted.
- Integrate landing validation and staging deployment without coupling it to the authenticated SPA workflow.

**Non-Goals:**

- Implement authentication, account creation, timer behavior backed by product data, dashboards, reports, invoices, or backend API calls in the landing app. The documented illustrative preview timer remains permitted.
- Change existing user/admin routes, Firebase configuration, API contracts, permissions, or workspace roles.
- Add interactive islands, analytics, a CMS, dynamic FAQ behavior, localization, or new approved content.
- Implement Pencil elements that `docs/ui/pages-landing.md` explicitly marks as disabled.

## Decisions

### `apps/landing-web`: use a static Astro application

The new app will use Astro with TypeScript, Tailwind CSS v4, and static output. Its package scripts will expose `dev`, `build`, `typecheck`, `test`, `lint`, and `preview` so root Turbo commands and the existing workspace check action can treat it as a normal workspace package. Development will bind to strict port `4321`.

Astro components will render server/static HTML only. Repeated cards, FAQ entries, and navigation items may be driven by typed local data. The page will not ship a client runtime; the documented illustrative timer may use a narrowly scoped framework-free inline browser script.

Alternative considered: build the page in Vue to match the SPAs. Rejected because the public page does not need SPA routing or authenticated runtime dependencies, and repository guidance explicitly selects Astro.

### `apps/landing-web`: component and content boundaries

`src/pages/index.astro` will own the route composition and render, in order: hero/navigation, product benefits, GitHub workflow, how it works, roles, MVP scope, FAQ, and final CTA/footer. Stable section-level components may live under `src/components`; marketing copy remains local to the landing app and is not moved into backend-safe shared contracts.

The page will provide `#product`, `#github-workflow`, `#how-it-works`, and `#faq` targets with scroll-margin compensation. It will contain one `h1`, semantic landmarks, a skip link, visible focus states, and static FAQ question/answer markup.

The docs are authoritative over Pencil where they disagree. In particular, Admin role details are enabled while the Reports/Invoices future-scope card remains disabled, even if a responsive Pencil frame still contains a stale future-state node.

Alternative considered: reproduce every visible Pencil node. Rejected because repository guidance makes documented enabled/disabled behavior the source of truth while Pencil remains the parity checklist for approved visible content.

### `apps/landing-web`: Admin role detail source of truth

`docs/ui/pages-landing.md` defines the enabled Admin role detail, including the `RUN THE WORKSPACE` eyebrow, `Admin` heading, three ordered detail points, and inverse brand-purple treatment. The typed landing content must render that exact detail on desktop when Admin is selected and as the third stacked card at tablet and mobile widths. This intentional docs-over-Pencil decision is specific to the stale Admin detail node; the rest of the approved Pencil role layout remains the visual parity checklist.

### Verification evidence and rollback ownership

Record the completed landing checks and responsive comparison evidence in `openspec/changes/add-public-landing-page/verification.md`. The evidence must cover 390, 768, 1024, and 1440 pixels; native keyboard role selection; the Admin panel/card; and the required landing lint, typecheck, test, and build commands.

`docs/deployment.md` is the canonical operator guide. A landing rollback redeploys a previously published landing Cloudflare Worker version only; it must not redeploy the user-web, admin-web, or API. The change delta updates the frontend deployment-guide requirement to make this document and independent rollback expectation explicit.

### `apps/landing-web`: CTA configuration and navigation

The app will validate three public build-time values:

- `PUBLIC_SITE_URL`: canonical public origin used by Astro site configuration and metadata.
- `PUBLIC_USER_APP_URL`: complete user-app entry URL used by `Start tracking` and `Start tracking now` actions.
- `PUBLIC_ADMIN_APP_URL`: complete admin-app entry URL used by `Open admin workspace` actions.

All app-entry CTAs will be ordinary same-tab links. The landing app will not infer paths, append route segments, check authentication, or call either app. An `.env.example` will document local values, while staging injects environment-specific values through the GitHub Environment.

Alternative considered: hard-code staging routes or label links as previews. Rejected because deployments need environment-specific origins and approved copy calls visitors to begin working in the apps.

### `apps/landing-web` and `packages/web-config`: reuse tokens without SPA dependencies

The landing stylesheet will import Tailwind CSS v4 and `@gitiempo/web-config/styles/tokens.css`. Landing-only tokens needed by the approved screen, including the IBM Plex Mono display stack or public-page-specific inverse/accent variants, will stay in the landing stylesheet unless they are genuinely shared product tokens.

The package may depend on `@gitiempo/web-config`, but it will not depend on Vue, PrimeVue, Pinia, Firebase, `@gitiempo/web-shared`, or `@gitiempo/shared`.

Alternative considered: copy shared token values into the landing app. Rejected because that would create avoidable visual drift.

### `apps/landing-web`: SEO, accessibility, and asset policy

A base layout will produce title, description, canonical URL, Open Graph, and social-card metadata from validated page data and `PUBLIC_SITE_URL`. Astro integrations or static routes will generate a sitemap and robots policy. Images will use Astro assets where practical, include explicit dimensions and meaningful alternative text, and avoid layout shifts.

Responsive CSS will follow the approved 1440, 768, and 390 layouts while remaining fluid between breakpoints. Motion will be restrained and disabled under `prefers-reduced-motion`. Content and controls will meet WCAG 2.2 AA contrast, focus, target-size, and keyboard expectations.

### CI and deployment: keep landing automation separate

CI target detection will learn a landing target so changes in `apps/landing-web`, shared tokens, workspace manifests, or landing workflow files select landing checks. Landing checks will run lint, typecheck, tests, and build.

A dedicated landing staging workflow and `apps/landing-web/wrangler.toml` will deploy `dist` to a separate Cloudflare Workers Static Assets Worker at `https://gitiempo-landing.itsua.dev`. The workflow will run on landing-specific `staging` branch paths and manual dispatch, validate only the Cloudflare and three `PUBLIC_*` values required by this app, and never require Firebase or API environment values. It will not alter the existing SPA fallback behavior.

Alternative considered: add landing to the reusable SPA deploy workflow. Rejected because `docs/deployment.md` requires separate landing automation and the SPA workflow validates irrelevant Firebase/API inputs.

## Risks / Trade-offs

- [Pencil contains disabled future-state cards that docs exclude] → Treat docs as authoritative and record those omissions in visual parity checks.
- [Static CTA URLs can be misconfigured at build time] → Validate all three public URLs and fail checks/builds with clear messages when invalid or missing.
- [Importing workspace CSS into Astro can expose resolution or build-order issues] → Declare the workspace dependency explicitly and verify root Turbo and filtered landing builds.
- [No client runtime limits interactive marketing patterns] → Keep FAQ and navigation static; the illustrative timer is the single approved framework-free script, and a future source-of-truth update is required before adding any other script or island.
- [A separate deploy workflow duplicates a small amount of Cloudflare setup] → Accept the duplication to keep environment validation and deployment triggers isolated.
- [Visual parity can regress between the three reference widths] → Capture automated or manual comparison evidence at 390, 768, 1024, and 1440 pixels before completion.

## Migration Plan

1. Add the workspace package, static page, configuration, public assets, and local environment example.
2. Add landing-specific validation and target detection; run the full landing check set locally.
3. Add the dedicated staging Worker configuration and workflow without invoking a live deploy during implementation.
4. Configure the staging GitHub Environment and Cloudflare hostname outside the implementation run, then allow the `staging` workflow to publish.
5. Roll back a landing incident by redeploying the prior landing Worker version as documented in `docs/deployment.md`; user-web, admin-web, and API deployments remain independent.

## Open Questions

- None. The repository docs define the page content, app-entry behavior, responsive references, public environment inputs, and staging hostname needed for implementation.
