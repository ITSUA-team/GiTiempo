# Spec Delta

## MODIFIED Requirements

### Requirement: Existing Page Behavior Is Preserved During Query Migration

Migrating server state to TanStack Query and splitting composables MUST preserve documented user-visible behavior for the existing user and admin pages. The content-preserving refresh and bounded cache-reuse exceptions in this change apply only to Time Entries, Projects, Reports, and their changed query/mutation paths; other surfaces retain their existing behavior.

#### Scenario: Async states remain distinct

- **GIVEN** a migrated page has either no successful response or previously loaded data for its current authorized scope
- **WHEN** it loads initial data, refreshes in the background, receives a successful empty result, or encounters a request failure
- **THEN** initial loading, background refresh, empty, and retryable failure remain distinguishable
- **AND** on the selected Time Entries, Projects, and Reports surfaces, a background refresh does not replace previously loaded same-scope content with a full-page loading skeleton
- **AND** failed requests are not collapsed into empty/default data because query data is missing

#### Scenario: User feedback remains scoped

- **WHEN** a migrated read or write operation succeeds or fails
- **THEN** ordinary visible success and background refresh remain quiet under the frontend notification policy while actionable failures and meaningful exception feedback remain available
- **AND** one failed action does not create duplicate page-level and local inline errors for unrelated surfaces
- **AND** notification selection does not add replacement reads or change existing cache, reconciliation, loading, retry, or access-scope behavior

#### Scenario: Design and accessibility behavior remain unchanged

- **WHEN** a migrated feature renders its existing PrimeVue/Tailwind surface
- **THEN** the refactor does not change field order, action hierarchy, first-load skeleton shape, row/card accessibility labels, confirmation ownership, or approved design parity except for the separately specified refresh transitions
- **AND** on the selected Time Entries, Projects, and Reports surfaces, an in-place refreshing indication does not obscure existing content or remove keyboard focus solely because a request started
