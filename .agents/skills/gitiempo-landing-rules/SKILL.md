---
name: gitiempo-landing-rules
description: Project-specific rules for building and reviewing the GiTiempo landing page in Astro with Tailwind CSS. Use for work under apps/landing-web, landing-page architecture, Pencil-to-Astro implementation, responsive visual parity, SEO, accessibility, performance, or the landing app's separate development port.
---

# GiTiempo Landing Rules

Use this skill for all landing-page implementation and review work. Keep the landing app isolated from the existing Vue admin and user apps while reusing only approved shared design tokens and repository conventions.

## Required Skill Loading

Load this skill first, then inspect `.agents/skills/` and read every companion skill relevant to the task before editing files. Do not load unrelated skills just to increase context.

- Always read `astro` and `tailwind-design-system` for landing-page implementation, styling, configuration, or review.
- Read `accessibility` for WCAG, keyboard navigation, screen-reader, contrast, or semantic HTML work.
- Read `gitiempo-frontend-rules` when touching `packages/web-config`, `packages/web-shared`, or integration points with the existing Vue frontends.
- Read `vue`, `vue-best-practices`, `primevue-styled-tailwind`, or `pinia` only when the task crosses into Vue/PrimeVue/Pinia code; keep Astro code framework-native.
- Read `vue-testing-best-practices` when changing shared Vue behavior or its tests, and use the available browser skill when browser automation or visual verification is required.

If a named companion skill is not installed locally, locate the available installed copy before proceeding and report the gap if it cannot be loaded.

## Scope and Source of Truth

- The landing app belongs in `apps/landing-web`; do not place it inside `apps/admin-web` or `apps/user-web`.
- Treat the approved Pencil design as the visual source of truth. Inspect `GITiempo.pen`, especially the landing frame `inEq4`, before changing layout or content.
- Read `docs/ui/INDEX.md` and only the smallest relevant UI sections before implementation. Follow `packages/web-config/src/styles/tokens.css` for existing brand tokens.
- Read the nearest app `AGENTS.md` when it exists. Do not invent a second set of repository-wide frontend rules.

## Stack Boundaries

- Use Astro, TypeScript, and Tailwind CSS. Prefer static output for this content-driven page.
- Do not add Vue, PrimeVue, Pinia, or SPA routing to the landing app unless a specific interactive requirement justifies an Astro island.
- Keep JavaScript at zero by default. Add `client:load`, `client:idle`, or `client:visible` only for real browser behavior and document the reason.
- Keep landing dependencies and scripts app-local. The app must run on its own port (default Astro port `4321`) without changing the admin (`5174`) or user (`5173`) app ports.

## Astro Structure

Prefer a small, explicit structure:

- `src/pages/index.astro` — page composition and route metadata.
- `src/layouts/BaseLayout.astro` — document shell, global metadata, canonical URL, and shared head tags.
- `src/components/` — section components such as `Navigation`, `Hero`, `ProductBenefits`, `WorkflowSteps`, `Roles`, `MvpScope`, and `FinalCta`.
- `src/styles/global.css` — Tailwind entrypoint, shared CSS layers, and landing-only tokens.
- `public/` — static favicons, social images, and other assets that do not need processing.

Keep content data separate from markup when a section has repeated items. Prefer Astro props and typed data over duplicated HTML.

## Pencil-to-Astro Parity Workflow

1. Inspect the selected Pencil frame, variables, and screenshot before coding; use the design as a parity checklist, not as a loose mood board.
2. Record the desktop canvas (the approved landing frame is 1440px wide) and check responsive behavior at 390px, 768px, and 1440px.
3. Preserve approved copy, hierarchy, spacing, typography, borders, radii, icon treatment, and enabled/disabled states. Do not implement hidden or disabled design nodes unless the design is updated.
4. Compare a local screenshot at each target width after every major section. Fix overflow, cumulative spacing drift, and type wrapping before adding polish.

## Styling and Tokens

- Reuse `@gitiempo/web-config` tokens where they are available; do not copy Vue/PrimeVue components into Astro.
- Use semantic Tailwind classes and CSS variables instead of raw hex values in component markup. Add a landing-only token to `global.css` only when no shared token fits.
- Keep typography consistent with the design: Inter for interface text and IBM Plex Mono for code-like labels or metadata where specified.
- Use responsive utilities intentionally. Avoid arbitrary pixel offsets that only work at the desktop artboard width.
- Keep decoration behind content and preserve contrast for text, borders, and focus indicators.

## Accessibility, SEO, and Performance

- Use semantic landmarks (`header`, `nav`, `main`, `section`, `footer`) and one clear `h1`.
- Ensure all interactive elements are keyboard reachable, have visible focus states, and expose an accessible name. Use meaningful alt text; mark decorative images as empty-alt.
- Include title, description, canonical URL, Open Graph/Twitter metadata, favicon links, and `lang="uk"` or the approved page language. Add sitemap/robots configuration when the deployment requires it.
- Prefer `astro:assets` for local images, provide dimensions, and prevent layout shifts. Avoid render-blocking external fonts and unnecessary third-party scripts.

## Verification

Run the landing app's targeted checks, then the root checks when shared code changes:

- `pnpm --filter landing-web lint`
- `pnpm --filter landing-web typecheck`
- `pnpm --filter landing-web build`
- `pnpm build` when workspace or shared packages are affected

Open the app on its separate port and verify 390px, 768px, 1024px, and 1440px widths. Check the console, keyboard navigation, reduced-motion behavior, no horizontal overflow, and screenshot parity with the Pencil frame. If `packages/web-config` or `packages/web-shared` changes, verify both existing frontend apps as well.
