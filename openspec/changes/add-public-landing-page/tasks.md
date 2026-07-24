## 1. Landing Workspace Setup

- [ ] 1.1 Add `apps/landing-web/AGENTS.md` with the landing-specific source-of-truth, Astro, Tailwind, accessibility, and Pencil parity rules.
- [ ] 1.2 Scaffold the `landing-web` Astro TypeScript workspace package with strict port `4321`, static `dist` output, and Turbo-compatible dev, build, typecheck, test, lint, and preview scripts.
- [ ] 1.3 Add only the required Astro, Tailwind CSS v4, sitemap, test, lint, and `@gitiempo/web-config` dependencies and update the workspace lockfile.
- [ ] 1.4 Define and validate `PUBLIC_SITE_URL`, `PUBLIC_USER_APP_URL`, and `PUBLIC_ADMIN_APP_URL`, and document safe local values in `apps/landing-web/.env.example`.

## 2. Page Foundation

- [ ] 2.1 Add the base Astro layout with language, title, description, canonical URL, Open Graph/social metadata, favicon links, semantic landmarks, skip link, and exactly one page `h1`.
- [ ] 2.2 Add the landing stylesheet using Tailwind CSS v4 and `@gitiempo/web-config/styles/tokens.css`, plus landing-only typography and responsive rules for Inter and IBM Plex Mono.
- [ ] 2.3 Add optimized public assets with explicit dimensions and appropriate alternative text, plus generated robots and sitemap output based on `PUBLIC_SITE_URL`.
- [ ] 2.4 Add typed local content/configuration data for navigation, enabled role/scope cards, workflow steps, and static FAQs without introducing a client runtime.

## 3. Approved Landing Sections

- [ ] 3.1 Implement the hero/navigation and dashboard illustration to match the approved Pencil frames, including `Start tracking` and `Start tracking now` links to `PUBLIC_USER_APP_URL` and `Open admin workspace` links to `PUBLIC_ADMIN_APP_URL`.
- [ ] 3.2 Implement product benefits and the `#github-workflow` demonstration with the documented copy, hierarchy, and responsive presentation.
- [ ] 3.3 Implement `#how-it-works`, roles, and MVP scope sections while omitting the documentation-disabled Admin-role and Reports/Invoices cards.
- [ ] 3.4 Implement the static `#faq` section and final CTA/footer with the approved copy and direct user/admin app-entry actions.
- [ ] 3.5 Apply unique `#product`, `#github-workflow`, `#how-it-works`, and `#faq` targets with scroll-margin behavior and verify all internal and external links.

## 4. Behavior and Quality Checks

- [ ] 4.1 Add tests for environment validation, canonical/metadata generation, exact CTA labels and destinations, section ordering/anchors, one-`h1` structure, disabled-content omission, and zero hydrated islands.
- [ ] 4.2 Verify keyboard navigation, skip-link behavior, visible focus, semantic landmarks/headings, contrast, target sizes, image alternatives, reduced motion, and 200% zoom/reflow against WCAG 2.2 AA expectations.
- [ ] 4.3 Compare the implementation with the approved Pencil desktop, tablet, and mobile frames at 390, 768, 1024, and 1440 pixels and resolve layout, typography, spacing, overflow, and CTA-priority drift.
- [ ] 4.4 Run `pnpm --filter landing-web lint`, `typecheck`, `test`, and `build`, then run root checks needed to prove workspace integration without deploying.

## 5. CI and Staging Deployment

- [ ] 5.1 Extend `.github/scripts/detect-ci-targets.mjs` and its tests so landing source, shared tokens, workspace manifests, and landing workflow changes select landing checks independently.
- [ ] 5.2 Add `apps/landing-web/wrangler.toml` for a dedicated Cloudflare Workers Static Assets staging deployment at `gitiempo-landing.itsua.dev` without SPA fallback.
- [ ] 5.3 Add a landing-only staging workflow with landing path filters, manual ref dispatch, required Cloudflare and `PUBLIC_*` validation, verification gates, and no Firebase/API requirements.
- [ ] 5.4 Update the deployment/operator documentation and staging environment example with the landing Worker, hostname, public URL values, trigger behavior, and the rule that implementation verification does not perform a live deploy.
