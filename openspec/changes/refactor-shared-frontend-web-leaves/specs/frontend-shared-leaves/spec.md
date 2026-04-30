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

### Requirement: Shared Authenticated Header Chrome Is Extractable
The frontend codebase SHALL extract authenticated header chrome into `@gitiempo/web-shared` when the user/admin header structure is identical and all app-specific orchestration can remain local.

#### Scenario: Header chrome is shared without sharing shell orchestration
- **WHEN** `user-web` and `admin-web` render the same authenticated top bar structure with only workspace, identity, counterpart-link, and optional action differences
- **THEN** the duplicated top bar markup is implemented as a shared prop-driven Vue component
- **AND** app shells continue to own auth-store reads, environment-derived counterpart URLs, route names, router views, sidebars, and page composition

#### Scenario: Header exposes counterpart workspace and optional action
- **WHEN** the shared header is rendered by an authenticated app shell
- **THEN** it exposes a visible counterpart workspace link in the top-right identity area
- **AND** it can render an optional internal settings/profile action without hard-coding either app's route names in the shared package

#### Scenario: Shared header omits settings/profile action after simplification
- **WHEN** the shared authenticated header surface is simplified to the invariant identity controls
- **THEN** the shared header renders the counterpart workspace link, display name, and avatar
- **AND** it does not render a shared settings/profile action

### Requirement: Shared Authenticated Navigation Uses User-Web Text-Only Base
The frontend codebase SHALL extract authenticated shell navigation into `@gitiempo/web-shared` when the user/admin nav structure can be shared without moving route ownership or active-state logic out of the apps.

#### Scenario: Shared navigation keeps app-local route ownership
- **WHEN** `user-web` and `admin-web` consume a shared navigation component
- **THEN** each app still defines its own nav item list, route names, optional route targets, and active-state logic
- **AND** the shared component owns only presentational sidebar/mobile nav rendering

#### Scenario: Shared navigation uses text-only user-web visual language
- **WHEN** the shared authenticated navigation is rendered in either SPA
- **THEN** it uses the current `user-web` text-only nav styling as the base for both sidebar and mobile navigation
- **AND** it does not render per-item icons in either app

### Requirement: Shared Header Markup Uses Canonical Tailwind Classes
Shared header components SHALL prefer canonical design-system Tailwind utilities over arbitrary utility values when an equivalent exists.

#### Scenario: Canonical class review is applied to shared header extraction
- **WHEN** new or touched shared header markup contains arbitrary utilities
- **THEN** the implementation checks those classes with `suggestCanonicalClasses`
- **AND** replaces arbitrary classes with canonical equivalents where available, such as `rounded-[10px]` to `rounded-lg`
- **AND** keeps arbitrary values only when no documented/canonical equivalent exists or exact design fidelity requires the arbitrary value

### Requirement: Consuming SPAs Generate Styles For Shared Vue Components
The frontend codebase SHALL ensure Tailwind CSS scans shared frontend Vue component sources used by both SPAs.

#### Scenario: Shared component classes are generated in app stylesheets
- **WHEN** `user-web` or `admin-web` imports Vue components from `@gitiempo/web-shared`
- **THEN** that SPA's Tailwind CSS entry registers the shared package source path with Tailwind v4 `@source`
- **AND** utility classes that exist only inside shared SFCs or shared PrimeVue `pt` class strings are emitted in the consuming app stylesheet

#### Scenario: Shared Tailwind source registration is documented
- **WHEN** shared frontend component source paths are added to app Tailwind scanning
- **THEN** the UI setup documentation records the requirement so future shared UI packages or moved components receive the same source registration

### Requirement: Shared Frontend Tailwind Markup Is Reviewed With Frontend-Scoped Linting
The frontend codebase SHALL use frontend-scoped Tailwind ESLint rules to surface class ordering and obvious canonical utility cleanup opportunities in shared frontend markup.

#### Scenario: Tailwind lint rules stay scoped to shared frontend surfaces
- **WHEN** Tailwind ESLint rules are enabled for this refactor
- **THEN** they apply to `apps/user-web/src`, `apps/admin-web/src`, and `packages/web-shared/src`
- **AND** non-frontend packages do not receive Tailwind lint noise

#### Scenario: Class ordering warnings are autofixed before manual cleanup
- **WHEN** Tailwind lint reports class-order warnings in touched shared/frontend templates
- **THEN** the implementation applies autofix-first ordering cleanup
- **AND** follows with a small manual pass only for safe canonical replacements that preserve the current UI

#### Scenario: Fidelity-specific arbitrary values may remain
- **WHEN** a warned class uses an arbitrary value with no equivalent canonical utility or where the canonical scale would change the approved layout
- **THEN** the implementation may keep that arbitrary value
- **AND** examples include `border-l-[3px]` and `min-h-[calc(100vh-4rem)]`
