# Public Landing Page Specification

## Purpose

Define the standalone public landing application served at `/`: static HTML delivered without authentication, backend access, or a client framework runtime; the approved content hierarchy and its anchor targets; direct application-entry CTAs; responsive presentation across the reference widths; WCAG 2.2 AA expectations; search and social metadata; the static performance budget; and validated public build configuration.

## Requirements

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

### Requirement: Approved Content Hierarchy

The landing page MUST render the documented enabled content in this order: hero and navigation, product benefits, GitHub workflow, how it works, roles, MVP scope, FAQ, and final CTA/footer. It MUST expose the documented anchor targets and MUST omit elements that the landing documentation marks disabled.

#### Scenario: Visitor follows section navigation

- **WHEN** a visitor activates a link to `#product`, `#github-workflow`, `#how-it-works`, or `#faq`
- **THEN** the browser navigates to the matching unique section target
- **AND** the target heading remains visible below the page navigation

#### Scenario: Future-scope cards remain disabled

- **WHEN** the approved page is rendered
- **THEN** Member, Project Manager, and Admin role details are present
- **AND** the disabled Reports/Invoices MVP-scope card is not present

#### Scenario: Admin role detail is rendered from the approved source

- **WHEN** the Admin role is selected on desktop or rendered in the stacked responsive roles layout
- **THEN** its selector label is `Admin`, its eyebrow is `RUN THE WORKSPACE`, and its heading is `Admin`
- **AND** it renders, in order, `Invite teammates and assign roles`, `Manage settings and GitHub connection`, and `See the full workspace across projects`
- **AND** its detail surface uses the documented inverse brand-purple treatment

### Requirement: Direct Application Entry CTAs

The landing page MUST use configured user-app and admin-app entry URLs for all application CTAs. User actions SHALL use `Start tracking` or `Start tracking now`, admin actions SHALL use `Open admin workspace`, and no application CTA SHALL describe the destination as a preview.

#### Scenario: Visitor starts working in the user app

- **WHEN** a visitor activates a `Start tracking` or `Start tracking now` CTA
- **THEN** the browser navigates in the same tab to the complete configured user-app entry URL

#### Scenario: Visitor opens the admin app

- **WHEN** a visitor activates an `Open admin workspace` CTA
- **THEN** the browser navigates in the same tab to the complete configured admin-app entry URL

#### Scenario: CTA destinations vary by environment

- **WHEN** the landing page is built for a local, staging, or production environment
- **THEN** CTA destinations use that environment's supplied user-app and admin-app entry URLs without inferring or appending routes

### Requirement: Responsive Approved Presentation

The landing page MUST preserve the approved content, hierarchy, CTA priority, and visual character across desktop, tablet, and mobile layouts while remaining fluid between reference widths and avoiding horizontal overflow.

#### Scenario: Page is viewed at reference widths

- **WHEN** the page is rendered at widths of 390, 768, 1024, or 1440 pixels
- **THEN** its layout follows the corresponding approved responsive composition
- **AND** all enabled content remains readable and reachable without horizontal scrolling

#### Scenario: Primary and secondary actions adapt to narrow screens

- **WHEN** the page is rendered on a narrow viewport
- **THEN** user and admin actions remain visually ordered and operable
- **AND** no action label is truncated or obscured

### Requirement: Accessible Semantic Experience

The landing page MUST meet the documented WCAG 2.2 AA expectations for semantics, keyboard operation, focus visibility, contrast, control target size, alternative text, reduced motion, and zoom/reflow.

#### Scenario: Keyboard user traverses the page

- **WHEN** a visitor navigates using only a keyboard
- **THEN** a skip link can move focus to main content
- **AND** every interactive element receives a visible focus indicator in a logical order

#### Scenario: Assistive technology reads page structure

- **WHEN** a screen reader inspects the page
- **THEN** header, navigation, main, sections, and footer use appropriate semantic landmarks
- **AND** the page contains exactly one level-one heading with a logical descendant heading hierarchy
- **AND** the illustrative GitHub workflow preview exposes a useful text label without hiding its heading or supporting copy

#### Scenario: Visitor requests reduced motion

- **WHEN** the visitor enables reduced motion in the operating system
- **THEN** non-essential transitions and smooth scrolling are removed or reduced

### Requirement: Search and Social Metadata

The landing application MUST publish environment-correct canonical metadata, useful search and social metadata, a robots policy, and a sitemap for the public site origin.

#### Scenario: Search crawler requests the page

- **WHEN** a crawler reads the built root page
- **THEN** it finds a descriptive title and description, one canonical URL derived from the configured public site origin, and indexable semantic content

#### Scenario: Crawler discovers site files

- **WHEN** a crawler requests the robots policy or sitemap
- **THEN** the landing deployment serves valid files whose public URLs use the configured site origin

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

### Requirement: Public Privacy Policy Route

The landing application MUST serve an indexable static Privacy Policy at `/privacy`, accessible without authentication or a backend API response. The homepage footer MUST link to it, and the sitemap MUST include its URL derived from the configured public site origin. The privacy page MUST use the approved legal-page structure and MUST NOT execute analytics, an illustrative timer, or a client framework runtime.

#### Scenario: Visitor follows the privacy link

- **GIVEN** the landing application is served from the intended environment
- **WHEN** a visitor follows the homepage footer's Privacy Policy link
- **THEN** `/privacy` returns HTTP 200 with the policy content as static HTML
- **AND** it remains readable without signing in or executing JavaScript

#### Scenario: Crawler discovers the privacy page

- **GIVEN** the public site origin is configured
- **WHEN** a crawler reads the sitemap and privacy page
- **THEN** the sitemap includes the canonical privacy URL, directly or through its referenced sitemap
- **AND** the page exposes its matching canonical URL, title, description, and one level-one heading
- **AND** neither a robots restriction nor a noindex directive prevents indexing of that route

#### Scenario: Privacy page remains static with analytics configured

- **GIVEN** the homepage build has a valid analytics Measurement ID
- **WHEN** the visitor opens `/privacy`
- **THEN** the privacy page contains no analytics loader, consent prompt, illustrative timer script, or hydrated framework
- **AND** it exposes a normal navigation path back to the homepage and its existing analytics settings

#### Scenario: Policy content expands on narrow screens

- **GIVEN** the policy includes all approved disclosure sections
- **WHEN** it is viewed at 390, 768, 1024, or 1440 pixels wide
- **THEN** text, headings, and contact/navigation links remain readable and reachable without horizontal overflow
- **AND** skip navigation, focus visibility, and semantic reading order remain available

### Requirement: Privacy Policy Matches Actual Data Handling

The Privacy Policy MUST accurately disclose collection, use, storage, sharing, and deletion of service and extension data. It MUST identify actual recipients and distinguish local browser state from server-held records. Its Chrome Web Store Limited Use commitment MUST cover all extension user data, including GitHub-derived information, rather than only Google API data. It SHALL distinguish user-supplied external reference recording from managed installation-authorized GitHub retrieval and describe the actual access scope of shared records.

#### Scenario: User reads authentication and GitHub disclosures

- **GIVEN** the extension supports Firebase and GitHub sign-in and GitHub-linked timers
- **WHEN** the user reads the policy
- **THEN** it describes profile/authentication information and how the supported identity providers participate
- **AND** it distinguishes GiTiempo tokens in extension storage from Firebase authentication state in extension-local IndexedDB
- **AND** it explains local issue-context recognition and transmission of repository name, issue number, bounded issue title, and canonical direct issue URL to GiTiempo when the updated extension requests a reference timer start
- **AND** it distinguishes managed starts that subsequently verify and retrieve issue information through the workspace GitHub App installation from external-reference starts that record user-supplied context without GitHub API retrieval or proof of provider access
- **AND** it describes time records and sharing with authorized workspace members under the applicable project or own-time access scope

#### Scenario: User understands scoped external-reference sharing

- **GIVEN** external-reference tracking reuses a workspace project and issue task across members
- **WHEN** the user reads the policy's sharing and deletion disclosures
- **THEN** it explains that tracking alone grants access only to the member's own entries and the projects and exact tasks containing those entries, including running entries
- **AND** it distinguishes that access from separately authorized administrator or project access to shared workspace records
- **AND** it explains that removing or moving the final own entry removes derived visibility without automatically deleting shared projects, tasks, or other members' records

#### Scenario: Changed extension data flow is disclosed before distribution

- **GIVEN** an extension candidate transmits issue title and canonical URL through the reference-start contract
- **WHEN** readiness for distributing that candidate is evaluated
- **THEN** the deployed public policy and candidate-specific collection inventory describe that payload and the implemented managed and external-reference flows consistently
- **AND** the verification record identifies the candidate version/hash and the policy URL and review date
- **AND** a historical handoff for a repository/issue-number-only package does not establish privacy readiness for the changed candidate
- **AND** Store declaration confirmation remains publisher-owned under the existing release requirements

#### Scenario: User reads use and recipient restrictions

- **GIVEN** the publisher has confirmed the actual data recipients and operational practices
- **WHEN** the policy is prepared for publication
- **THEN** it identifies the relevant identity, GitHub, and hosting/processing recipients and their purposes
- **AND** it discloses Limited Use restrictions on unrelated use, transfers, advertising, and human access, including applicable permitted exceptions, for all extension user data
- **AND** those statements agree with the intended Store certifications and actual practices

#### Scenario: User distinguishes logout from deletion

- **GIVEN** the user has server-held account, workspace, or time-entry records
- **WHEN** the user reads the retention and deletion sections
- **THEN** the policy explains the confirmed retention criteria, deletion-request process, and treatment of backups and applicable transfers
- **AND** it states that successful extension logout clears extension-local authentication state while logout/uninstall does not delete server records or stop an active timer
- **AND** it provides the monitored contact for requests without promising unimplemented automatic deletion

### Requirement: Privacy Policy Discloses Optional Landing Analytics

The policy MUST describe optional landing analytics consistently with the existing `add-landing-ga4-analytics` behavior and the intended deployment configuration. It MUST distinguish homepage analytics from extension behavior and MUST NOT imply that consent withdrawal deletes data already received by Google.

#### Scenario: Analytics is configured for the homepage

- **GIVEN** the intended landing deployment has analytics enabled by configuration
- **WHEN** a visitor reads the policy
- **THEN** it identifies Google Analytics and explains consent-gated page-view and CTA measurement, sanitized location/campaign fields, and analytics/consent storage
- **AND** it explains how to grant, decline, and later withdraw consent through the homepage's existing settings
- **AND** it states the limitations of cookie cleanup and withdrawal for previously transmitted data
- **AND** it does not describe the browser extension as collecting landing analytics or guarantee that analytics is anonymous

#### Scenario: Analytics is absent from the homepage configuration

- **GIVEN** the intended landing deployment does not configure analytics
- **WHEN** the policy describes analytics
- **THEN** the text makes its optional/configuration-dependent nature clear without asserting that disabled collection is active

### Requirement: Verified Privacy Publication Inputs

Production privacy publication MUST use a confirmed controller identity and monitored contact email supplied through the existing required public configuration. Retention, recipients, transfers, and publisher certifications MUST be confirmed before submission readiness is declared. Missing facts MUST remain in the release checklist rather than being replaced with invented public statements.

#### Scenario: Required controller configuration is missing

- **GIVEN** the controller name or privacy contact email is absent, or the email is malformed
- **WHEN** the landing configuration is validated
- **THEN** validation fails with the relevant public variable identified
- **AND** no deployable policy artifact is produced from that incomplete configuration

#### Scenario: Syntactically valid values remain unconfirmed

- **GIVEN** build configuration passes syntax validation but business facts have not been confirmed
- **WHEN** the release checklist is reviewed
- **THEN** technical build success does not mark those facts or privacy publication readiness as verified

#### Scenario: Deployed privacy route is checked before Store submission

- **GIVEN** an authorized landing deployment has completed
- **WHEN** privacy publication is verified anonymously against the public domain
- **THEN** the reviewer confirms HTTP 200 with the expected policy content, correct controller/contact and revision date, a working homepage footer link, and sitemap inclusion
- **AND** HTTP 404, an authentication wall, stale policy content, or unresolved factual declarations prevent the submission gate from passing
- **AND** if deployment has not occurred, the public verification task remains pending rather than being inferred from local tests
