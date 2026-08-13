## Context

`apps/landing-web` is a static Astro application whose current contract allows only one narrowly scoped illustrative timer script. It has no analytics, consent UI, client framework, or backend dependency. This change introduces a third-party browser integration and a small persistent preference, so the landing documentation and approved Pencil source must define the new consent surface before implementation is considered complete.

The integration is limited to the public landing page. The authenticated Vue applications, API, and browser extension remain outside the analytics scope. The nearest implementation rules are `apps/landing-web/AGENTS.md`, `docs/ui/INDEX.md`, `docs/ui/pages-landing.md`, and the `GITiempo Landing Page` frames in `GITiempo.pen`.

## Goals / Non-Goals

**Goals:**

- Measure consented landing page views and application-entry CTA clicks in GA4.
- Keep analytics absent from builds that do not configure a GA4 Measurement ID.
- Prevent Google network requests before consent and keep advertising consent denied.
- Preserve campaign attribution from an explicit query-parameter allowlist while excluding arbitrary query data.
- Add an accessible first-visit consent prompt and a persistent way to revise the choice.
- Preserve the static Astro architecture with no framework hydration or new package dependency.

**Non-Goals:**

- Add analytics to `apps/user-web`, `apps/admin-web`, `apps/api`, or `apps/chrome-ext`.
- Add Google Tag Manager, advertising tags, remarketing, Google Signals, User-ID, or cross-domain tracking.
- Track authenticated product activity, form contents, repository data, task data, or other user-provided values.
- Build a general-purpose consent-management platform or support multiple analytics vendors.
- Perform a live deployment as part of implementation.

## Decisions

### `apps/landing-web`: use an optional public GA4 Measurement ID

Add `PUBLIC_GA_MEASUREMENT_ID` as an optional build-time value. When absent or blank, the built page emits neither consent UI nor analytics bootstrap code and makes no Google analytics request. When present, it must match the GA4 `G-...` Measurement ID shape; invalid configured values fail validation with the variable name in the error.

The ID is public configuration rather than a secret. Local and test examples leave it blank so developer traffic is not collected. Deployment documentation identifies which environment owns the configured value.

Alternative considered: hard-code the ID in the layout. Rejected because local, staging, and production environments need independent control and the repository already validates landing public configuration centrally.

### `apps/landing-web`: use basic consent behavior with Consent Mode v2

The page establishes default consent with `analytics_storage`, `ad_storage`, `ad_user_data`, and `ad_personalization` denied. It does not request `gtag.js` until the visitor grants analytics consent. On grant, it updates only `analytics_storage` to granted; all advertising consent values remain denied. A denied choice is persisted without loading Google code.

The preference is stored locally under a versioned landing-specific key. First-time visitors see a consent prompt; returning visitors reuse their recorded choice. A persistent footer action reopens the settings so consent can be granted or withdrawn. Withdrawal updates the active tag state and removes GA cookies created for this site where possible.

Alternative considered: advanced consent mode with cookieless pings before consent. Rejected because the stricter no-request-before-consent boundary is easier to explain and verify for the initial landing integration.

### `apps/landing-web`: keep analytics framework-free and layout-owned

The shared Astro document layout owns the conditional early consent bootstrap and asynchronous Google script loading so every landing route receives one consistent configuration. A small framework-free module owns consent state, event dispatch, and the consent controls. No Astro island, Vue runtime, or analytics npm wrapper is introduced.

Consent markup is rendered by Astro and styled with existing landing tokens. `docs/ui/pages-landing.md` and the landing frames in `GITiempo.pen` are updated with the prompt and settings states before code parity is signed off.

Alternative considered: add a third-party consent or analytics package. Rejected because the required behavior is small, dependencies are not requested, and a package would increase script weight and privacy surface.

### `apps/landing-web`: send one sanitized page view after consent

The GA4 configuration disables its automatic initial page view. The landing script then sends one manual `page_view` after analytics becomes active. `page_location` is reconstructed from origin and pathname with only approved campaign keys retained: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `dclid`, and `gbraid`/`wbraid`. Hashes and all other query parameters are excluded. The event uses the rendered document title and never sets GA User-ID.

Alternative considered: use GA4's default page view. Rejected because it would transmit the complete browser URL, including arbitrary query parameters that could contain personal data, and could duplicate the manual event.

### `apps/landing-web`: use one fixed CTA event contract

Every approved user-app and admin-app entry link carries fixed analytics metadata identifying its location (`header`, `hero`, or `final_cta`) and destination (`user_app` or `admin_app`). After consent, activation emits `landing_cta_click` with only those fixed enum values. It does not send link text, destination URLs, or DOM-derived values. Analytics failure or blocking must never prevent the normal same-tab navigation.

Alternative considered: separate custom event names for each CTA. Rejected because one event plus bounded dimensions is easier to query, validate, and extend without multiplying GA4 event definitions.

### Documentation and deployment configuration

`apps/landing-web/.env.example` documents the optional variable. Landing deployment examples and operator documentation identify where the public Measurement ID is supplied and preserve the behavior that no live deploy occurs during implementation. No API or Firebase configuration changes are required.

## Risks / Trade-offs

- [A consent prompt changes an approved landing visual] → Update `docs/ui/pages-landing.md` and all relevant `GITiempo.pen` landing frames, then verify responsive and keyboard behavior before accepting implementation.
- [A blocked Google script or analytics outage loses events] → Keep analytics best-effort and never block page content or CTA navigation.
- [Consent withdrawal cannot guarantee deletion of data already received by Google] → Stop future measurement, clear site GA cookies where possible, and document the boundary in the consent copy/privacy guidance.
- [Campaign allowlisting may omit a future attribution parameter] → Keep the list explicit and change it through reviewed configuration/spec updates rather than forwarding arbitrary query data.
- [The public landing capability is still represented by an unarchived earlier change] → Apply or archive `add-public-landing-page` before archiving this delta so the modified requirements have a baseline.
- [Third-party JavaScript affects performance] → Load it asynchronously only after consent and verify that no analytics asset appears when the ID is absent or consent is denied.

## Migration Plan

1. Update the landing documentation and Pencil consent states, then add regression tests for disabled, denied, granted, sanitized-page-view, and CTA behavior.
2. Add optional configuration validation, consent UI, conditional `gtag.js` loading, and fixed event metadata.
3. Update environment/deployment documentation and run landing lint, typecheck, tests, build, and browser checks without deploying.
4. Configure the Measurement ID in the intended deployment environment and validate with Google Tag Assistant and GA4 DebugView using non-personal test URLs.
5. Roll back by removing the configured Measurement ID or redeploying the previous landing Worker version; either action returns the page to analytics-disabled behavior without changing other applications.

## Open Questions

None. The initial scope uses basic consent mode, GA4-only measurement, fixed CTA metadata, and an optional public Measurement ID.
