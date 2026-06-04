## MODIFIED Requirements

### Requirement: Extension Reuses Only Browser-Safe Shared Frontend Leaves

Chrome extension code SHALL remain Tailwind-only and reuse shared frontend tokens and contract-safe helpers only when they are browser-extension safe and do not pull SPA-only runtime dependencies.

#### Scenario: Extension imports shared token styling without SPA bootstrap

- **WHEN** the Chrome extension needs GiTiempo design tokens
- **THEN** it SHALL import the shared token CSS or use an equivalent generated Tailwind token surface needed for extension styling
- **AND** it SHALL NOT import PrimeVue setup, PrimeVue components, Vue Router setup, Pinia stores, or SPA app bootstrap modules.

#### Scenario: Extension keeps runtime helpers extension-owned when storage differs

- **WHEN** the Chrome extension needs token persistence, tab messaging, content-script messaging, or browser-extension storage behavior
- **THEN** that behavior SHALL be implemented in an extension-owned runtime boundary
- **AND** shared SPA helpers SHALL NOT be reused if they assume `localStorage`, router state, app shell state, or DOM ownership outside the extension.

#### Scenario: Extension may consume shared contracts

- **WHEN** the Chrome extension constructs or validates contract-facing API payloads and responses
- **THEN** it MAY consume browser-safe schemas or types from `@gitiempo/shared`
- **AND** browser-only extension runtime helpers SHALL NOT be moved into `@gitiempo/shared`.

## ADDED Requirements

### Requirement: Repeated Design-System Surfaces Are Shared As Small Vue Leaves

The frontend codebase SHALL extract repeated, documented design-system surfaces into small PrimeVue-based Vue leaves in `@gitiempo/web-shared` when the surface has a stable props, slots, and emits contract and app-level orchestration can remain local.

#### Scenario: Documented shared UI pattern is extracted

- **WHEN** a page header, section header, card shell, stat card, management table chrome, loading block, empty state, or request-error state is documented as a shared UI pattern and is needed by more than one stable surface
- **THEN** the shared structure SHALL be implemented or reused as a small Vue component in `@gitiempo/web-shared`
- **AND** consuming apps SHALL provide product-specific copy, data, navigation targets, actions, and slots through the component contract.

#### Scenario: Shared component remains design-system aligned

- **WHEN** a shared Vue leaf renders standard UI controls or display surfaces
- **THEN** it SHALL use PrimeVue components when equivalents exist
- **AND** it SHALL use shared token utilities, the shared PrimeVue preset, and documented `pt` overrides instead of raw hex values, raw duplicate controls, `!important` utilities, or deep selectors.

#### Scenario: Route-level ownership stays app-local

- **WHEN** a design-system surface moves into `@gitiempo/web-shared`
- **THEN** route maps, route guards, Pinia stores, auth/session orchestration, page-level data loading, and product-specific shell composition SHALL remain in the consuming app
- **AND** the shared component SHALL NOT import app route names, app stores, or app HTTP clients.

#### Scenario: Single-use extraction requires documented stability

- **WHEN** a shared Vue leaf is extracted before two live app call sites exist
- **THEN** the docs or active specs SHALL already define the surface as a reusable standard pattern
- **AND** the component contract SHALL remain small enough to avoid hiding product-specific behavior behind optional props.
