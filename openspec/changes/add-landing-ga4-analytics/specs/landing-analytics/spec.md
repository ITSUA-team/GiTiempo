## ADDED Requirements

### Requirement: Optional Landing Analytics Configuration

The landing application SHALL accept an optional public GA4 Measurement ID and SHALL enable analytics behavior only when that value is configured and valid.

#### Scenario: Measurement ID is absent

- **WHEN** the landing application is built without `PUBLIC_GA_MEASUREMENT_ID`
- **THEN** the built page contains no Google analytics loader or analytics consent controls
- **AND** visiting the page makes no Google Analytics network request

#### Scenario: Measurement ID is valid

- **WHEN** `PUBLIC_GA_MEASUREMENT_ID` contains a valid GA4 `G-...` identifier
- **THEN** the build succeeds with consent-controlled analytics available

#### Scenario: Measurement ID is malformed

- **WHEN** `PUBLIC_GA_MEASUREMENT_ID` is present but is not a valid GA4 `G-...` identifier
- **THEN** landing configuration validation fails with a message naming `PUBLIC_GA_MEASUREMENT_ID`
- **AND** a deployable landing build is not published

### Requirement: Consent-Gated Google Tag Loading

The landing application MUST default Consent Mode v2 analytics and advertising consent values to denied and MUST NOT request `gtag.js` until the visitor grants analytics consent.

#### Scenario: First-time visitor has not chosen

- **WHEN** a visitor opens an analytics-configured landing page without a stored consent choice
- **THEN** analytics storage, ad storage, advertising user data, and ad personalization are treated as denied
- **AND** no request to Google Analytics is made
- **AND** an accessible analytics consent prompt is available

#### Scenario: Visitor declines analytics

- **WHEN** the visitor declines analytics measurement
- **THEN** the denied choice is persisted locally
- **AND** `gtag.js` is not requested
- **AND** no page-view or CTA analytics event is sent

#### Scenario: Visitor grants analytics

- **WHEN** the visitor grants analytics measurement
- **THEN** the granted choice is persisted locally
- **AND** `gtag.js` is loaded asynchronously once
- **AND** analytics storage is updated to granted while all advertising consent values remain denied

#### Scenario: Returning visitor has a recorded choice

- **WHEN** a visitor returns with a stored consent choice
- **THEN** the landing page applies that choice without asking again
- **AND** Google analytics code loads only when the stored choice is granted

### Requirement: Revisable Accessible Consent Choice

The landing page MUST provide keyboard-operable consent controls that let a visitor grant, decline, or later revise analytics consent without requiring an authenticated session.

#### Scenario: Visitor uses the first-visit prompt

- **WHEN** a visitor operates the prompt with a keyboard or assistive technology
- **THEN** the purpose and available choices have accessible names and logical focus order
- **AND** selecting either choice closes the prompt and preserves the chosen state

#### Scenario: Visitor changes a previous choice

- **WHEN** the visitor activates the persistent analytics settings control
- **THEN** the current choice is presented for revision
- **AND** changing the choice updates the persisted state immediately

#### Scenario: Visitor withdraws granted consent

- **WHEN** a visitor changes analytics consent from granted to denied
- **THEN** future analytics measurement is disabled
- **AND** analytics consent is updated to denied in any already-loaded Google tag
- **AND** site-scoped GA cookies are removed where the browser permits

### Requirement: Sanitized Landing Page View

The landing application SHALL send exactly one manual GA4 `page_view` for the current document after analytics consent becomes granted and SHALL prevent the automatic initial page view from duplicating it.

#### Scenario: Page view is sent after consent

- **WHEN** analytics becomes active for a landing page visit
- **THEN** one `page_view` event is sent with the rendered page title and a sanitized page location
- **AND** no duplicate initial page view is sent for that visit

#### Scenario: Campaign parameters are present

- **WHEN** the landing URL contains approved campaign attribution parameters
- **THEN** the sanitized page location preserves only `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `dclid`, `gbraid`, and `wbraid` values that are present
- **AND** it excludes the URL hash and every non-allowlisted query parameter

#### Scenario: Arbitrary query data is present

- **WHEN** the landing URL includes a non-campaign query parameter
- **THEN** that parameter name and value are not included in the analytics page location or another analytics event

### Requirement: Landing CTA Analytics Event

The landing application SHALL emit a `landing_cta_click` event after consent when an approved application-entry CTA is activated, using only fixed CTA location and destination identifiers.

#### Scenario: User application CTA is activated

- **WHEN** a consented visitor activates a user-app CTA in the header, hero, or final CTA section
- **THEN** `landing_cta_click` is emitted with the matching fixed `cta_location` and `destination_app` set to `user_app`
- **AND** the event contains no link URL, link text, or user-provided value

#### Scenario: Admin application CTA is activated

- **WHEN** a consented visitor activates an admin-app CTA in the hero or final CTA section
- **THEN** `landing_cta_click` is emitted with the matching fixed `cta_location` and `destination_app` set to `admin_app`
- **AND** the event contains no link URL, link text, or user-provided value

#### Scenario: Analytics cannot send the CTA event

- **WHEN** the Google tag is unavailable, blocked, denied, or fails while a CTA is activated
- **THEN** the CTA still performs its approved same-tab navigation

### Requirement: Landing Analytics Data Boundary

Landing analytics MUST NOT send personal information, authenticated application data, User-ID, repository or task data, form contents, arbitrary DOM text, or unapproved URL values to Google.

#### Scenario: Analytics payload is inspected

- **WHEN** a page-view or CTA event payload is captured during verification
- **THEN** it contains only the configured Measurement ID, GA-generated metadata, the sanitized page-view fields, and the fixed event fields permitted by this specification
- **AND** it contains no GiTiempo account, workspace, project, task, repository, token, email, or name value

#### Scenario: Landing is used without authentication

- **WHEN** analytics events are emitted from the public landing page
- **THEN** no GA User-ID or GiTiempo application identifier is assigned

### Requirement: Analytics Verification and Operator Documentation

The repository MUST document landing analytics configuration, consent behavior, event names, privacy boundaries, verification, and analytics-disable rollback behavior.

#### Scenario: Developer verifies the integration

- **WHEN** a developer follows the documented local or preview verification process with a test Measurement ID
- **THEN** the process covers disabled, denied, granted, sanitized page-view, and CTA event states
- **AND** it explains how to inspect consent and events with Google Tag Assistant and GA4 DebugView

#### Scenario: Operator disables analytics

- **WHEN** an operator removes the configured Measurement ID and rebuilds the landing application
- **THEN** the resulting page contains no Google analytics loader or consent controls
- **AND** the other GiTiempo applications are unaffected
