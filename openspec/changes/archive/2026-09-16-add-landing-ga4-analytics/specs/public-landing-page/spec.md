## MODIFIED Requirements

### Requirement: Standalone Public Landing Route

The system SHALL provide a standalone public landing application at `/` that builds to static HTML and does not require authentication, backend API access, SPA routing, or a client application runtime for its approved behavior. Browser scripting is limited to the illustrative preview timer and, when a GA4 Measurement ID is configured, the documented framework-free consent and landing analytics behavior.

#### Scenario: Visitor opens the public root

- **WHEN** a visitor requests `/`
- **THEN** the landing application returns the complete public page as static HTML
- **AND** the page is usable without an authenticated session or API response

#### Scenario: Built page runs without a client application runtime

- **WHEN** the production landing page is built
- **THEN** approved navigation, content, FAQs, app-entry links, and consent controls work without hydrating a client framework
- **AND** emitted browser scripts are limited to the documented illustrative preview timer and optional framework-free consent and analytics scripts
- **AND** native HTML and CSS behavior, including anchor navigation and radio selection, remains permitted without a script

### Requirement: Static Performance Budget

The landing application MUST prefer optimized Astro-managed assets, explicit image dimensions, minimal font payloads, and zero client framework JavaScript for the approved page. Browser scripting MUST remain limited to the illustrative preview timer and, only when analytics is configured, the consent bootstrap, consent controls, and asynchronously loaded `gtag.js` integration.

#### Scenario: Production assets are generated without analytics configuration

- **WHEN** the landing production build completes without a GA4 Measurement ID
- **THEN** images have reserved dimensions and optimized output where applicable
- **AND** the root page does not include a client framework bundle or hydrated island
- **AND** no browser script other than the documented illustrative preview timer is emitted

#### Scenario: Production assets are generated with analytics configuration

- **WHEN** the landing production build completes with a valid GA4 Measurement ID
- **THEN** the root page still contains no client framework bundle or hydrated island
- **AND** additional browser code is limited to the documented consent and landing analytics behavior
- **AND** the external Google tag is requested asynchronously only after analytics consent is granted

### Requirement: Validated Public Build Configuration

The landing build MUST require valid public values for the canonical site origin, user-app entry URL, and admin-app entry URL; it SHALL accept an optional valid GA4 Measurement ID; and it MUST document local example values without committing environment-specific secrets.

#### Scenario: Required public configuration is valid

- **WHEN** all required public URL values are present and valid
- **THEN** typecheck and build can generate metadata and CTA destinations from those values

#### Scenario: Required public configuration is invalid

- **WHEN** a required public URL is absent or malformed
- **THEN** validation fails with a message identifying the invalid value
- **AND** a deployable landing build is not published

#### Scenario: Optional analytics configuration is absent

- **WHEN** the public URLs are valid and `PUBLIC_GA_MEASUREMENT_ID` is absent or blank
- **THEN** typecheck and build succeed with landing analytics disabled

#### Scenario: Optional analytics configuration is invalid

- **WHEN** `PUBLIC_GA_MEASUREMENT_ID` is present but malformed
- **THEN** validation fails with a message identifying `PUBLIC_GA_MEASUREMENT_ID`
- **AND** a deployable landing build is not published
