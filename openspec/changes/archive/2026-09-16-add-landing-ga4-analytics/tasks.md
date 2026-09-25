## 1. Source of Truth and Regression Coverage

- [x] 1.1 Update `docs/ui/pages-landing.md` with the consent prompt, persistent analytics-settings control, responsive behavior, approved copy, and analytics script exception.
- [x] 1.2 Add the consent prompt and settings states to the desktop, tablet, and mobile landing frames in `GITiempo.pen` and record a parity checklist before implementation.
- [x] 1.3 Extend landing contract tests to cover the optional Measurement ID, invalid configured values, analytics-disabled output, and the revised allowed-script budget before changing runtime code.
- [x] 1.4 Add focused browser tests for first visit, decline, grant, returning choice, withdrawal, keyboard operation, and persistence without making real Google requests.

## 2. Configuration and Consent UI

- [x] 2.1 Extend `apps/landing-web/src/lib/public-config.mjs` to return an optional validated `PUBLIC_GA_MEASUREMENT_ID`, and document the blank-by-default value in `apps/landing-web/.env.example`.
- [x] 2.2 Implement the Astro-rendered consent prompt and persistent footer settings control using approved landing tokens, semantics, and responsive states without adding a framework runtime.
- [x] 2.3 Implement versioned local consent persistence, denied defaults for all Consent Mode v2 fields, grant/decline/reopen/withdraw behavior, and best-effort cleanup of site-scoped GA cookies.
- [x] 2.4 Verify the consent UI at 390, 768, 1024, and 1440 pixels for focus order, accessible names, 200% zoom, reduced motion, and horizontal overflow.

## 3. GA4 Loading and Event Measurement

- [x] 3.1 Add a conditional layout-owned analytics bootstrap that emits no analytics code without configuration and loads `gtag.js` asynchronously once only after granted consent.
- [x] 3.2 Configure GA4 with automatic initial page views and advertising features disabled, then send one manual `page_view` using the document title and an allowlist-sanitized page location.
- [x] 3.3 Add fixed analytics metadata to every approved header, hero, and final user/admin CTA and emit `landing_cta_click` only after consent without sending URLs, labels, or DOM-derived values.
- [x] 3.4 Ensure denied, blocked, or failed analytics never delays or prevents normal same-tab CTA navigation and never affects the illustrative preview timer.

## 4. Deployment and Operator Documentation

- [x] 4.1 Add the optional public Measurement ID to the landing staging environment example and workflow passthrough without making it a required deploy value.
- [x] 4.2 Update `docs/deployment.md` with environment ownership, event names and fields, no-PII boundaries, consent behavior, Tag Assistant/DebugView verification, and rollback by removing the Measurement ID or redeploying the prior landing version.
- [x] 4.3 Confirm analytics remains scoped to `apps/landing-web` and no Firebase, API, authenticated SPA, or extension configuration changes are introduced.

## 5. Verification

- [x] 5.1 Run `pnpm --filter landing-web lint`, `typecheck`, `test`, and `build` with analytics absent and confirm the built page has no consent controls, Google loader, or analytics requests.
- [x] 5.2 Run the same landing checks with a syntactically valid test Measurement ID and confirm the built page contains only the approved framework-free analytics and consent additions.
- [x] 5.3 Capture browser evidence with Google requests intercepted for denied and granted states, including one sanitized `page_view`, fixed `landing_cta_click` fields, withdrawal behavior, and uninterrupted CTA navigation.
- [ ] 5.4 Use Google Tag Assistant and GA4 DebugView against the intended non-production verification environment with non-personal test URLs, record the result, and do not perform a live deployment during implementation.
