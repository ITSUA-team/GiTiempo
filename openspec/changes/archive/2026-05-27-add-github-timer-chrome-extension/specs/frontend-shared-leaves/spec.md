## ADDED Requirements

### Requirement: Extension Reuses Only Browser-Safe Shared Frontend Leaves
Chrome extension code SHALL reuse shared frontend tokens and contract-safe helpers only when they are browser-extension safe and do not pull SPA-only runtime dependencies.

#### Scenario: Extension imports shared token styling without SPA bootstrap
- **WHEN** the Chrome extension needs GiTiempo design tokens
- **THEN** it imports the shared token CSS or generated Tailwind token surface needed for extension styling
- **AND** it does not import PrimeVue setup, Vue Router setup, Pinia stores, or SPA app bootstrap modules

#### Scenario: Extension keeps runtime helpers extension-owned when storage differs
- **WHEN** the Chrome extension needs token persistence, tab messaging, content-script messaging, or browser-extension storage behavior
- **THEN** that behavior is implemented in an extension-owned runtime boundary
- **AND** shared SPA helpers are not reused if they assume `localStorage`, router state, app shell state, or DOM ownership outside the extension

#### Scenario: Extension may consume shared contracts
- **WHEN** the Chrome extension constructs or validates contract-facing API payloads and responses
- **THEN** it may consume browser-safe schemas or types from `@gitiempo/shared`
- **AND** browser-only extension runtime helpers are not moved into `@gitiempo/shared`
