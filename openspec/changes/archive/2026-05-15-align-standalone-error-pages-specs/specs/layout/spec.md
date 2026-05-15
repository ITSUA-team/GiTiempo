## ADDED Requirements

### Requirement: Standalone Authenticated Error Routes
The shared application shell MUST allow route-level 403 and 404 pages in `user-web` and `admin-web` to render as standalone authenticated error surfaces outside the shell chrome.

#### Scenario: Authenticated error route bypasses shell chrome
- **WHEN** an authenticated user reaches a route-level 403 or 404 page in either SPA
- **THEN** the route may render without the shared top bar, sidebar, or shell main-content container
- **AND** the standalone error page remains distinct from feature-level empty or request-error states rendered inside normal product pages
