## ADDED Requirements

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

The Privacy Policy MUST accurately disclose collection, use, storage, sharing, and deletion of service and extension data. It MUST identify actual recipients and distinguish local browser state from server-held records. Its Chrome Web Store Limited Use commitment MUST cover all extension user data, including GitHub-derived information, rather than only Google API data.

#### Scenario: User reads authentication and GitHub disclosures

- **GIVEN** the extension supports Firebase and GitHub sign-in and GitHub-linked timers
- **WHEN** the user reads the policy
- **THEN** it describes profile/authentication information and how the supported identity providers participate
- **AND** it distinguishes GiTiempo tokens in extension storage from Firebase authentication state in extension-local IndexedDB
- **AND** it explains local URL/title recognition and transmission of repository name and issue number when a timer starts
- **AND** it explains the backend's subsequent retrieval of issue information from GitHub without claiming the extension sends the title or full URL in the timer-start request
- **AND** it describes time records and sharing with authorized workspace members under existing access rules

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
