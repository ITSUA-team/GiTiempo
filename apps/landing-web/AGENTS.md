# Landing Web Agent Notes

## Source of truth

- Read `docs/ui/INDEX.md` and `docs/ui/pages-landing.md` before changing the page.
- Treat the approved `GITiempo.pen` landing frames as the visual parity checklist. Documentation wins where the two disagree, including the disabled Reports/Invoices card.
- Use the `gitiempo-landing-rules`, `astro`, `tailwind-design-system`, and `accessibility` skills for landing work.

## Boundaries

- Keep this app Astro, TypeScript, and Tailwind CSS v4 with static output and zero client JavaScript by default.
- Do not introduce Vue, PrimeVue, Pinia, Firebase, API clients, SPA routing, or Astro islands without an approved source-of-truth update.
- Reuse `@gitiempo/web-config/styles/tokens.css`; keep landing-only composition and tokens in `src/styles/global.css`.
- Use `PUBLIC_SITE_URL`, `PUBLIC_USER_APP_URL`, and `PUBLIC_ADMIN_APP_URL` for all public-site origins and app-entry CTAs. Do not hard-code staging origins in components.

## Verification

- Keep the dev and preview server on strict port `4321`.
- Run lint, typecheck, tests, and build after changes; check the page at 390, 768, 1024, and 1440px for parity, keyboard access, reduced motion, and horizontal overflow.
