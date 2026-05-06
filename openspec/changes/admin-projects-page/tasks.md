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

- [x] 15.1 In `ProjectsView.vue`, add `nonAdminMembers` computed that filters `members.value` to exclude `role === 'admin'`
- [x] 15.2 Replace `memberSelectOptions` computed to use `nonAdminMembers` instead of `members.value` — admins must not appear in the inline settings `<MultiSelect>` (API returns 422 for admin assignments)
- [x] 15.3 Replace `memberOptions` computed (filter `<Select>` above table) to also use `nonAdminMembers` for consistency — admins cannot be assigned so filtering by them would always return no results
- [x] 15.4 Fix filter `<Select>` radius in `ProjectsView.vue`: change `rounded-sm` → `rounded-[6px]` (design: filterInput cornerRadius 6)
- [x] 15.5 Fix "New Project" button height in `ProjectsView.vue`: PrimeVue `<Button>` ignores Tailwind padding via `class`; switch to `:pt="{ root: 'h-[38px] px-4 rounded-[6px] bg-brand text-surface text-sm font-semibold' }"` and remove the conflicting `class` padding/height attributes — target rendered height is 38px matching the design
- [x] 15.6 Fix inline expansion `<MultiSelect>` radius: change `rounded-sm` → `rounded-[6px]`
- [x] 15.7 Fix inline expansion visibility `<Select>` radius: change `rounded-sm` → `rounded-[6px]`
- [x] 15.8 Run `pnpm --filter admin-web lint` — fix all issues
- [x] 15.9 Run `pnpm --filter admin-web typecheck` — fix all type errors

## 16. Edit Form Design Fix and Post-Save/Archive Reactivity

- [x] 16.1 Fix expansion panel layout in `ProjectsView.vue` to match design node `UD9Ym`: change outer `<div>` from a single horizontal `flex items-end` row to `flex flex-col gap-[10px]` (design: `layout:vertical, gap:10`); keep `bg-app-bg border-t border-divider p-4`
- [x] 16.2 Move the "Project settings" `<p>` title to be the first child of the new vertical outer div — it is a standalone heading above the controls row, not a sibling inside the controls row
- [x] 16.3 Wrap all four controls (MultiSelect, visibility Select, Cancel, Save) in an inner `<div class="flex items-end gap-[10px]">` — this is the `settingsRow` from the design (`layout:horizontal, alignItems:end, gap:10`)
- [x] 16.4 Change `assignments` state from `reactive(new Map<string, ProjectAssignmentListResponse>())` to `ref<Record<string, ProjectAssignmentListResponse>>({})` so template reads on `assignments.value[id]` are properly tracked by Vue's reactivity system
- [x] 16.5 Update `loadAll()`: replace `assignments.clear()` + `assignments.set(id, a)` loop with a single `assignments.value = fresh` assignment where `fresh` is built as a plain `Record` object
- [x] 16.6 Update `filteredProjects` computed: replace `assignments.get(p.id)` with `assignments.value[p.id]`
- [x] 16.7 Update the "Assigned members" column body template: replace `assignments.get(data.id)` with `assignments[data.id]` (no `.value` — vue-tsc auto-unwraps refs in templates)
- [x] 16.8 Update `watch(expandedRows)` pre-population: replace `assignments.get(projectId)` with `assignments.value[projectId]`
- [x] 16.9 Update `saveRow()`: replace `assignments.set(projectId, fresh)` with `assignments.value = { ...assignments.value, [projectId]: fresh }` so the ref change triggers reactivity
- [x] 16.10 Fix `collapseRow()`: after removing the key from `expandedRows`, also `delete editMembers[projectId]` and `delete editVisibility[projectId]` — this ensures the `watch(expandedRows)` re-initializes both fields from the latest `assignments` data the next time the row is expanded, instead of reusing stale pre-save draft values
- [x] 16.11 Run `pnpm --filter admin-web lint` — fix all issues
- [x] 16.12 Run `pnpm --filter admin-web typecheck` — fix all type errors

## 17. Decompose ProjectsView into Focused Components

All new components are admin-web–local and go in `apps/admin-web/src/components/projects/`.
Prefer PrimeVue components (`Tag`, `Button`, `MultiSelect`, `Select`, `InputText`, `Dialog`) over raw HTML elements wherever PrimeVue has an equivalent.

### 17.1 — ProjectVisibilityBadge

- [x] 17.1.1 Create `apps/admin-web/src/components/projects/ProjectVisibilityBadge.vue`
- [x] 17.1.2 Define props: `visibility: 'public' | 'private'`
- [x] 17.1.3 Render a PrimeVue `<Tag>` with `:value="visibility === 'public' ? 'Public' : 'Private'"` and `:pt` overrides to match design tokens — Public: `bg-accent-tint text-brand`; Private: `bg-status-warn-bg text-status-warn-text`; both: `rounded-sm px-2 py-1 text-xs font-semibold` (no raw `<span>`)

### 17.2 — ProjectSettingsPanel

- [x] 17.2.1 Create `apps/admin-web/src/components/projects/ProjectSettingsPanel.vue`
- [x] 17.2.2 Define props: `modelMembers: string[]`, `modelVisibility: string`, `memberOptions: { label: string; value: string }[]`, `visibilityOptions: { label: string; value: string }[]`, `saving: boolean`
- [x] 17.2.3 Define emits: `update:modelMembers`, `update:modelVisibility`, `save`, `cancel`
- [x] 17.2.4 Implement template matching design node `UD9Ym` exactly: outer `<div class="bg-app-bg border-t border-divider flex flex-col gap-[10px] p-4">`, title `<p class="text-text-dark text-[13px] font-semibold">Project settings</p>`, inner controls row `<div class="flex items-end gap-[10px]">`
- [x] 17.2.5 In the controls row: `<MultiSelect>` (flex-1) for members with `v-model` bound to `modelMembers` via `defineModel` or emits; `<Select>` (w-[180px]) for visibility; `<Button severity="secondary" variant="outlined" label="Cancel">` emitting `cancel`; `<Button label="Save" :loading="saving">` emitting `save`
- [x] 17.2.6 Use `v-model:modelMembers` and `v-model:modelVisibility` two-way binding pattern with `defineModel` (Vue 3.4+) or explicit prop + emit

### 17.3 — NewProjectDialog

- [x] 17.3.1 Create `apps/admin-web/src/components/projects/NewProjectDialog.vue`
- [x] 17.3.2 Define props: `visible: boolean`, `saving: boolean`, `visibilityOptions: { label: string; value: string }[]`; emit: `update:visible`, `submit: (payload: { name: string; visibility: 'public' | 'private' }) => void`
- [x] 17.3.3 Manage internal `name` and `visibility` refs; reset both when `visible` prop transitions to `true` (use `watch`)
- [x] 17.3.4 Implement validation: `nameError` ref set to `'Project name is required.'` when name is empty on submit; cleared on each submit attempt
- [x] 17.3.5 Implement template: PrimeVue `<Dialog v-model:visible="..." header="New Project" modal class="w-[480px]">` — name field using `<InputText>` with `:invalid` binding and `<small>` error; visibility field using `<Select>`; footer slot with Cancel and Create `<Button>` components — no raw `<input>` or `<select>` elements

### 17.4 — ProjectsTable

- [x] 17.4.1 Create `apps/admin-web/src/components/projects/ProjectsTable.vue`
- [x] 17.4.2 Define props: `projects: ProjectListResponse`, `assignments: Record<string, ProjectAssignmentListResponse>`, `memberOptions: { label: string | null; value: string | null }[]`, `memberSelectOptions: { label: string; value: string }[]`, `visibilityOptions: { label: string; value: string }[]`, `assignmentsLoading: boolean`, `expandedRows: Record<string, boolean>`, `editMembers: Record<string, string[]>`, `editVisibility: Record<string, string>`, `savingRows: Record<string, boolean>`, `filterMemberId: string | null`
- [x] 17.4.3 Define emits: `update:expandedRows`, `update:filterMemberId`, `update:editMembers`, `update:editVisibility`, `toggleRow: (id: string) => void`, `archiveProject: (id: string) => void`, `saveRow: (id: string) => void`, `collapseRow: (id: string) => void`
- [x] 17.4.4 Move the table header row (title + filter `<Select>`), the full `<DataTable>` with all `<Column>` definitions, and the `#expansion` template slot into this component; use `<ProjectVisibilityBadge>` in the Visibility column; use `<ProjectSettingsPanel>` in the `#expansion` slot
- [x] 17.4.5 Use `<Skeleton>` from PrimeVue (already imported) for the loading state in the Project name and Assigned members columns while `assignmentsLoading` is true

### 17.5 — Refactor ProjectsView

- [x] 17.5.1 Remove all markup from `ProjectsView.vue` that is now covered by child components; import and use `ProjectsTable`, `NewProjectDialog` in the template
- [x] 17.5.2 Keep only orchestration concerns in `ProjectsView.vue`: state declarations, `loadAll`, `onMounted`, computed (`summaryStats`, `nonAdminMembers`, `memberOptions`, `memberSelectOptions`, `filteredProjects`, `visibilityOptions`), `expandedRows` watch, `toggleRow`, `collapseRow`, `saveRow`, `archiveProject`, `submitNewProject`
- [x] 17.5.3 The final `ProjectsView.vue` template must contain only: the loading spinner, `<PageHeader>` with New Project button, the projects card `<div>` containing `<ProjectsTable>`, and `<NewProjectDialog>` — no inline `<DataTable>`, `<Column>`, `<Dialog>`, `<MultiSelect>`, or `<Select>` markup

### 17.6 — Quality

- [x] 17.6.1 Run `pnpm --filter admin-web lint` — fix all issues
- [x] 17.6.2 Run `pnpm --filter admin-web typecheck` — fix all type errors

## 18. Edit Form Pixel-Perfect Fix

Design source of truth: node `UD9Ym` (`projectSettings`) in `GITiempo.pen`.

### 18.1 — Background color

- [x] 18.1 Fix `ProjectSettingsPanel.vue` root `<div>` background: change `bg-app-bg` → `bg-[#F4F4F5]` — design node `UD9Ym` has `fill: #F4F4F5` (light grey), not the app background white. No token maps to this value; use the raw Tailwind arbitrary value.

### 18.2 — Expansion cell padding

- [x] 18.2 In `ProjectsTable.vue`, add `expansionCell: 'p-0'` to the DataTable `:pt` object alongside the existing `bodyCell: 'px-3'` — PrimeVue applies `bodyCell` pt to the `<td>` that wraps the `#expansion` slot, adding unwanted `px-3` horizontal padding that pushes the panel away from the table edges. `expansionCell: 'p-0'` overrides this so `ProjectSettingsPanel` fills edge-to-edge as designed.

### 18.3 — Button sizing via `:pt`

- [x] 18.3 Fix Cancel button in `ProjectSettingsPanel.vue`: replace `class="h-[34px] rounded-[6px]"` with `:pt="{ root: 'py-2 px-[14px] rounded-[6px] text-[13px] font-medium' }"` — design node `xMII9` (`cancelBtn`) has `padding: [8, 14]` (py=8px, px=14px) and `fontSize: 13, fontWeight: 500`; PrimeVue `<Button>` ignores `class` height/padding so `:pt` is required
- [x] 18.4 Fix Save button in `ProjectSettingsPanel.vue`: replace `class="bg-brand text-surface h-[34px] rounded-[6px]"` with `:pt="{ root: 'py-2 px-[14px] rounded-[6px] bg-brand text-surface text-[13px] font-semibold' }"` — design node `Fq21c` (`saveBtn`) has `padding: [8, 14]`, `fill: #5D2B85`, `fontSize: 13, fontWeight: 600`

### 18.5 — Verify with Pencil MCP

- [x] 18.5 After completing 18.1–18.4, take a screenshot of design node `UD9Ym` using Pencil MCP and compare it against the rendered component visually — confirm background is grey `#F4F4F5`, panel fills full table width with no side padding gaps, and button sizes match the design
- [x] 18.6 Run `pnpm --filter admin-web lint` — fix all issues
- [x] 18.7 Run `pnpm --filter admin-web typecheck` — fix all type errors

## 19. Edit Form Expansion Cell & Background Corrections

Two bugs introduced by Group 18 need fixing.

### 19.1 — Wrong PT key for expansion cell

- [x] 19.1 In `ProjectsTable.vue`, replace the incorrect `expansionCell: 'p-0'` key in the DataTable `:pt` object with `rowExpansionCell: 'p-0'` — the correct PrimeVue DataTable PT key for the `<td>` that wraps the `#expansion` slot is `rowExpansionCell`, not `expansionCell`. The wrong key has no effect, so the expansion `<td>` still inherits default PrimeVue padding, causing the `ProjectSettingsPanel` to be inset from the table edges.

### 19.2 — Wrong background color

- [x] 19.2 In `ProjectSettingsPanel.vue`, revert the root `<div>` background from `bg-[#F4F4F5]` back to `bg-app-bg` — design node `UD9Ym` has `fill: "$color-app-bg"` (not `#F4F4F5`); the `$color-app-bg` token maps to `bg-app-bg` utility. The hardcoded hex introduced in task 18.1 was incorrect.

### 19.3 — Quality

- [x] 19.3 Run `pnpm --filter admin-web lint` — fix all issues
- [x] 19.4 Run `pnpm --filter admin-web typecheck` — fix all type errors

## 20. Re-render Project Rows After Save

After `saveRow` completes, the "Assigned members" count and visibility badge in the table do not update until the user reloads the page.

### Root cause

`saveRow` in `ProjectsView.vue` already refreshes `assignments.value` (spread-replace) and patches `projects.value[idx]` (index mutation). The spread-replace on `assignments` correctly triggers Vue reactivity and the prop change propagates to `ProjectsTable`. However PrimeVue DataTable caches row slot renders keyed by `data-key="id"` — when the row object identity does not change (index mutation preserves the same array reference and same row object reference after `projects.value[idx] = { ...projects.value[idx] }`) DataTable does not re-render the body cells for that row.

### Fix

- [x] 20.1 In `ProjectsView.vue` `saveRow`, after patching `projects.value[idx]`, replace the whole `projects` array with a new array so DataTable sees a changed prop and re-renders all rows: change `projects.value[idx] = { ...projects.value[idx], visibility: ... }` to a `projects.value = projects.value.map(...)` immutable replacement — this guarantees both the row object reference and the array reference change, forcing DataTable body cell slots to re-evaluate with the updated `assignments` and `visibility`.

  Replace the current block:
  ```ts
  const idx = projects.value.findIndex((p) => p.id === projectId);
  if (idx !== -1) {
    projects.value[idx] = {
      ...projects.value[idx],
      visibility: editVisibility[projectId] as 'public' | 'private',
    };
  }
  ```
  With:
  ```ts
  projects.value = projects.value.map((p) =>
    p.id === projectId
      ? { ...p, visibility: editVisibility[projectId] as 'public' | 'private' }
      : p,
  );
  ```

- [x] 20.2 Run `pnpm --filter admin-web lint` — fix all issues
- [x] 20.3 Run `pnpm --filter admin-web typecheck` — fix all type errors

## 21. Re-render Fix (Correct Approach) + Filter Default

### 21.1 — Re-render after save via full reload

The `projects.value = projects.value.map(...)` approach introduced in task 20.1 still does not force PrimeVue DataTable to re-render body cell slots because DataTable compares row identity by `data-key` — replacing the array reference is not sufficient when the key values are unchanged. The correct and reliable approach is to call `loadAll()` after a successful save, exactly as `archiveProject` already does. This refreshes `projects`, `assignments`, and `summary` from the server in one shot and guarantees the table reflects the latest state.

- [x] 21.1 In `ProjectsView.vue` `saveRow`, replace the manual local state patches and `fetchProjectAssignments` re-fetch with a single `await loadAll()` call after all API mutations succeed. Remove:
  - `const fresh = await fetchProjectAssignments(token, projectId)`
  - `assignments.value = { ...assignments.value, [projectId]: fresh }`
  - `projects.value = projects.value.map(...)`

  The `saveRow` success path should be: await all mutations → `await loadAll()` → `collapseRow(projectId)` → show success toast.

### 21.2 — "All members" as default selected value in filter Select

The filter `<Select>` above the table has `{ label: 'All members', value: null }` as the first option but `filterMemberId` is initialised to `null` without explicitly binding a `placeholder` — PrimeVue `<Select>` shows an empty placeholder when the value is `null` unless a `placeholder` prop is set or the option with `value: null` is treated as a real selectable option. The user sees a blank filter instead of "All members" on first load.

- [x] 21.2 In `ProjectsView.vue`, change `filterMemberId` initial value from `null` to the string sentinel `'all'`; update `memberOptions` computed to use `{ label: 'All members', value: 'all' }` as the first option; update `filteredProjects` computed to treat `filterMemberId.value === 'all'` (instead of `!filterMemberId.value`) as "show all". This avoids the `null`-vs-placeholder ambiguity in PrimeVue `<Select>` and makes "All members" appear selected by default. Also update the `filterMemberId` prop type in `ProjectsTable.vue` from `string | null` to `string` accordingly.

### 21.3 — Quality

- [x] 21.3 Run `pnpm --filter admin-web lint` — fix all issues
- [x] 21.4 Run `pnpm --filter admin-web typecheck` — fix all type errors
