# Frontend Shared Leaves Specification

## Purpose

Define when browser-only frontend leaf logic and structurally similar shared Vue surfaces should move into shared frontend packages while preserving app-level ownership, established PrimeVue usage, and documented frontend styling conventions.
## Requirements
### Requirement: Identical Cross-SPA Frontend Leaves Are Shared

The frontend codebase MUST place browser-only leaf logic in a shared frontend location when that logic is already behaviorally identical across `apps/user-web` and `apps/admin-web`.

#### Scenario: Shared leaf extraction for identical helpers

- **WHEN** `user-web` and `admin-web` depend on the same auth HTTP helper, current-user client helper, auth runtime helper, refresh-token storage helper, or counterpart-workspace link resolver
- **THEN** the implementation uses one shared frontend module for that behavior
- **AND** the two SPAs do not keep separate app-local copies of the same leaf logic

#### Scenario: Shared auth runtime behavior stays aligned

- **WHEN** either SPA performs backend token exchange, token refresh, logout, current-user loading, or identity-provider sign-in/sign-out through behavior that is already identical
- **THEN** both SPAs use the same shared frontend auth leaf implementation for that identical behavior
- **AND** the shared extraction does not change the existing auth contract or runtime semantics

#### Scenario: Shared counterpart workspace links stay aligned

- **WHEN** either SPA renders a link to the counterpart workspace
- **THEN** it uses the same shared frontend workspace-link resolver
- **AND** configured counterpart workspace URL behavior stays consistent across both SPAs

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

The frontend codebase SHALL use one shared form orchestration approach for shared authentication forms in `@gitiempo/web-shared`.

#### Scenario: Shared auth form uses one orchestration flow

- **WHEN** a shared auth form collects credentials for both `user-web` and `admin-web`
- **THEN** it uses one shared form orchestration flow for validation and submit handling across both SPAs
- **AND** field-level invalid state and error rendering integrate with PrimeVue input components

### Requirement: Additional Duplicated Presentational Blocks Are Reviewed For Sharing

The frontend codebase SHALL review repeated user/admin presentational micro-blocks for extraction into `@gitiempo/web-shared` when they have two stable call sites.

#### Scenario: Placeholder scaffold is duplicated across both SPAs

- **WHEN** both SPAs keep materially identical placeholder-page scaffolds with only copy differences
- **THEN** that scaffold should be considered for extraction into a shared prop-driven Vue component
- **AND** app-specific route ownership and copy remain in the consuming app

### Requirement: Shared Stat Card Surface Is Extractable

The frontend codebase SHALL place the documented stat-card surface in `@gitiempo/web-shared` once a second admin or user page renders it through the same prop-driven contract.

#### Scenario: Stat card is shared across management pages

- **WHEN** more than one route renders the same compact label-plus-value stat card surface
- **THEN** the stat card is implemented as a shared prop-driven Vue component in `@gitiempo/web-shared`
- **AND** consumers do not maintain parallel app-local stat cards with the same markup

### Requirement: Shared Section Header Owns Stats Header Layout

The frontend codebase SHALL use `SectionHeader` as the canonical shared Vue component for page, section, and stats-header title surfaces.

#### Scenario: Page action header renders through shared section header

- **WHEN** a page needs a title, description, and primary action region without a stat-card row
- **THEN** it renders that surface through the page header behavior of `SectionHeader`
- **AND** it does not use the stats variant only to obtain action alignment
- **AND** it does not keep a separate wrapper row for title/action alignment outside `SectionHeader`

#### Scenario: Stats header renders through shared section header

- **WHEN** a page needs a title, description, primary action region, and stat-card row
- **THEN** it renders that surface through the stats variant of `SectionHeader`
- **AND** it does not import or render a standalone `StatsHeader` component

#### Scenario: Section header keeps focused slots

- **WHEN** `SectionHeader` renders page, section, or stats variants
- **THEN** consumers configure copy through `title` and optional `description`
- **AND** consumers may provide the existing action slot for page, section, or stats variants
- **AND** consumers provide the optional stats slot only for the stats variant
- **AND** route-level orchestration, data loading, and app-specific actions remain outside the shared component

### Requirement: Shared Management Table Chrome Is Extractable

The frontend codebase SHALL place repeated boxed management-table chrome in `@gitiempo/web-shared` once a second admin page renders the same chrome around its table.

#### Scenario: Management table chrome is shared across admin pages

- **WHEN** `admin-web` renders more than one page with the same boxed management table chrome
- **THEN** the chrome is implemented as a shared prop-driven Vue component in `@gitiempo/web-shared`
- **AND** product-specific columns, filters, and per-row content stay in the consuming page
- **AND** consumers do not maintain a parallel app-local copy of the chrome

### Requirement: Shared Authenticated Header Chrome Is Extractable

The frontend codebase SHALL extract authenticated header chrome into `@gitiempo/web-shared` when the user/admin header structure is identical and all app-specific orchestration can remain local.

#### Scenario: Header chrome is shared without sharing shell orchestration

- **WHEN** `user-web` and `admin-web` render the same authenticated top bar structure with only workspace and identity data differences
- **THEN** the duplicated top bar markup is implemented as a shared prop-driven Vue component
- **AND** app shells continue to own auth-store reads, environment-derived counterpart URLs, route names, router views, sidebars, and page composition

#### Scenario: Shared header omits settings/profile action after simplification

- **WHEN** the shared authenticated header surface is simplified to the invariant identity controls
- **THEN** the shared header renders the counterpart workspace link, display name, and avatar
- **AND** it does not render a shared settings/profile action

#### Scenario: User-web owns header center timer content

- **WHEN** `user-web` needs to render the compact top-bar timer in the shared header center region
- **THEN** the shared header allows app-owned center content without owning timer state, API calls, or task-picker behavior
- **AND** `admin-web` can keep the same shared header without rendering a top-bar timer
- **AND** the shared header layout remains stable when the center region is empty

### Requirement: Shared Authenticated Navigation Uses Compact Icon-Only Base

The frontend codebase SHALL extract authenticated shell navigation into `@gitiempo/web-shared` when the user/admin nav structure can be shared without moving route ownership or active-state logic out of the apps.

#### Scenario: Shared navigation keeps app-local route ownership

- **WHEN** `user-web` and `admin-web` consume a shared navigation component
- **THEN** each app still defines its own nav item list, route names, optional route targets, and active-state logic
- **AND** the shared component owns only presentational sidebar/mobile nav rendering

#### Scenario: Shared navigation uses icon-only visual language with accessible labels

- **WHEN** the shared authenticated navigation is rendered in either SPA
- **THEN** it uses compact icon-only navigation items as the shared base for both sidebar and mobile navigation
- **AND** each nav item exposes a tooltip and accessible label that conveys the destination
- **AND** it does not require visible per-item text in the shared navigation surface

#### Scenario: Shared navigation uses compact desktop and tablet sidebar width

- **WHEN** the shared authenticated navigation is rendered on desktop or tablet layouts
- **THEN** the sidebar uses a compact width suitable for icon-only navigation
- **AND** the compact width remains consistent with the shared icon-only item presentation

#### Scenario: Mobile navigation preserves icon-only accessibility

- **WHEN** the shared authenticated navigation is rendered on mobile layouts
- **THEN** the mobile navigation still presents icon-only items with accessible labels
- **AND** the mobile experience preserves clear item identification for assistive technology

### Requirement: Shared Header Markup Uses Documented Tailwind Utilities

Shared header components SHALL prefer documented design-system Tailwind utilities over one-off arbitrary utility values when an equivalent exists.

#### Scenario: Shared header prefers documented utility classes

- **WHEN** new or touched shared header markup uses utility classes
- **THEN** it prefers documented token and utility classes when an equivalent exists
- **AND** arbitrary values remain only where exact layout or fidelity requirements cannot be expressed with the documented utility set

### Requirement: Consuming SPAs Generate Styles For Shared Vue Components

The frontend codebase SHALL ensure Tailwind CSS scans shared frontend Vue component sources used by both SPAs.

#### Scenario: Shared component classes are generated in app stylesheets

- **WHEN** `user-web` or `admin-web` imports Vue components from `@gitiempo/web-shared`
- **THEN** the consuming app stylesheet generation includes utility classes that exist only inside shared SFCs or shared PrimeVue `pt` class strings
- **AND** shared components do not render without their required utility CSS in the consuming SPA

#### Scenario: Shared Tailwind source registration is documented

- **WHEN** shared frontend component source paths are added to app Tailwind scanning
- **THEN** the UI setup documentation records the requirement so future shared UI packages or moved components receive the same source registration

### Requirement: Shared Frontend Tailwind Markup Is Reviewed With Frontend-Scoped Linting

The frontend codebase SHALL use frontend-scoped markup review to surface class ordering and obvious canonical utility cleanup opportunities in shared frontend markup.

#### Scenario: Tailwind lint rules stay scoped to shared frontend surfaces

- **WHEN** markup-review automation is enabled for this refactor
- **THEN** it stays scoped to `apps/user-web/src`, `apps/admin-web/src`, and `packages/web-shared/src`
- **AND** non-frontend packages do not receive unrelated markup-review noise

#### Scenario: Shared frontend lint highlights safe cleanup opportunities

- **WHEN** markup review reports class-order or obvious utility cleanup warnings in touched shared/frontend templates
- **THEN** the implementation resolves or intentionally retains those warnings with current UI fidelity in mind
- **AND** the warning surface stays focused on frontend/shared markup rather than unrelated packages

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

### Requirement: Shared Mobile Record List Leaves
The frontend shared package SHALL provide only neutral, presentational leaves for mobile record-list rendering when the same viewport and card shell behavior is used by both SPAs.

#### Scenario: Shared viewport helper matches shell breakpoint
- **WHEN** a frontend component needs to switch between desktop table rendering and mobile record-card rendering
- **THEN** it can use a shared viewport helper that treats widths below `640px` as mobile
- **AND** the helper remains safe when browser viewport APIs are unavailable

#### Scenario: Shared mobile record card stays presentational
- **WHEN** a user-web or admin-web list renders a mobile record card
- **THEN** the shared card leaf provides only the token-based surface, spacing, border, and optional actions slot
- **AND** product-specific record fields, row states, and action behavior remain owned by the app-level component using the card

#### Scenario: Shared extraction preserves existing admin behavior
- **GIVEN** admin-web already renders mobile record cards for management tables
- **WHEN** the viewport helper or mobile card shell is moved into the shared frontend package
- **THEN** admin-web preserves the same mobile card behavior, accessible row actions, and desktop table behavior after updating imports

