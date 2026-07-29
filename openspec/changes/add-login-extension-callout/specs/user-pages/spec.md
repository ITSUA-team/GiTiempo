## MODIFIED Requirements

### Requirement: Login Entry Page

The user-web app MUST provide a dedicated login page that matches the approved entry design and exposes the supported authentication methods. The page MUST also surface the browser extension as a secondary way to track time, presented alongside the product introduction rather than among the sign-in actions.

#### Scenario: Login page renders approved entry sections

- **WHEN** an anonymous user opens the login route
- **THEN** the page shows the branded hero content panel and the sign-in form panel
- **AND** the sign-in form includes email and password entry, a primary sign-in action, and a Google continuation action

#### Scenario: Login page offers the browser extension

- **GIVEN** a landing destination is configured for the environment
- **WHEN** an anonymous user opens the login route
- **THEN** the branded hero content panel shows a browser-extension callout below the feature highlights
- **AND** the callout names the extension and states that time can be tracked from the browser
- **AND** the callout stays outside the sign-in form so it never reads as an additional sign-in action

#### Scenario: Extension callout opens the landing extension section

- **GIVEN** the login page shows the browser-extension callout
- **WHEN** the user activates the callout
- **THEN** the landing page section describing the Chrome extension opens in a new browser tab
- **AND** the login route and any entered credentials remain untouched in the original tab

#### Scenario: Extension callout is absent without a configured destination

- **GIVEN** no landing destination is configured for the environment
- **WHEN** an anonymous user opens the login route
- **THEN** the page omits the browser-extension callout entirely
- **AND** it renders no placeholder or inactive link in its place
