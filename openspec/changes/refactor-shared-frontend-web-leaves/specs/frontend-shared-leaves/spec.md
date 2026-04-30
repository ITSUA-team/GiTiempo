## ADDED Requirements

### Requirement: Identical Cross-SPA Frontend Leaves Are Shared
The frontend codebase MUST place browser-only leaf logic in a shared frontend location when that logic is already behaviorally identical across `apps/user-web` and `apps/admin-web`.

#### Scenario: Shared leaf extraction for identical helpers
- **WHEN** `user-web` and `admin-web` depend on the same auth HTTP helper, current-user client helper, auth runtime helper, refresh-token storage helper, or counterpart-workspace link resolver
- **THEN** the implementation uses one shared frontend module for that behavior
- **AND** the two SPAs do not keep separate app-local copies of the same leaf logic

### Requirement: Shared Frontend Extraction Preserves App-Level Ownership
The frontend codebase MUST keep route-level composition and app-specific orchestration local unless a larger abstraction has at least two stable call sites and no product-specific behavior leakage.

#### Scenario: App-specific orchestration remains local
- **WHEN** the two SPAs consume shared frontend leaves
- **THEN** each app still owns its own route map, route guards, auth store orchestration, and page composition
- **AND** shared extraction does not force a single monolithic store, router, shell, or login page across both apps

### Requirement: Shared UI Components Require Proven Structural Similarity
The frontend codebase SHALL extract Vue UI components into `@gitiempo/web-shared` when the compared `user-web` and `admin-web` regions are structurally similar enough to be parameterized without hiding product-specific differences.

#### Scenario: Small common layout block is shared
- **WHEN** both SPAs contain the same shell or login sub-region with the same structure and interaction behavior
- **THEN** that sub-region may be implemented as a shared Vue component
- **AND** product-specific copy, navigation items, and app-only layout decisions remain configurable or local to each SPA

### Requirement: Shared Vue Components Use PrimeVue For Standard UI
Shared frontend Vue components MUST use PrimeVue components for standard app controls and token-based Tailwind utilities for project-specific styling.

#### Scenario: Shared form component uses PrimeVue controls
- **WHEN** a shared Vue component renders buttons, text inputs, password inputs, tags, avatars, dialogs, tables, selectors, or loading widgets
- **THEN** it uses the corresponding PrimeVue component when one exists
- **AND** it applies project styling through the global PrimeVue preset, `pt` overrides, and token utilities instead of raw hex classes or deep selectors

### Requirement: Shared Frontend Form Validation Uses Zod
Shared frontend form payloads MUST use Zod when the same browser-only form schema is consumed by both web SPAs or when the payload is contract-facing.

#### Scenario: Shared login form validates before submit
- **WHEN** a shared login form collects email and password before invoking app-local auth orchestration
- **THEN** the form validates the payload with a shared Zod schema before emitting submit data
- **AND** validation errors are exposed to the user through PrimeVue invalid state and helper text

#### Scenario: Schema ownership follows boundary ownership
- **WHEN** the schema describes an API request or response contract
- **THEN** the schema lives in `@gitiempo/shared`
- **AND** when the schema is browser-only form validation shared by both SPAs, it lives in `@gitiempo/web-shared`

### Requirement: Shared Frontend Validation Avoids Deprecated Zod Error Helpers
Shared frontend validation code MUST avoid deprecated Zod v4 error helper methods when collecting form errors.

#### Scenario: Shared form maps shallow field errors
- **WHEN** a shared frontend form needs field-level validation messages for a shallow payload such as email/password sign-in
- **THEN** it uses non-deprecated Zod v4 APIs or direct `issues` mapping
- **AND** it does not rely on deprecated `ZodError.flatten()` or `ZodError.format()` methods

### Requirement: Shared Auth Forms Use PrimeVue Forms
The frontend codebase SHALL use `@primevue/forms` for shared authentication forms in `@gitiempo/web-shared`.

#### Scenario: Shared auth form uses PrimeVue form orchestration
- **WHEN** a shared auth form collects credentials for both `user-web` and `admin-web`
- **THEN** it uses `@primevue/forms` with a Zod resolver for validation and submit orchestration
- **AND** field-level invalid state and error rendering integrate with PrimeVue input components

### Requirement: Additional Duplicated Presentational Blocks Are Reviewed For Sharing
The frontend codebase SHALL review repeated user/admin presentational micro-blocks for extraction into `@gitiempo/web-shared` when they have two stable call sites.

#### Scenario: Placeholder scaffold is duplicated across both SPAs
- **WHEN** both SPAs keep materially identical placeholder-page scaffolds with only copy differences
- **THEN** that scaffold should be considered for extraction into a shared prop-driven Vue component
- **AND** app-specific route ownership and copy remain in the consuming app
