## ADDED Requirements

### Requirement: Shared Frontend Feedback Helpers

The frontend codebase MUST provide shared browser-only feedback helpers in `@gitiempo/web-shared` for repeated PrimeVue toast and destructive confirmation behavior that is intended to stay consistent across `apps/user-web` and `apps/admin-web`.

#### Scenario: Shared toast helper owns standard toast defaults

- **WHEN** either SPA needs standard success or error toast feedback for a frontend action
- **THEN** the implementation uses a shared frontend helper for common PrimeVue toast defaults such as success lifetime and error severity
- **AND** the consuming app keeps action-specific summary and safe detail copy explicit at the call site or opt-in wrapper boundary

#### Scenario: Error toasts avoid backend message exposure

- **WHEN** a frontend action fails with an API or backend error
- **THEN** the global toast shows product-controlled user-facing copy rather than the raw backend error message
- **AND** the backend error details remain available for logging, inline scoped feature state, and feature-specific recovery logic

#### Scenario: Backend error details are logged without sensitive request metadata

- **WHEN** a shared feedback helper receives an original error for diagnostics
- **THEN** it logs the error with operation context
- **AND** it does not add access tokens, refresh tokens, request bodies, or user-entered secrets to the log metadata

#### Scenario: Destructive confirmation helper standardizes defaults

- **WHEN** either SPA needs the documented destructive confirmation pattern
- **THEN** the implementation can use a shared frontend helper that calls PrimeVue confirmation with danger accept styling, an explicit accept label, and a default cancel label
- **AND** the consuming route, page shell, or app shell still hosts the rendered `<ConfirmDialog>` component

#### Scenario: Request feedback remains opt-in

- **WHEN** API request handling is refactored to reduce repeated success or error toast calls
- **THEN** any shared request feedback wrapper requires explicit safe success and failure copy from the caller
- **AND** the low-level JSON request helper does not automatically show toasts for every failed request
