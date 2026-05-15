## 1. Pencil Design Analysis

- [x] 1.1 Open the `Add Project` frame (`QjR0g`) in `GITiempo.pen` and build a pixel-perfect parity checklist: every element (back link, heading, sub-copy, form card title, all field labels + inputs, action buttons, source card tiles, footer note), its typography (size, weight, color), spacing (gaps, padding), border/radius, and shadow values
- [x] 1.2 Confirm the active nav state from the design: Projects item (`LEEpb`) uses `fill: $color-accent-tint`, `stroke left: 3px $color-brand`, text `$color-brand` weight 600 — note this for the nav fix task

## 2. Nav Active-State Fix (AdminAppShell)

- [x] 2.1 In `apps/admin-web/src/components/layout/AdminAppShell.vue`, compute an `activeName` that maps `routeNames.addProject` → `routeNames.projects`, so the Projects nav item stays highlighted when on the Add Project page
- [x] 2.2 Pass the computed `activeName` to `WorkspaceNavigation` instead of the raw `route.name`
- [x] 2.3 Verify manually (or via existing shell tests) that navigating to `/projects/new` keeps Projects active and no other item active

## 3. API Client — Add createProject Method

- [x] 3.1 Add a `createProject(accessToken, body)` method to `AdminProjectsClient` interface in `apps/admin-web/src/services/admin-projects-client.ts`
- [x] 3.2 Implement the method: `POST /projects` using `requestJson`, validate body with `createProjectSchema` from `@gitiempo/shared`, parse response with `projectResponseSchema`
- [x] 3.3 Export the updated `AdminProjectsClient` interface and confirm TypeScript is happy

## 4. Add Project View — Replace Mock

- [x] 4.1 Replace the content of `apps/admin-web/src/views/AddProjectMockView.vue` (keep the filename — route already imports it) with the real `<script setup lang="ts">` implementation
- [x] 4.2 Set up local state refs: `projectName` (string), `visibility` (ref defaulting to `'private'`), `isSubmitting` (boolean), `submitError` (string | null), `nameError` (string | null)
- [x] 4.3 Import and use `useAuthStore`, `useToast`, `useRouter`, and `adminProjectsClient`

## 5. Page Shell — Back Link & Header

- [x] 5.1 Render the outer content area with `padding: 24px`, `gap: 20px` vertical layout matching the `AiUnD` content frame
- [x] 5.2 Render "← Back to projects" as a `RouterLink` (or `<a @click="router.push({ name: routeNames.projects })">`) styled: `font-size: 13px`, `font-weight: 600`, `color: #5D2B85` — no PrimeVue Button, plain styled link matching the `hls7D` text node
- [x] 5.3 Render the header block (`arBaV`): `h1` "Add Project" (28px, semibold, `#1A1A1A`) and paragraph copy below it (14px, normal, `#666666`, full width)
- [x] 5.4 Render the body row (`YvIlm`) as a horizontal flex container with `gap: 20px`: left column (flex-1, form card) and right column (320px fixed, source card)

## 6. Form Card

- [x] 6.1 Wrap the form in a card surface (rounded, `$color-surface` background, `padding: 16px`, `gap: 12px` vertical layout) with title "Add Project Manually" (18px, semibold, `#1A1A1A`)
- [x] 6.2 Add "Project name" field: label (13px, medium, `#1A1A1A`) + PrimeVue `InputText` full-width, height 34px, border `$color-divider`, radius `$radius-sm`, bound to `projectName`; show `nameError` as an inline error message below the input when non-null
- [x] 6.3 Add the two-column row (`YZZFy`, `gap: 12px`): left col "Source" (read-only styled box showing "Manual", same height/border/radius as inputs), right col 160px "Project manager" (read-only styled box showing `authStore.displayName`)
- [x] 6.4 Add "Visibility" field full-width: label + PrimeVue `Select` (dropdown) with options `[{ label: 'Public', value: 'public' }, { label: 'Private', value: 'private' }]`, bound to `visibility`, default `'private'`
- [x] 6.5 Add action row (`6RItg`) right-aligned with `gap: 10px`: "Back" button (PrimeVue secondary/outlined, padding `8px 14px`) navigates to `routeNames.projects`; "Create project" button (PrimeVue primary brand fill, padding `8px 14px`) triggers submit
- [x] 6.6 Show a `submitError` inline error message below the action row when non-null

## 7. Form State Handling

- [x] 7.1 On submit: validate `projectName.trim()` is non-empty — set `nameError` and return early if empty
- [x] 7.2 Set `isSubmitting = true`, disable both action buttons and show a spinner on "Create project" while the request is in flight
- [x] 7.3 Call `adminProjectsClient.createProject(token, { name: projectName.trim(), visibility: visibility.value })` inside try/catch/finally
- [x] 7.4 On success: show PrimeVue toast (`severity: 'success'`, summary "Project created") and navigate to `routeNames.projects`
- [x] 7.5 On error: set `submitError` to the error message, re-enable the form; ensure `isSubmitting` is reset in `finally`
- [x] 7.6 Ensure no unhandled promise rejections anywhere in the submit flow

## 8. Project Source Sidebar Card

- [x] 8.1 Render the source card (`kqmMV`): white background, `border-radius: 10px`, `padding: 20px`, `gap: 14px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- [x] 8.2 Card title "Project Source" (18px, semibold, `#1A1A1A`) and subtitle copy (13px, normal, `#666666`, fixed-width full)
- [x] 8.3 "Manual project" tile (`anSFx`): `background: #F7F2FC`, `border: 1px solid #5D2B85`, `border-radius: 10px`, `padding: 14px`, `gap: 8px` — title (14px, semibold, `#1A1A1A`) + description (13px, normal, `#666666`)
- [x] 8.4 "Workspace import" tile (`sYeep`): `background: #F4F4F5`, no border, same radius and padding — title + description copy
- [x] 8.5 Footer note (`XJWZL`) below tiles: 12px, `#666666`, fixed-width — "You can still assign the PM, set visibility, and adjust project details after creation."
- [x] 8.6 Confirm neither tile has click handlers or cursor-pointer

## 9. Design Parity Verification

- [x] 9.1 Go through the parity checklist from task 1.1 element by element against the rendered page
- [x] 9.2 Verify spacing: `padding: 24` on content area, `gap: 20` between back link / header / body, `gap: 12` between form fields, `gap: 10` between action buttons, `gap: 14` inside source card
- [x] 9.3 Verify typography: back link (13px, 600, `#5D2B85`), heading (28px, 600, `#1A1A1A`), sub-copy (14px, 400, `#666666`), field labels (13px, 500, `#1A1A1A`), field values (14px, 500), form title (18px, 600), card title (18px, 600)
- [x] 9.4 Verify source card shadow and tile borders match exactly
- [x] 9.5 Document any PrimeVue-forced deviations in a code comment and note them in the PR description

## 10. Lint & Typecheck

- [x] 10.1 Run `pnpm --filter admin-web lint` and fix all reported issues
- [x] 10.2 Run `pnpm --filter admin-web typecheck` and fix all type errors
- [x] 10.3 Run `pnpm --filter admin-web test` to confirm no existing tests are broken
