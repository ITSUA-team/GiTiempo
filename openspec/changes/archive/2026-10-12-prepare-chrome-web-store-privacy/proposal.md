## Why

GiTiempo's first Chrome Web Store submission needs its privacy policy, publisher declarations, and extension behavior to agree. The policy is already deployed on staging at `https://gitiempo-landing.itsua.dev/privacy/`; remaining work includes completing authentication-storage and landing-analytics disclosures, confirming controller identity, correcting logout that retains Firebase authentication state, and releasing the approved policy to production.

## What Changes

- End the extension's GiTiempo and Firebase sessions together, preserving local cleanup when backend revocation fails or stalls and preventing an in-flight refresh from restoring the ended session.
- Remove the redundant Chrome `tabs` permission after verifying supported GitHub page detection and timer synchronization with existing host access; keep both browser builds functional.
- Complete the existing public Privacy Policy with actual authentication storage and data recipients, GitHub data flow, optional landing analytics, retention/deletion practices, and a Limited Use commitment covering all extension user data.
- Make the privacy route, footer link, sitemap entry, and required public controller/contact configuration explicit acceptance criteria.
- Prepare a versioned Chrome Web Store privacy declaration checklist grounded in the final package and record public policy verification before submission. Unconfirmed business facts remain named release prerequisites rather than invented policy claims.

## Capabilities

### New Capabilities

None; this change extends existing extension and public landing domains.

### Modified Capabilities

- `chrome-extension`: Complete local provider-session cleanup, least-privilege browser access, and evidence-backed Chrome Web Store privacy declarations.
- `public-landing-page`: Public privacy route, accurate service/extension/analytics disclosures, and verified policy publication.

## Impact

- Layers: browser extension frontend, public landing frontend, and release documentation. Extension authentication behavior changes; API routes, shared contracts, database schemas, and the authenticated SPAs do not.
- Main surfaces: `apps/chrome-ext/src/lib/firebase.ts`, background logout orchestration and tests, `apps/chrome-ext/vite.config.ts`, `apps/landing-web/src/pages/privacy.astro`, landing configuration/route tests, and `docs/deployment.md`.
- Add no dependencies and no new analytics collection. Preserve the existing running-timer behavior on logout and keep Firebase state scoped to the extension, without signing the user out of other applications or identity-provider websites.
- Coordinate with active `add-landing-ga4-analytics`: reuse its consent and event contracts without duplicating or changing analytics behavior. This change adds privacy requirements under `public-landing-page` without replacing the pending analytics delta's existing requirement blocks.
- Implementation readiness and publication readiness are separate: production deployment and Dashboard submission are release actions under the applicable authorization, not automatic side effects of generating or applying this proposal.
- No GitHub issue has been supplied for this change.
