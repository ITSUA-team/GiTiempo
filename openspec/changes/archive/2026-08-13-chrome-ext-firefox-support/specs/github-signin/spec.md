## MODIFIED Requirements

### Requirement: Extension GitHub Sign-In Returns Through A Configured Extension Destination
The backend GitHub sign-in flow SHALL accept an extension login target, and for that target SHALL return the browser to a redirect destination read from backend configuration on every outcome. Because a browser may derive its own extension redirect host, the backend SHALL keep one configured destination per supported browser and select between them by a discriminator carried on the request. That discriminator names a configured destination; it MUST NOT supply one. The backend MUST NOT take a destination from the request, and MUST fail closed when the destination for the named browser is not configured.

#### Scenario: Extension target starts the flow
- **GIVEN** GitHub sign-in and an extension redirect destination are configured for the backend
- **WHEN** the browser requests the start endpoint for the extension target
- **THEN** the backend redirects to GitHub authorization exactly as it does for the web targets
- **AND** the signed state records that the extension started the flow

#### Scenario: Success returns the handoff code to the extension
- **GIVEN** an extension-initiated flow returns from GitHub with a verifiable state and an authorization code
- **WHEN** the backend resolves the primary verified email
- **THEN** it redirects the browser to the configured extension destination carrying a one-time handoff code
- **AND** it does not redirect to a web app route

#### Scenario: Failure returns to the extension rather than a web login page
- **GIVEN** an extension-initiated flow
- **WHEN** the user denies authorization, the state cannot be verified, no verified primary email exists, or the code exchange fails
- **THEN** the backend redirects the browser to the configured extension destination carrying an error indicator
- **AND** it does not redirect to a web app login page, so the extension's authorization window always reaches a destination it can observe

#### Scenario: The outcome returns to the browser that began the flow
- **GIVEN** destinations are configured for more than one browser
- **WHEN** an extension-initiated flow names one of them at the start endpoint
- **THEN** the signed state records that browser alongside the login target
- **AND** every outcome of that flow returns to the destination configured for it, not to another browser's

#### Scenario: An unrecognized or absent browser resolves to the default
- **GIVEN** an extension-target request names no browser, or names one the backend does not recognize
- **WHEN** the backend resolves the destination
- **THEN** it uses the default browser's configured destination
- **AND** a state signed before browsers were distinguished still resolves to that same destination

#### Scenario: Redirect destination is never taken from the request
- **GIVEN** a request to the start endpoint supplies its own candidate redirect destination
- **WHEN** the backend builds the extension flow
- **THEN** it uses only the configured destination
- **AND** a handoff code is never delivered to a destination named by the caller

#### Scenario: Unrecognized login target falls back to the user app
- **GIVEN** a request to the start endpoint names a login target the backend does not recognize
- **WHEN** the backend resolves which app to return to
- **THEN** it treats the flow as a user-app flow
- **AND** it does not deliver the outcome to the extension destination

#### Scenario: Unconfigured extension destination fails closed
- **GIVEN** the backend has no redirect destination configured for the browser an extension-target flow names
- **WHEN** that flow is attempted
- **THEN** the backend reports the flow as unavailable before the browser leaves for GitHub
- **AND** no partial or defaulted destination is used, and another browser's destination is never substituted
