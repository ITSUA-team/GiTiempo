## ADDED Requirements

### Requirement: Root Overlay Host Ownership
The frontend SPAs SHALL mount PrimeVue Toast and ConfirmDialog service hosts once at the root application layer so overlay services remain available across public routes, authenticated shells, and feature pages.

#### Scenario: Each SPA renders one root overlay host pair
- **GIVEN** either `user-web` or `admin-web` starts rendering its root app
- **WHEN** the route content is mounted
- **THEN** the app root has exactly one Toast service host and exactly one ConfirmDialog service host available to the routed content
- **AND** shell, route, page, row, card, and form components do not render additional Toast or ConfirmDialog service hosts

#### Scenario: Admin login can display toast feedback
- **GIVEN** `admin-web` is rendering LoginView or another route outside the authenticated admin shell
- **WHEN** a login or public-route flow emits toast feedback through the PrimeVue toast service
- **THEN** the toast is displayed through the same root host used by authenticated admin routes

#### Scenario: Overlay lifecycle survives route and shell changes
- **GIVEN** a feature flow in either SPA requests toast or confirmation feedback
- **WHEN** route content changes or an authenticated shell mounts or unmounts
- **THEN** the overlay service host ownership remains stable at the root app layer
- **AND** feedback behavior does not depend on the currently rendered page or shell owning a local host

### Requirement: Cross-SPA Toast Presentation
The frontend SPAs SHALL use the documented shared toast presentation for root Toast hosts.

#### Scenario: Toasts render with shared placement and width
- **GIVEN** either `user-web` or `admin-web` emits toast feedback
- **WHEN** the toast is displayed
- **THEN** it appears in the documented top-right position
- **AND** it uses the documented `w-80` width target

### Requirement: Existing Feedback Call Sites Continue To Work
Feature-level toast and confirmation logic SHALL continue to use the established PrimeVue services and shared feedback helpers after service hosts move to the root app layer.

#### Scenario: Destructive confirmation still opens from feature pages
- **GIVEN** a feature page requests destructive-action confirmation through `useConfirm()` or an established confirmation helper
- **WHEN** the confirmation is requested
- **THEN** the root ConfirmDialog host displays the confirmation dialog
- **AND** accepting or rejecting the confirmation preserves the feature's existing behavior

#### Scenario: Feature toasts still use existing feedback helpers
- **GIVEN** a feature flow emits success, info, warning, or error feedback through an existing toast helper or composable
- **WHEN** that feedback is emitted
- **THEN** the root Toast host displays the toast without requiring the feature component to render a local Toast host
