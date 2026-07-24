## ADDED Requirements

### Requirement: Standalone Public Landing Route

The system SHALL provide a standalone public landing application at `/` that builds to static HTML and does not require authentication, backend API access, SPA routing, or a client application runtime for its approved behavior. The documented illustrative preview timer is the sole approved framework-free inline browser script.

#### Scenario: Visitor opens the public root

- **WHEN** a visitor requests `/`
- **THEN** the landing application returns the complete public page as static HTML
- **AND** the page is usable without an authenticated session or API response

#### Scenario: Built page runs without a client application runtime

- **WHEN** the production landing page is built
- **THEN** approved navigation, content, FAQs, and app-entry links work without hydrating a client framework
- **AND** the only emitted browser script is the documented illustrative preview timer
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

The landing application MUST prefer optimized Astro-managed assets, explicit image dimensions, minimal font payloads, and zero client framework JavaScript for the approved page. The documented illustrative preview timer is the sole permitted framework-free inline browser script.

#### Scenario: Production assets are generated

- **WHEN** the landing production build completes
- **THEN** images have reserved dimensions and optimized output where applicable
- **AND** the root page does not include a client framework bundle or hydrated island
- **AND** no browser script other than the documented illustrative preview timer is emitted

### Requirement: Validated Public Build Configuration

The landing build MUST require valid public values for the canonical site origin, user-app entry URL, and admin-app entry URL, and MUST document local example values without committing environment-specific secrets.

#### Scenario: Required public configuration is valid

- **WHEN** all required public URL values are present and valid
- **THEN** typecheck and build can generate metadata and CTA destinations from those values

#### Scenario: Required public configuration is invalid

- **WHEN** a required public URL is absent or malformed
- **THEN** validation fails with a message identifying the invalid value
- **AND** a deployable landing build is not published
