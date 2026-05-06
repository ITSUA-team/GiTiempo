## 1. Service Layer — projects.ts

- [x] 1.1 Create `apps/admin-web/src/services/projects.ts` and add import block: `requestJson` from `@gitiempo/web-shared/http`; all response/input types from `@gitiempo/shared`; `BASE` constant from `import.meta.env.VITE_API_BASE_URL`
- [x] 1.2 Implement `fetchProjects(accessToken): Promise<ProjectListResponse>` — `GET /projects`
- [x] 1.3 Implement `fetchProjectSummary(accessToken): Promise<ManagementProjectSummaryResponse>` — `GET /projects/summary`
- [x] 1.4 Implement `fetchProjectAssignments(accessToken, projectId): Promise<ProjectAssignmentListResponse>` — `GET /projects/{id}/assignments`
- [x] 1.5 Implement `createProject(accessToken, body: CreateProjectInput): Promise<ProjectResponse>` — `POST /projects`
- [x] 1.6 Implement `updateProject(accessToken, projectId, body: UpdateProjectInput): Promise<ProjectResponse>` — `PATCH /projects/{id}`
- [x] 1.7 Implement `assignMember(accessToken, projectId, userId): Promise<void>` — `POST /projects/{id}/assignments` with `{ userId }`
- [x] 1.8 Implement `removeAssignment(accessToken, projectId, assignmentId): Promise<void>` — `DELETE /projects/{id}/assignments/{assignmentId}`

## 2. Service Layer — members.ts

- [x] 2.1 Create `apps/admin-web/src/services/members.ts`
- [x] 2.2 Implement `fetchMembers(accessToken): Promise<WorkspaceMemberListResponse>` — `GET /workspace/members` using `requestJson` and `BASE`

## 3. Shared PageHeader Component

- [x] 3.1 Create `packages/web-shared/src/components/PageHeader.vue` with `<script setup lang="ts">`
- [x] 3.2 Define `StatItem` interface `{ label: string; value: string | number }` and `defineProps<{ title: string; description?: string; stats?: StatItem[] }>()`
- [x] 3.3 Implement page heading block: `<h1>` with `text-[28px] font-semibold text-text-dark`, description `<p>` with `text-sm font-normal text-text-muted`, wrapped in `flex flex-col gap-[6px]`
- [x] 3.4 Implement stat cards row: `flex gap-4 h-[96px]`; each card `flex-1 rounded-lg shadow-card bg-surface p-4 flex flex-col gap-2`; stat label `text-[13px] font-medium text-text-muted`; stat value `text-[28px] font-semibold text-text-dark`
- [x] 3.5 Render stat cards only when `stats` prop is non-empty (v-if)
- [x] 3.6 Add default slot for CTA positioned to the right of the heading block (`flex items-center justify-between`)
- [x] 3.7 Export `PageHeader` and `StatItem` type from `packages/web-shared/src/components/index.ts`
- [x] 3.8 Run `pnpm --filter @gitiempo/web-shared typecheck` — fix any errors before proceeding

## 4. ProjectsView — Scaffold and Data Loading

- [x] 4.1 Open `apps/admin-web/src/views/ProjectsView.vue`, remove `PlaceholderPage` import and template usage
- [x] 4.2 Add `<script setup lang="ts">` block; import `useAuthStore` from `@/stores/auth`, `storeToRefs` from `pinia`; destructure `accessToken` with `storeToRefs`
- [x] 4.3 Import `useToast` from `primevue/usetoast` and call `const toast = useToast()`
- [x] 4.4 Declare reactive state: `projects`, `summary`, `members`, `assignments` (`Map<string, ProjectAssignmentListResponse>`), `loading`, `error`
- [x] 4.5 Implement `loadAll()` async function: call `fetchProjectSummary`, `fetchProjects`, `fetchMembers` in parallel with `Promise.all`; then fan-out `fetchProjectAssignments` for each project in parallel and populate the `assignments` Map
- [x] 4.6 Call `loadAll()` in `onMounted`; catch errors and show `toast.add({ severity: 'error', ... })` for each failure
- [x] 4.7 Add page root template: `<div class="flex flex-col gap-6 p-6 bg-app-bg min-h-full">`

## 5. ProjectsView — PageHeader and Stat Cards

- [x] 5.1 Import `PageHeader` from `@gitiempo/web-shared/components`
- [x] 5.2 Use `<PageHeader title="Projects" description="Manage project visibility, member assignments, and manual project creation." :stats="summaryStats">`
- [x] 5.3 Compute `summaryStats` from `summary` ref: `[{ label: 'Active Projects', value: summary.value?.activeProjects ?? '—' }, { label: 'Private', value: summary.value?.privateProjects ?? '—' }, { label: 'Public', value: summary.value?.publicProjects ?? '—' }]`

## 6. ProjectsView — New Project Button and Dialog

- [x] 6.1 Add `<Button label="New Project" class="bg-brand text-surface text-sm font-semibold rounded-sm h-9 px-4" />` in the `PageHeader` default slot; bind `@click="newProjectVisible = true"`
- [x] 6.2 Declare `newProjectVisible`, `newProjectName`, `newProjectVisibility`, `newProjectNameError`, `newProjectSaving` refs
- [x] 6.3 Add `<Dialog v-model:visible="newProjectVisible" header="New Project" modal>` template block
- [x] 6.4 Inside dialog: `<div class="flex flex-col gap-1">` label + `<InputText v-model="newProjectName" :invalid="!!newProjectNameError" class="w-full" />`+ `<small v-if="newProjectNameError" class="text-xs text-destructive">`
- [x] 6.5 Inside dialog: label + `<Select v-model="newProjectVisibility" :options="visibilityOptions" option-label="label" option-value="value" class="w-full" />` with options `[{ label: 'Public', value: 'public' }, { label: 'Private', value: 'private' }]`
- [x] 6.6 Dialog footer: Cancel `<Button>` (`severity="secondary" variant="outlined"`) and Create `<Button>` (`:loading="newProjectSaving"`)
- [x] 6.7 Implement `submitNewProject()`: validate name non-empty (set `newProjectNameError`), call `createProject`, on success call `loadAll()` and close dialog, on error show toast

## 7. ProjectsView — Member Filter

- [x] 7.1 Declare `filterMemberId` ref (`string | null`, default `null`)
- [x] 7.2 Compute `memberOptions`: map `members.value` to `{ label: \`${m.displayName ?? m.email} (${m.role})\`, value: m.userId }`; prepend `{ label: 'All members', value: null }`
- [x] 7.3 Add filter block above the table: `<div class="flex flex-col gap-1.5">` with `<p class="text-xs font-medium text-text-muted">Assigned member</p>` and `<Select v-model="filterMemberId" :options="memberOptions" option-label="label" option-value="value" class="w-[260px] h-[38px] rounded-sm" />`
- [x] 7.4 Compute `filteredProjects`: `projects.value.filter(p => !filterMemberId.value || assignments.get(p.id)?.some(a => a.userId === filterMemberId.value))`

## 8. ProjectsView — DataTable

- [x] 8.1 Import `DataTable`, `Column` from `primevue`; wrap table in a card: `<div class="rounded-lg shadow-card bg-surface p-5 flex flex-col gap-4">`
- [x] 8.2 Add table heading row: `<div class="flex items-center justify-between">` with `<h2 class="text-lg font-semibold text-text-dark">Projects Table</h2>` and the filter block (task 7.3)
- [x] 8.3 Add `<DataTable :value="filteredProjects" v-model:expanded-rows="expandedRows" data-key="id">` with `pt` overrides: `headerCell: 'bg-app-bg h-[44px] text-[13px] font-semibold text-text-dark px-3'`, `bodyRow: 'h-[56px] border-t border-divider'`, `bodyCell: 'px-3'`
- [x] 8.4 Add Project column (`fill` width): `<Column field="name" header="Project">` with body template rendering `<span class="text-sm font-semibold text-text-dark">{{ slotProps.data.name }}</span>`
- [x] 8.5 Add Source column (140px): body renders `<span class="text-[13px] font-normal text-text-muted">{{ slotProps.data.source === 'github' ? 'GitHub Repo' : 'Manual' }}</span>`
- [x] 8.6 Add Assigned members column (220px): body renders `<span class="text-[13px] font-normal text-text-muted">{{ (assignments.get(slotProps.data.id) ?? []).length }} members</span>`
- [x] 8.7 Add Hours column (120px): body renders `<span class="text-[13px] font-semibold text-text-dark">{{ slotProps.data.totalHours }}h</span>`
- [x] 8.8 Add Visibility column (120px): body renders bespoke `<span>` — Public: `class="bg-accent-tint text-brand rounded-sm px-2 py-1 text-xs font-semibold"`; Private: `class="bg-status-warn-bg text-status-warn-text rounded-sm px-2 py-1 text-xs font-semibold"`
- [x] 8.9 Add Actions column (150px, right-aligned): two `<Button variant="text">` — Edit (`text-[13px] font-semibold text-brand`) and Archive (`text-[13px] font-semibold text-destructive`)
- [x] 8.10 Wire Edit button `@click`: set `expandedRows` to only that row (single-row enforcement — clear then set)
- [x] 8.11 Declare `expandedRows` ref as `Record<string, boolean>` (keyed by project id)

## 9. ProjectsView — Inline Settings Expansion Panel

- [x] 9.1 Add `<template #expansion="slotProps">` inside DataTable
- [x] 9.2 Expansion panel root: `<div class="bg-app-bg border-t border-divider p-4 flex items-end gap-[10px]">`
- [x] 9.3 Add panel label: `<p class="text-[13px] font-semibold text-text-dark">Project settings</p>`
- [x] 9.4 Add members field: `<div class="flex flex-col gap-1.5 flex-1">` with label `Select members` + `<MultiSelect v-model="editMembers[slotProps.data.id]" :options="memberSelectOptions" option-label="label" option-value="value" class="w-full h-[38px] rounded-sm" />`
- [x] 9.5 Compute `memberSelectOptions`: map `members.value` to `{ label: \`${m.displayName ?? m.email} (${m.role})\`, value: m.userId }`
- [x] 9.6 Add visibility field: `<div class="flex flex-col gap-1.5 w-[180px]">` with label `Visibility` + `<Select v-model="editVisibility[slotProps.data.id]" :options="visibilityOptions" option-label="label" option-value="value" class="w-full h-[38px] rounded-sm" />`
- [x] 9.7 Declare `editMembers` as `Record<string, string[]>` and `editVisibility` as `Record<string, string>`; pre-populate them when a row expands (watch `expandedRows`)
- [x] 9.8 Add Cancel `<Button severity="secondary" variant="outlined" label="Cancel" class="rounded-sm h-[34px]" @click="collapseRow(id)" />`
- [x] 9.9 Add Save `<Button label="Save" class="bg-brand text-surface rounded-sm h-[34px]" :loading="savingRows[id]" @click="saveRow(id)" />`
- [x] 9.10 Implement `saveRow(projectId)`: diff current members vs original assignments — call `assignMember` for added users, `removeAssignment` for removed; call `updateProject` if visibility changed; on complete reload assignments for that project, collapse row, show success toast; on error show error toast
- [x] 9.11 Implement `collapseRow(projectId)`: remove project id key from `expandedRows`

## 10. ProjectsView — Archive Action

- [x] 10.1 Implement `archiveProject(projectId)`: call `updateProject(token, projectId, { isActive: false })`; on success call `loadAll()` and show success toast; on error show error toast

## 11. ProjectsView — Loading and Empty States

- [x] 11.1 Show `<ProgressSpinner strokeWidth="3" style="width:40px;height:40px" />` centered in page while `loading.value` is true (before first data load)
- [x] 11.2 Show `<Skeleton>` rows (height `h-[56px]`) in place of DataTable rows while assignments are loading after the project list resolves
- [x] 11.3 Add DataTable `#empty` slot: `<div class="py-8 text-center text-sm text-text-muted">No projects yet.</div>`

## 12. Quality

- [x] 12.1 Run `pnpm --filter admin-web lint` — fix all reported issues
- [x] 12.2 Run `pnpm --filter admin-web typecheck` — fix all type errors
- [x] 12.3 Run `pnpm --filter @gitiempo/web-shared typecheck` — fix all type errors

## 13. Pixel-Perfect Fixes

- [x] 13.1 Fix stat card radius in `PageHeader.vue`: change `rounded-lg` → `rounded-[10px]` on each stat card `<div>` (design cornerRadius is 10px, `rounded-lg` maps to 8px via token)
- [x] 13.2 Fix projects card radius in `ProjectsView.vue`: change `rounded-lg` → `rounded-[10px]` on the projects card wrapper `<div>`
- [x] 13.3 Fix "New Project" button in `ProjectsView.vue`: replace `h-9` fixed height with `py-[10px]` padding and change `rounded-sm` → `rounded-[6px]` (design: padding [10, 16], cornerRadius 6)
- [x] 13.4 Fix `summaryStats` computed in `ProjectsView.vue`: return empty array `[]` when `summary.value` is null so stat cards are hidden (not shown with `"—"` values) when the summary API failed or hasn't loaded — stat cards should only render when real data is available
- [x] 13.5 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck` — confirm clean after fixes
- [x] 13.6 Run `pnpm --filter @gitiempo/web-shared typecheck` — confirm still clean after PageHeader change

## 14. API Route Fixes

- [x] 14.1 Fix `fetchProjectSummary` in `apps/admin-web/src/services/projects.ts`: change path from `/projects/summary` → `/projects/management-summary` (actual route: `@Get('management-summary')` on `@Controller('projects')`)
- [x] 14.2 Fix `fetchMembers` in `apps/admin-web/src/services/members.ts`: change path from `/workspace/members` → `/members` (actual route: `@Get()` on `@Controller('members')`)
- [x] 14.3 Run `pnpm --filter admin-web typecheck` — confirm still clean after path fixes

## 15. Admin Filter, Button Height, and Select Radius Fixes

- [ ] 15.1 In `ProjectsView.vue`, add `nonAdminMembers` computed that filters `members.value` to exclude `role === 'admin'`
- [ ] 15.2 Replace `memberSelectOptions` computed to use `nonAdminMembers` instead of `members.value` — admins must not appear in the inline settings `<MultiSelect>` (API returns 422 for admin assignments)
- [ ] 15.3 Replace `memberOptions` computed (filter `<Select>` above table) to also use `nonAdminMembers` for consistency — admins cannot be assigned so filtering by them would always return no results
- [ ] 15.4 Fix filter `<Select>` radius in `ProjectsView.vue`: change `rounded-sm` → `rounded-[6px]` (design: filterInput cornerRadius 6)
- [ ] 15.5 Fix "New Project" button height in `ProjectsView.vue`: PrimeVue `<Button>` ignores Tailwind padding via `class`; switch to `:pt="{ root: 'h-[38px] px-4 rounded-[6px] bg-brand text-surface text-sm font-semibold' }"` and remove the conflicting `class` padding/height attributes — target rendered height is 38px matching the design
- [ ] 15.6 Fix inline expansion `<MultiSelect>` radius: change `rounded-sm` → `rounded-[6px]`
- [ ] 15.7 Fix inline expansion visibility `<Select>` radius: change `rounded-sm` → `rounded-[6px]`
- [ ] 15.8 Run `pnpm --filter admin-web lint` — fix all issues
- [ ] 15.9 Run `pnpm --filter admin-web typecheck` — fix all type errors
