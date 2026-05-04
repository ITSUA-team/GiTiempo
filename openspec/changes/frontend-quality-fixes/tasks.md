## 1. HTTP Transport Migration

- [x] 1.1 In `packages/web-shared/src/api/projects-client.ts`, replace all imports from `./http-helpers` with `requestJson` from `@gitiempo/web-shared/http`; convert every `getJson`, `postJson`, `patchJson`, `deleteJson` call to the equivalent `requestJson` call with explicit `method` param where needed
- [x] 1.2 In `packages/web-shared/src/api/members-client.ts`, replace `getJson` import with `requestJson` from `@gitiempo/web-shared/http` and update all calls
- [x] 1.3 In `packages/web-shared/src/api/time-entries-client.ts`, replace `getJson` import with `requestJson` from `@gitiempo/web-shared/http` and update all calls
- [x] 1.4 Delete `packages/web-shared/src/api/http-helpers.ts`
- [x] 1.5 Remove the `http-helpers` export from `packages/web-shared/src/api/index.ts` if present

## 2. Shared formatHours Utility

- [x] 2.1 Create `packages/web-shared/src/utils/format-hours.ts` with an exported `formatHours(hours: number): string` pure function (logic: `0h`, `Xh`, or `Xh Ym` with rounded minutes)
- [x] 2.2 Export `formatHours` from `packages/web-shared/src/index.ts`
- [x] 2.3 In `apps/admin-web/src/components/projects/ProjectsTable.vue`, remove the local `formatHours` function and import from `@gitiempo/web-shared`
- [x] 2.4 In `apps/user-web/src/composables/useProjectFormatters.ts`, remove the local `formatHours` function and import from `@gitiempo/web-shared`

## 3. saveSettings Row-Close Timing Fix

- [x] 3.1 In `apps/admin-web/src/components/projects/ProjectsTable.vue`, remove the synchronous `expandedProjectId.value = null` from `saveSettings`; add a `closedProjectId` prop (`string | null`, default `null`) and a watcher that sets `expandedProjectId.value = null` when `closedProjectId` matches the currently expanded project
- [x] 3.2 In `apps/admin-web/src/views/ProjectsView.vue`, add a `closedProjectId` ref; set it to the project id after a successful `handleSave` call, and reset it to `null` immediately after; pass it as `:closed-project-id` to `<ProjectsTable>`

## 4. Raw Hex → Design Tokens

- [x] 4.1 In `apps/admin-web/src/components/projects/ProjectSourceCard.vue`, replace raw hex classes: `text-[#1A1A1A]` → `text-text-dark`, `text-[#666666]` → `text-text-muted`, `border-[#5D2B85]` → `border-brand`, `bg-[#F4F4F5]` → `bg-app-bg`; keep `bg-[#F7F2FC]` as-is (no token equivalent); remove empty `<script setup>` block

## 5. Raw `<button>` → PrimeVue `<Button>`

- [x] 5.1 In `apps/admin-web/src/components/projects/AddProjectForm.vue`, replace the Back raw button with `<Button variant="outlined" severity="secondary">` and the Create project raw button with `<Button type="submit">`; import `Button` from `primevue/button`
- [x] 5.2 In `apps/admin-web/src/components/projects/ProjectsTable.vue`, replace the inline Edit/Archive/Unarchive raw buttons with `<Button variant="text">` / `<Button variant="text" severity="danger">`; replace the Cancel button with `<Button variant="outlined" severity="secondary">` and Save button with `<Button>`; import `Button` from `primevue/button`; remove now-unused raw button Tailwind class strings
- [x] 5.3 In `apps/admin-web/src/components/layout/AdminPageHeader.vue`, replace the raw back-link button with `<Button variant="text" severity="secondary">`; import `Button` from `primevue/button`

## 6. Verification

- [x] 6.1 Run `pnpm --filter @gitiempo/web-shared typecheck` — confirm zero errors
- [x] 6.2 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck` — confirm zero errors
- [x] 6.3 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck` — confirm zero errors
- [x] 6.4 Run `pnpm --filter user-web test && pnpm --filter admin-web test` — confirm all tests pass
