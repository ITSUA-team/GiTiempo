## Context

Both authenticated SPAs render their header through `packages/web-shared/src/components/WorkspaceHeader.vue`. `apps/user-web/src/components/layout/AppShell.vue` passes the user identity, counterpart admin workspace link, and a center slot for the top-bar timer. `apps/admin-web/src/components/layout/AdminAppShell.vue` passes admin identity and counterpart user workspace link without the timer slot.

The approved design context is in `GITiempo.pen` as the full-page open states `User Dashboard - Profile Dropdown Open` and `Admin Dashboard - Profile Dropdown Open`. The dropdown is anchored below the top-right profile/avatar trigger, preserves the existing top bar, and contains only the app-owned profile/settings action plus destructive `Sign out`; user-web labels the first action `Profile` and uses the profile icon from the user nav, while admin-web labels it `Settings` and keeps the settings gear icon.

Relevant implementation rules come from `docs/ui/INDEX.md`, `docs/ui/layout.md`, `docs/ui/patterns.md`, `apps/user-web/AGENTS.md`, `apps/admin-web/AGENTS.md`, and `packages/web-shared/AGENTS.md`.

## Goals / Non-Goals

**Goals:**

- Add a profile dropdown to the shared authenticated header used by both SPAs.
- Keep user-web and admin-web header structure consistent while preserving app-specific center content and workspace cross-links.
- Navigate the first action to the app-owned settings destination: `user-web` labels it `Profile`, uses the user profile nav icon, and routes to the existing profile/settings route, while `admin-web` labels it `Settings`, keeps the settings gear icon, and uses the existing settings route.
- Run `Sign out` through each app's existing auth store logout flow, then navigate to that app's login route.
- Match the approved `.pen` dropdown open-state geometry, token language, and action hierarchy on desktop, with responsive behavior that remains usable on smaller screens.

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

`WorkspaceHeader` should accept an app-provided settings route target, menu label, and optional icon, then emit a sign-out event. `AppShell.vue` maps `Profile` to the user profile/settings route, passes the same profile icon used by the user nav, and handles sign-out by awaiting `useAuthStore().logout()` before navigating to the user login route. `AdminAppShell.vue` maps `Settings` to the admin settings route and handles sign-out by awaiting its auth store logout method before navigating to the admin login route.

Alternative considered: have `WorkspaceHeader` import app route names or auth stores directly. That would violate package boundaries because `packages/web-shared` must stay app-agnostic.

### Use PrimeVue Popup Menu Semantics

The dropdown should use PrimeVue's popup menu pattern, triggered from the profile/avatar control. PrimeVue `Menu` supports popup mode, command callbacks, router item templating, and built-in menu keyboard behavior. The trigger should expose an accessible label such as `Open profile menu` and should keep focus/expanded state consistent with the popup.

Alternative considered: custom absolute-positioned markup. That would make keyboard/focus behavior and ARIA semantics easier to regress, so it should be avoided unless PrimeVue cannot match the approved design closely enough.

### Preserve Design Tokens And Current Header Layout

The trigger and menu should use existing token utilities for surface, divider, text, destructive color, radius, and shadow. The dropdown should visually match the approved `.pen` menu: compact width around the design's 264px surface, two 44px rows, a divider, muted profile/settings icon treatment, destructive sign-out treatment, and a visible top offset from the profile trigger using the shared spacing scale, e.g. `mt-3` / 12px. The rounded border around the profile trigger and the brand ring around the avatar are active-open styling only; they MUST appear while the dropdown is open and MUST NOT be shown in the closed state.

Alternative considered: raw hex or component-local CSS values. That conflicts with the repo's token-based UI rules and would make theme maintenance harder.

### Test Shared Behavior And App Wiring Separately

`WorkspaceHeader.spec.ts` should cover rendering, popup trigger/menu items, profile/settings item label/icon/routing target, and sign-out event emission. `AppShell.spec.ts` and `AdminAppShell.spec.ts` should verify each shell passes the correct label/icon and settings destination, preserves existing top-bar content, wires sign-out to the app auth store, and redirects to the app login route after logout.

Alternative considered: only testing the shared component. That would miss the highest-risk behavior: the app-specific settings route and logout wiring.

## Risks / Trade-offs

- PrimeVue popup positioning may differ slightly from the `.pen` absolute coordinates → use PrimeVue's overlay behavior but tune classes/PT so the visual intent, right alignment, and spacing match the design as closely as possible.
- Adding a clickable wrapper around the display name/avatar could disrupt current top-bar spacing → preserve the existing grid and right-area gap, and only add trigger styling around the identity group.
- Header-owned logout creates auth-store wiring in both shells → keep `WorkspaceHeader` store-agnostic and test the app-level event handlers.
- Mobile space is tighter in the top-right identity area → hide optional display name at small widths as today, keep the avatar trigger available, and ensure the menu remains reachable.

## Migration Plan

- Update the shared header component and its tests first.
- Wire `user-web` and `admin-web` shells to pass settings targets and sign-out handlers.
- Run shared and app-level frontend verification.
- Rollback is limited to reverting the shared header changes and app shell prop/event wiring; no data migration is required.

## Open Questions

- None. The requested menu contents and the approved `.pen` positioning are sufficient for implementation.
