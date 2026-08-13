## Why

The public landing page currently cannot measure acquisition, CTA effectiveness, or campaign performance. GiTiempo needs a privacy-aware GA4 integration so landing traffic and application-entry conversions can be evaluated without adding analytics to authenticated apps, the API, or the browser extension.

## What Changes

- Add optional Google Analytics 4 support to `apps/landing-web` through `gtag.js` and a public build-time measurement ID.
- Keep analytics disabled when the measurement ID is absent, including local development and test builds by default.
- Add Consent Mode v2 defaults and a landing consent control so analytics storage remains denied until the visitor grants analytics consent.
- Track page views and approved user/admin application-entry CTA clicks without sending personal data, application data, or URL values that may contain personal information.
- Persist the visitor's analytics consent choice and provide a way to change it later.
- Update the landing script and performance contract to permit only the existing illustrative timer plus the narrowly scoped consent and analytics scripts.
- Document configuration, privacy boundaries, event names, and verification through Google Tag Assistant and GA4 DebugView.

## Capabilities

### New Capabilities

- `landing-analytics`: Privacy-aware GA4 loading, consent handling, page-view measurement, CTA event tracking, and analytics data boundaries for the public landing application.

### Modified Capabilities

- `public-landing-page`: Permit the consent and analytics scripts as explicit exceptions to the current single-script budget and document the optional analytics build configuration.

## Impact

- Affects only `apps/landing-web`, its environment examples, tests, documentation, and landing deployment configuration.
- Adds outbound browser requests to Google only when a GA4 measurement ID is configured, with measurement behavior governed by the visitor's consent state.
- Does not change API contracts, databases, authenticated Vue applications, Firebase configuration, or the browser extension.
- Requires the existing `add-public-landing-page` capability to be applied or archived before this change is archived because this proposal modifies its public landing requirements.
