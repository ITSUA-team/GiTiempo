## Context

Both authenticated SPAs render their header through `packages/web-shared/src/components/WorkspaceHeader.vue`. `apps/user-web/src/components/layout/AppShell.vue` passes the user identity, counterpart admin workspace action, and a center slot for the top-bar timer. `apps/admin-web/src/components/layout/AdminAppShell.vue` passes admin identity and counterpart user workspace action without the timer slot.

The approved design context is in `GITiempo.pen` as the full-page open states `User Dashboard - Profile Dropdown Open` and `Admin Dashboard - Profile Dropdown Open`. The dropdown is anchored below the top-right profile/avatar trigger, preserves the existing top bar, and contains the counterpart workspace action, the app-owned profile/settings action, and destructive `Sign out`; user-web labels the app-owned action `Profile` and uses the profile icon, while admin-web labels it `Settings` and keeps the settings gear icon. The counterpart workspace action lives in the dropdown on all breakpoints, replacing the previous standalone top-bar workspace link.

Relevant implementation rules come from `docs/ui/INDEX.md`, `docs/ui/layout.md`, `docs/ui/patterns.md`, `apps/user-web/AGENTS.md`, `apps/admin-web/AGENTS.md`, and `packages/web-shared/AGENTS.md`.

## Goals / Non-Goals

**Goals:**

- Add a profile dropdown to the shared authenticated header used by both SPAs.
- Keep user-web and admin-web header structure consistent while preserving app-specific center content and workspace switch destinations.
- Keep the counterpart workspace switch available from the profile dropdown on all breakpoints instead of rendering a standalone top-bar text link.
- Navigate the first action to the app-owned settings destination: `user-web` labels it `Profile`, uses the user profile nav icon, and routes to the existing profile/settings route, while `admin-web` labels it `Settings`, keeps the settings gear icon, and uses the existing settings route.
- Run `Sign out` through each app's existing auth store logout flow, then navigate to that app's login route.
- Match the approved `.pen` dropdown open-state geometry, token language, and action hierarchy on desktop, with responsive behavior that remains usable on smaller screens.
- Remove duplicate Profile/Settings shell navigation items and the duplicate user Profile page sign-out action now that those actions are exposed from the header dropdown.

**Non-Goals:**

- No backend API, shared contract, or data-model changes.
- No new standalone user settings route beyond the existing user profile/settings surface.
- No changes to login, session bootstrap, refresh-token storage, or logout cleanup semantics beyond exposing the header entry point.
- No replacement of the user-web top-bar timer or admin-web workspace-scope display.

## Decisions

### Extend `WorkspaceHeader` Instead Of Duplicating Header Menus

`WorkspaceHeader` should own the shared profile trigger and dropdown shell because both apps already share the same identity area and need the same menu shape.

Alternative considered: implement separate dropdowns in `AppShell.vue` and `AdminAppShell.vue`. That would duplicate overlay styling, accessibility wiring, and future fixes across both SPAs, so it is rejected unless PrimeVue constraints force app-local ownership.

### Keep App-Specific Navigation And Logout Wiring In App Shells

`WorkspaceHeader` should accept an app-provided settings route target, menu label, optional icon, counterpart workspace href, and counterpart workspace label, then emit a sign-out event. `AppShell.vue` maps `Profile` to the user profile/settings route, passes the profile icon, and handles sign-out by awaiting `useAuthStore().logout()` before navigating to the user login route. `AdminAppShell.vue` maps `Settings` to the admin settings route and handles sign-out by awaiting its auth store logout method before navigating to the admin login route. The counterpart href/label props should render the dropdown workspace action so both SPAs use the same configured destination without a standalone top-bar workspace link.

Alternative considered: have `WorkspaceHeader` import app route names or auth stores directly. That would violate package boundaries because `packages/web-shared` must stay app-agnostic.

### Use PrimeVue Menu Semantics In A Header-Local Popup

The dropdown should use PrimeVue `Menu` item semantics, command callbacks, and router item templating, triggered from the profile/avatar control. To satisfy the sticky-header-pinned requirement, the menu should render as a controlled header-local surface inside the profile region instead of a document-positioned overlay. The trigger should expose an accessible label such as `Open profile menu`, keep `aria-expanded` aligned with open state, close on outside click or `Escape`, and restore focus to the trigger when dismissed through keyboard or app-owned menu actions. The counterpart workspace action should close the local menu before the browser follows the counterpart link.

Alternative considered: PrimeVue's default popup overlay positioning and `appendTo` variations. That approach was rejected because it can detach from or disappear under the sticky header constraints. Fully custom menu markup remains rejected because PrimeVue `Menu` can still own the action model and menu semantics while the app controls the header-local placement.

### Preserve Design Tokens And Current Header Layout

The trigger and menu should use existing token utilities for surface, divider, text, destructive color, radius, and shadow. The dropdown should visually match the approved `.pen` menu: compact width around the design's 264px surface, 44px action rows, a divider before sign-out, muted profile/settings icon treatment, brand-tinted counterpart workspace treatment, destructive sign-out treatment, a small caret/pointer aimed at the profile avatar circle, and a visible top offset from the profile trigger using the shared spacing scale, e.g. `mt-3` / 12px. The popup must stay attached to the sticky header instead of document scrolling coordinates so it remains visible with the header while the page scrolls. The rounded border around the profile trigger and the brand ring around the avatar are active-open styling only; they MUST appear while the dropdown is open and MUST NOT be shown in the closed state.

Alternative considered: raw hex or component-local CSS values. That conflicts with the repo's token-based UI rules and would make theme maintenance harder.

### Test Shared Behavior And App Wiring Separately

`WorkspaceHeader.spec.ts` should cover rendering, popup trigger/menu items, counterpart workspace action href/label/visibility, profile/settings item label/icon/routing target, and sign-out event emission. `AppShell.spec.ts` and `AdminAppShell.spec.ts` should verify each shell passes the correct label/icon and settings destination, preserves existing top-bar content, removes duplicate nav entries, wires sign-out to the app auth store, and redirects to the app login route after logout. `ProfileView.spec.ts` should verify the user Profile page does not render a duplicate sign-out action.

Alternative considered: only testing the shared component. That would miss the highest-risk behavior: the app-specific settings route and logout wiring.

## Risks / Trade-offs

- PrimeVue's default document-positioned popup can conflict with the sticky-header-pinned requirement → render the PrimeVue `Menu` as a controlled header-local surface and tune classes/PT so the visual intent, right alignment, and spacing match the design as closely as possible.
- Adding a clickable wrapper around the display name/avatar could disrupt current top-bar spacing → preserve the existing grid and right-area gap, and only add trigger styling around the identity group.
- Header-owned logout creates auth-store wiring in both shells → keep `WorkspaceHeader` store-agnostic and test the app-level event handlers.
- Mobile space is tighter in the top-right identity area → hide optional display name at small widths as today, keep the avatar trigger available, and ensure the menu remains reachable.
- Moving the counterpart workspace action into the dropdown can reduce immediate desktop discoverability → keep it as the first dropdown action with brand treatment and preserve the same configured href/label across both SPAs.

## Migration Plan

- Update the shared header component and its tests first.
- Wire `user-web` and `admin-web` shells to pass settings targets, counterpart workspace actions, and sign-out handlers.
- Remove duplicate Profile/Settings nav items and user Profile page sign-out action.
- Run shared and app-level frontend verification.
- Rollback is limited to reverting the shared header changes and app shell prop/event wiring; no data migration is required.

## Open Questions

- None. The requested menu contents and the approved `.pen` positioning are sufficient for implementation.
