# Spec Delta

## MODIFIED Requirements

### Requirement: Existing Page Behavior Is Preserved During Query Migration

Migrating server state to TanStack Query and splitting composables MUST preserve documented user-visible behavior for the existing user and admin pages.

#### Scenario: Async states remain distinct

- **WHEN** a migrated page or feature is loading initial data, background-refetching, empty after a successful request, or failed after a required request
- **THEN** it renders the same documented loading, empty, retryable request-error, and background action states as before the migration
- **AND** failed requests are not collapsed into empty/default data because query data is missing

#### Scenario: User feedback remains scoped

- **WHEN** a migrated read or write operation succeeds or fails
- **THEN** ordinary visible success and background refresh remain quiet under the frontend notification policy while actionable failures and meaningful exception feedback remain available
- **AND** one failed action does not create duplicate page-level and local inline errors for unrelated surfaces
- **AND** notification selection does not add replacement reads or change existing cache, reconciliation, loading, retry, or access-scope behavior

#### Scenario: Design and accessibility behavior remain unchanged

- **WHEN** a migrated feature renders its existing PrimeVue/Tailwind surface
- **THEN** the refactor does not change field order, action hierarchy, loading skeleton shape, row/card accessibility labels, confirmation ownership, or approved design parity except where separately specified
