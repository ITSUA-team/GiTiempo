# GiTiempo Frontend Rules

**Version 1.1.0**
GiTiempo Frontend Rules
April 2026

> **Note:**
> This document is for agents and contributors working on the GiTiempo
> frontend. It condenses the project UI docs into implementation rules so
> frontend changes stay aligned across `apps/user-web`, `apps/admin-web`,
> and `packages/web-config`.

---

## 1. Scope

- Applies to `apps/user-web` and `apps/admin-web`.
- Applies to shared frontend theme/bootstrap code in `packages/web-config`.
- Applies to shared frontend browser/runtime leaf extraction between the two SPAs.
- Applies to shared Vue component extraction between the two SPAs.
- Applies to app UI built with PrimeVue and Tailwind CSS.
- The Chrome extension is an exception: it uses Tailwind only, but should still share the same design tokens where practical.

## 2. Source Of Truth

Read the smallest relevant set of files for the task.

- UI index: `docs/ui/INDEX.md`
- Setup and theming: `docs/ui/setup.md`
- Component conventions: `docs/ui/components.md`
- Shell and responsive layout: `docs/ui/layout.md`
- Interaction patterns: `docs/ui/patterns.md`
- Accessibility rules: `docs/ui/accessibility.md`
- User screen details: `docs/ui/pages-user.md`
- Admin screen details: `docs/ui/pages-admin.md`
- User app notes: `apps/user-web/AGENTS.md`
- Admin app notes: `apps/admin-web/AGENTS.md`
- Relevant approved Pencil `.pen` screen for the task when one exists

Do not invent alternate frontend conventions when these files already define them.
Before implementing UI, inspect the smallest relevant docs first, then inspect the smallest relevant approved design source.
If docs and design conflict, the docs are the source of truth.

## 3. Stack And Bootstrap

### 3.1 Framework Stack

- Tailwind CSS v4 configured in CSS via `@theme`.
- PrimeVue v4 in styled mode.
- Aura is the base preset for PrimeVue.
- Heroicons are the default custom icon library.

### 3.2 Important Repo Paths

- Shared token source: `packages/web-config/src/styles/tokens.css`
- Shared PrimeVue preset: `packages/web-config/src/theme/primevue.ts`
- Shared package entry: `packages/web-config/src/index.ts`
- User app bootstrap: `apps/user-web/src/main.ts`
- Admin app bootstrap: `apps/admin-web/src/main.ts`
- User app stylesheet: `apps/user-web/src/assets/main.css`
- Admin app stylesheet: `apps/admin-web/src/assets/main.css`

### 3.3 Bootstrap Rules

- `ToastService` and `ConfirmationService` should be wired during app bootstrap so toasts and confirmation flows do not require bootstrap changes later.
- Shared frontend-only bootstrap and theme code belongs in `packages/web-config`.
- Shared contracts belong in `packages/shared/src/contracts/` when the UI task changes payload shapes or validators.
- Shared frontend-only runtime helpers, browser-only form schemas, and reusable Vue components belong in `packages/web-shared`.

### 3.4 Shared Frontend Leaf Boundaries

- Extract only browser/runtime leaf modules that are already behaviorally identical across `apps/user-web` and `apps/admin-web`.
- First-wave sharing candidates are:
  - auth HTTP request helpers
  - current-user client helpers
  - refresh-token storage helpers
  - counterpart-workspace link helpers
- A dedicated frontend package is the preferred home for shared browser/runtime code.
- Do not move these runtime leaves into `@gitiempo/shared`, which must remain backend-safe and contract-focused.
- Do not move these runtime leaves into `@gitiempo/web-config`, which must remain theme/bootstrap-focused.
- Shared Vue components are allowed in `@gitiempo/web-shared` when they are small PrimeVue-based blocks with stable props/emits contracts and at least two real SPA call sites.
- Keep `stores/auth.ts`, `router/index.ts`, route maps, route-level views, and product-specific shell/login composition app-local unless there are two stable call sites and clear evidence that a smaller shared abstraction is already justified.
- When comparing login or shell UI between the SPAs, extract only sub-regions with stable repeated structure; do not force full-page unification.

## 4. Tailwind Token Rules

### 4.1 Non-Negotiable Rules

- Do not use raw hex values in class attributes.
- Use token utilities such as `bg-brand`, `text-text-muted`, `border-divider`, `rounded-sm`, and `shadow-card`.
- If a token is missing, prefer adding it centrally over introducing one-off hardcoded styling.

### 4.2 Core Color Tokens

- Brand Purple: `bg-brand`, `text-brand`, `border-brand`
- Accent Tint: `bg-accent-tint`
- Surface: `bg-surface`
- App Background: `bg-app-bg`
- Text Dark: `text-text-dark`
- Text Muted: `text-text-muted`
- Divider: `border-divider`
- Destructive: `text-destructive`, `border-destructive`

### 4.3 Color Usage Rules

- Do not use Brand Purple as a large background area.
- Accent Tint is the only approved purple-tinted background surface.
- Text on Brand Purple must be white.
- Text on Accent Tint must be `text-text-dark` or `text-brand`.

### 4.4 Typography

- H1: `text-2xl font-semibold`
- H2: `text-lg font-semibold`
- H3: `text-base font-semibold`
- Primary body and labels: `text-sm font-medium`
- Secondary body and metadata: `text-[13px] font-normal`
- Caption and helper text: `text-xs font-normal`

### 4.5 Spacing, Radius, Shadows

- Base spacing unit: `4px`
- Default block spacing: `gap-4` and `p-4`
- Section spacing: `gap-6` to `gap-8`
- Control radius: `rounded-sm`
- Dropdown and tooltip radius: `rounded-md`
- Card and modal radius: `rounded-lg`
- Card shadow: `shadow-card`
- Overlay shadow: `shadow-popover`
- Modal shadow: `shadow-modal`

### 4.6 Design Fidelity

- Desktop frontend implementation is expected to be pixel-perfect to the approved design.
- Match the approved font family, font size, font weight, line height, spacing, padding, gaps, radii, borders, layout alignment, and component hierarchy.
- Reuse shared tokens and PrimeVue styling hooks to achieve that fidelity instead of introducing visual approximations.
- If the design cannot be matched because of a technical constraint or a conflict in the source of truth, stop and ask instead of improvising.

## 5. PrimeVue Rules

### 5.1 Default Strategy

- Prefer PrimeVue components for app UI.
- Do not rebuild standard controls with raw HTML when PrimeVue already provides the component.
- Raw `<button>`, `<input>`, `<textarea>`, `<select>`, custom status pills, custom avatars, custom tables, custom dialogs, and custom loading spinners are not allowed for standard SPA UI when a PrimeVue equivalent exists.
- PrimeIcons should only be used for icons rendered internally by PrimeVue.

### 5.2 Styling Order

- Global PrimeVue preset is the first styling mechanism.
- Instance-level `pt` overrides are the second styling mechanism.
- Do not use `!important`.
- Do not add deep selectors to force styles when the real issue is token setup or CSS layer ordering.

### 5.3 PT Rules

- Use `pt` for per-instance customization.
- Keep `pt` overrides focused on visual classes.
- Never remove or override PrimeVue-generated `role`, `aria-*`, `tabindex`, or `id` attributes through `pt`.

### 5.4 CSS Layer Rule

- `cssLayer` ordering is required when combining PrimeVue styled mode with Tailwind utilities.
- If a Tailwind utility inside a PrimeVue `pt` override is not applying, fix layer order or preset tokens first.

## 6. Component Rules

### 6.1 Buttons

- Use PrimeVue `<Button>`.
- Primary action: default button styling.
- Secondary action: `severity="secondary" variant="outlined"`.
- Ghost action: `variant="text"`.
- Destructive action: `severity="danger" variant="outlined"`.
- Loading state: `<Button loading>`.

### 6.2 Inputs And Forms

- Use PrimeVue form controls such as `<InputText>`, `<Textarea>`, `<InputNumber>`, and `<Password>`.
- Wrap fields with `class="flex flex-col gap-1"`.
- Always use a real `<label>` associated with the field.
- Use `invalid` plus helper text for error states.
- Default to `class="w-full"`.
- Use Zod to validate shared or contract-facing form payloads before they cross store, Firebase, or HTTP boundaries.

### 6.2.1 Zod Validation Boundaries

- Contract-facing request and response schemas belong in `packages/shared/src/contracts/`.
- Browser-only shared form schemas belong in `packages/web-shared`.
- Response parsing belongs at shared HTTP client boundaries so both SPAs fail consistently on API drift.
- Do not duplicate the same frontend schema in both apps; extract it to the correct shared package.

### 6.3 Tables

- Use `<DataTable>` and `<Column>`.
- Header row should use the documented uppercase metadata style.
- Body rows should use divider borders and hover background.
- Selected rows should use `bg-accent-tint`.
- Numeric columns should be right aligned.

### 6.4 Tags, Badges, Avatars

- Use `<Tag>` for statuses.
- Use `<Badge>` for counts.
- Use `<Avatar>` for people.
- Status styling should map through documented severities and tokens instead of ad hoc colors.

### 6.5 Icons, Empty States, Loading

- Use Heroicons for custom icons.
- Empty states should have a clear title, muted supporting text, and optional CTA.
- Use `<Skeleton>` for inline loading.
- Use `<ProgressSpinner>` for full-page loading.
- Color spinners through preset tokens or `pt`, not removed legacy props.

## 7. Layout Rules

### 7.1 Shared App Shell

User and Admin SPAs share the same shell model:

- Top bar: `bg-surface border-b border-divider h-16`
- Sidebar: `bg-surface border-r border-divider w-60`
- Main content: `bg-app-bg p-6`

### 7.2 Sidebar Navigation

- Nav item height: `h-11 px-4`
- Default label: `text-sm font-medium text-text-dark`
- Default icon: `text-text-muted`
- Hover: `hover:bg-app-bg`
- Active: `bg-accent-tint text-brand font-semibold border-l-[3px] border-brand`

### 7.3 Responsive Behavior

- Mobile under `640px`: hide sidebar, use bottom nav up to 5 items.
- Tablet `640px` to `1024px`: sidebar collapses to icon-only `w-16`.
- Desktop above `1024px`: full sidebar `w-60`.
- MVP is desktop-first, but mobile support is still required.

### 7.4 Page Header Pattern

Every page should use a consistent header block:

- Title: `text-2xl font-semibold text-text-dark`
- Subtitle: `text-sm font-normal text-text-muted`
- Primary CTA aligned to the right and centered vertically with the title row

## 8. Shared Interaction Patterns

### 8.1 Dialogs

- Use PrimeVue `<Dialog>`.
- Default form dialog width is around `480px`.
- Footer layout should be `flex justify-end gap-2`.
- Destructive dialogs use `severity="danger"` for the main action.
- `dismissableMask` should remain enabled only for non-destructive dialogs.

### 8.2 Toasts

- Use `<Toast>` and `useToast()`.
- Position: top right.
- Success, info, and warn messages auto-dismiss after `4000ms`.
- Errors should require manual dismiss.

### 8.3 Confirmations

- Use `<ConfirmDialog>` and `useConfirm()`.
- Require confirmation before destructive actions.
- Footer order should keep cancel before the destructive action.

### 8.4 Date And Time Inputs

- Use `<DatePicker>`.
- Range filters use `selectionMode="range"`.
- Time-only values use `timeOnly` and `hourFormat="24"`.
- Combined date/time values use `showTime`.
- Do not split hours and minutes into separate manual text inputs.

### 8.5 Selectors

- Cascading task selection should use sequential `<Select>` controls.
- Order: Organization -> Project/Repo -> Issue.
- Enable `filter` on each select.
- Disable each level until the previous one has a value.
- Use `:loading` while dependent options load.
- Multi-value filters should use `<MultiSelect>` with `filter` and `display="chip"`.

### 8.6 Duration Formatting

- Default duration format: `Xh Ym`
- Running timer format: `HH:MM:SS`
- Do not show raw seconds outside the running timer

## 9. Accessibility Rules

### 9.1 Required In Custom Work

- All interactive elements must show a visible focus indicator.
- For custom non-PrimeVue controls, use `outline-2 outline-brand outline-offset-2`.
- All form fields need associated labels.
- Icon-only buttons need `aria-label`.
- Custom interactive elements must support keyboard navigation.
- UI must meet WCAG 2.1 AA contrast targets.

### 9.2 PrimeVue Coverage

Do not re-implement behavior already handled by PrimeVue for these components:

- `<Dialog modal>` for focus trapping and restoration
- `<DataTable>` for sort announcements
- `<Select>` and `<MultiSelect>` for keyboard navigation
- `<DatePicker>` for keyboard date navigation
- `<Toast>` for live region behavior
- `<ConfirmDialog>` for safe default focus behavior

### 9.3 Safe Customization Rule

- When using `pt`, do not break built-in accessibility attributes or keyboard interaction.

## 10. App-Specific Notes

### 10.1 User Web

- Primary source: `apps/user-web/AGENTS.md`
- App bootstrap lives in `apps/user-web/src/main.ts`
- Shared CSS tokens are imported in `apps/user-web/src/assets/main.css`
- Verification: `pnpm --filter user-web lint && pnpm --filter user-web typecheck`

### 10.2 Admin Web

- Primary source: `apps/admin-web/AGENTS.md`
- App bootstrap lives in `apps/admin-web/src/main.ts`
- Shared CSS tokens are imported in `apps/admin-web/src/assets/main.css`
- Verification: `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`

### 10.3 Shared Frontend Package

- Use `packages/web-config` for shared PrimeVue preset and token-level frontend configuration.
- Use `packages/web-shared` for shared browser/runtime helpers, browser-only form schemas, and reusable Vue components.
- If shared theme or shared frontend package code changes, verify both web apps.

### 10.4 Frontend Auth And Router Parity

- `apps/admin-web` auth direction must stay aligned with `apps/user-web`: Firebase Auth on the frontend, backend token exchange, refresh-token bootstrap, and logout cleanup.
- When an auth/session/router behavior is already established in one SPA and documented in specs, mirror that behavior in the counterpart SPA unless the docs explicitly diverge.
- Prefer small local orchestration around shared leaves over inventing a second auth model.

## 11. Implementation Workflow

When doing frontend work in this repo:

1. Read `docs/ui/INDEX.md` first.
2. Load only the minimal relevant UI section docs for the task.
3. Check the nearest app `AGENTS.md` file.
4. Inspect the relevant approved `.pen` design screen before implementing when one exists.
5. Prefer the smallest correct UI change.
6. Implement desktop UI pixel-perfect to the approved design unless the user asked for a deliberate deviation.
7. If docs and design conflict, follow the docs.
8. Reuse shared tokens and preset logic instead of introducing app-local styling forks.
9. When both SPAs contain matching browser/runtime helpers, prefer extracting the smallest proven-identical leaf instead of maintaining silent duplication.
10. When both SPAs contain matching PrimeVue-based UI blocks, extract the smallest stable shared Vue component into `packages/web-shared`.
11. Keep app-specific orchestration local unless two stable call sites justify sharing more.
12. Verify the affected app with lint and typecheck.
13. If shared frontend code changed, verify both web apps.

## 12. Frontend Auth And Router Regression Testing

Use focused frontend tests to protect normalized session behavior.

### 12.1 When To Add Or Update Tests

- Add or update focused tests whenever a change touches auth store behavior, Firebase runtime wiring, login flow, session bootstrap, logout cleanup, route guards, or preserved redirects.
- Treat `pnpm --filter user-web test` and `pnpm --filter admin-web test` as required verification for those changes, not optional extras.

### 12.2 Minimum High-Value Coverage

- Bootstrap restores a session from a valid refresh token and rotates stored credentials.
- Bootstrap clears state when the refresh token is missing, invalid, or rejected.
- Email/password login stores the token pair and loads the current user profile.
- Google login stores the token pair and loads the current user profile.
- Failed login clears stale local session state.
- Logout clears local session state even if the backend logout request fails.
- Anonymous access to a protected route redirects to `/login` and preserves the requested destination.
- Authenticated access to `/login` redirects to the default authenticated route or a valid preserved redirect target.
- Invalid redirect targets fall back to the default authenticated route.

### 12.3 Shared Leaf Contract Tests

- If a change touches shared auth HTTP helpers or current-user client helpers, add service-level tests at the fetch boundary.
- Verify request paths, auth headers, payload shapes, response parsing, and error propagation.
- Do not rely only on store-level runtime mocks when the real risk is HTTP client or schema drift.

### 12.4 Test Design Rules

- Prefer behavior assertions over router internals or implementation traces.
- Do not treat route presence or exact `matched[]` structure as sufficient proof of auth behavior.
- Keep store/router tests focused on deterministic session normalization behavior.
- Add component tests when UI wiring itself is the regression risk, such as login submission, visible error state, or counterpart-workspace links.

## 13. Anti-Patterns To Avoid

- Raw hex colors in Vue templates or class attributes
- Rebuilding standard controls with plain HTML instead of PrimeVue
- Duplicating the same Zod form schema or shared PrimeVue UI block in both SPAs
- Deep CSS selectors to fight PrimeVue styling
- `!important` for normal styling conflicts
- Breaking or overriding PrimeVue ARIA behavior through customization
- One-off token values that should live in the shared theme
- Adding dark-mode-specific behavior for MVP work
- Extracting full auth stores, routers, shells, login pages, or route-level pages into shared code just because two SPAs currently look similar
- Treating duplicated browser/runtime leaves as acceptable long-term when both SPAs already implement the same behavior
- Relying only on route inventory tests for auth/router changes while skipping session-lifecycle regression cases

## 14. Verification Commands

Frontend-only verification commands:

- `pnpm --filter user-web lint && pnpm --filter user-web typecheck`
- `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`

If a task changes shared frontend code in `packages/web-config` or a dedicated shared frontend package, run both commands and both frontend test suites.

---

## References

- `docs/ui/INDEX.md`
- `docs/ui/setup.md`
- `docs/ui/components.md`
- `docs/ui/layout.md`
- `docs/ui/patterns.md`
- `docs/ui/accessibility.md`
- `apps/user-web/AGENTS.md`
- `apps/admin-web/AGENTS.md`
