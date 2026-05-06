## 1. Service Layer — projects.ts

- [ ] 1.1 Create `apps/admin-web/src/services/projects.ts` and add import block: `requestJson` from `@gitiempo/web-shared/http`; all response/input types from `@gitiempo/shared`; `BASE` constant from `import.meta.env.VITE_API_BASE_URL`
- [ ] 1.2 Implement `fetchProjects(accessToken): Promise<ProjectListResponse>` — `GET /projects`
- [ ] 1.3 Implement `fetchProjectSummary(accessToken): Promise<ManagementProjectSummaryResponse>` — `GET /projects/summary`
- [ ] 1.4 Implement `fetchProjectAssignments(accessToken, projectId): Promise<ProjectAssignmentListResponse>` — `GET /projects/{id}/assignments`
- [ ] 1.5 Implement `createProject(accessToken, body: CreateProjectInput): Promise<ProjectResponse>` — `POST /projects`
- [ ] 1.6 Implement `updateProject(accessToken, projectId, body: UpdateProjectInput): Promise<ProjectResponse>` — `PATCH /projects/{id}`
- [ ] 1.7 Implement `assignMember(accessToken, projectId, userId): Promise<void>` — `POST /projects/{id}/assignments` with `{ userId }`
- [ ] 1.8 Implement `removeAssignment(accessToken, projectId, assignmentId): Promise<void>` — `DELETE /projects/{id}/assignments/{assignmentId}`

## 2. Service Layer — members.ts

- [ ] 2.1 Create `apps/admin-web/src/services/members.ts`
- [ ] 2.2 Implement `fetchMembers(accessToken): Promise<WorkspaceMemberListResponse>` — `GET /workspace/members` using `requestJson` and `BASE`

## 3. Shared PageHeader Component

- [ ] 3.1 Create `packages/web-shared/src/components/PageHeader.vue` with `<script setup lang="ts">`
- [ ] 3.2 Define `StatItem` interface `{ label: string; value: string | number }` and `defineProps<{ title: string; description?: string; stats?: StatItem[] }>()`
- [ ] 3.3 Implement page heading block: `<h1>` with `text-[28px] font-semibold text-text-dark`, description `<p>` with `text-sm font-normal text-text-muted`, wrapped in `flex flex-col gap-[6px]`
- [ ] 3.4 Implement stat cards row: `flex gap-4 h-[96px]`; each card `flex-1 rounded-lg shadow-card bg-surface p-4 flex flex-col gap-2`; stat label `text-[13px] font-medium text-text-muted`; stat value `text-[28px] font-semibold text-text-dark`
- [ ] 3.5 Render stat cards only when `stats` prop is non-empty (v-if)
- [ ] 3.6 Add default slot for CTA positioned to the right of the heading block (`flex items-center justify-between`)
- [ ] 3.7 Export `PageHeader` and `StatItem` type from `packages/web-shared/src/components/index.ts`
- [ ] 3.8 Run `pnpm --filter @gitiempo/web-shared typecheck` — fix any errors before proceeding

## 4. ProjectsView — Scaffold and Data Loading

- [ ] 4.1 Open `apps/admin-web/src/views/ProjectsView.vue`, remove `PlaceholderPage` import and template usage
- [ ] 4.2 Add `<script setup lang="ts">` block; import `useAuthStore` from `@/stores/auth`, `storeToRefs` from `pinia`; destructure `accessToken` with `storeToRefs`
- [ ] 4.3 Import `useToast` from `primevue/usetoast` and call `const toast = useToast()`
- [ ] 4.4 Declare reactive state: `projects`, `summary`, `members`, `assignments` (`Map<string, ProjectAssignmentListResponse>`), `loading`, `error`
- [ ] 4.5 Implement `loadAll()` async function: call `fetchProjectSummary`, `fetchProjects`, `fetchMembers` in parallel with `Promise.all`; then fan-out `fetchProjectAssignments` for each project in parallel and populate the `assignments` Map
- [ ] 4.6 Call `loadAll()` in `onMounted`; catch errors and show `toast.add({ severity: 'error', ... })` for each failure
- [ ] 4.7 Add page root template: `<div class="flex flex-col gap-6 p-6 bg-app-bg min-h-full">`

## 5. ProjectsView — PageHeader and Stat Cards

- [ ] 5.1 Import `PageHeader` from `@gitiempo/web-shared/components`
- [ ] 5.2 Use `<PageHeader title="Projects" description="Manage project visibility, member assignments, and manual project creation." :stats="summaryStats">`
- [ ] 5.3 Compute `summaryStats` from `summary` ref: `[{ label: 'Active Projects', value: summary.value?.activeProjects ?? '—' }, { label: 'Private', value: summary.value?.privateProjects ?? '—' }, { label: 'Public', value: summary.value?.publicProjects ?? '—' }]`

## 6. ProjectsView — New Project Button and Dialog

- [ ] 6.1 Add `<Button label="New Project" class="bg-brand text-surface text-sm font-semibold rounded-sm h-9 px-4" />` in the `PageHeader` default slot; bind `@click="newProjectVisible = true"`
- [ ] 6.2 Declare `newProjectVisible`, `newProjectName`, `newProjectVisibility`, `newProjectNameError`, `newProjectSaving` refs
- [ ] 6.3 Add `<Dialog v-model:visible="newProjectVisible" header="New Project" modal>` template block
- [ ] 6.4 Inside dialog: `<div class="flex flex-col gap-1">` label + `<InputText v-model="newProjectName" :invalid="!!newProjectNameError" class="w-full" />`+ `<small v-if="newProjectNameError" class="text-xs text-destructive">`
- [ ] 6.5 Inside dialog: label + `<Select v-model="newProjectVisibility" :options="visibilityOptions" option-label="label" option-value="value" class="w-full" />` with options `[{ label: 'Public', value: 'public' }, { label: 'Private', value: 'private' }]`
- [ ] 6.6 Dialog footer: Cancel `<Button>` (`severity="secondary" variant="outlined"`) and Create `<Button>` (`:loading="newProjectSaving"`)
- [ ] 6.7 Implement `submitNewProject()`: validate name non-empty (set `newProjectNameError`), call `createProject`, on success call `loadAll()` and close dialog, on error show toast

## 7. ProjectsView — Member Filter

- [ ] 7.1 Declare `filterMemberId` ref (`string | null`, default `null`)
- [ ] 7.2 Compute `memberOptions`: map `members.value` to `{ label: \`${m.displayName ?? m.email} (${m.role})\`, value: m.userId }`; prepend `{ label: 'All members', value: null }`
- [ ] 7.3 Add filter block above the table: `<div class="flex flex-col gap-1.5">` with `<p class="text-xs font-medium text-text-muted">Assigned member</p>` and `<Select v-model="filterMemberId" :options="memberOptions" option-label="label" option-value="value" class="w-[260px] h-[38px] rounded-sm" />`
- [ ] 7.4 Compute `filteredProjects`: `projects.value.filter(p => !filterMemberId.value || assignments.get(p.id)?.some(a => a.userId === filterMemberId.value))`

## 8. ProjectsView — DataTable

- [ ] 8.1 Import `DataTable`, `Column` from `primevue`; wrap table in a card: `<div class="rounded-lg shadow-card bg-surface p-5 flex flex-col gap-4">`
- [ ] 8.2 Add table heading row: `<div class="flex items-center justify-between">` with `<h2 class="text-lg font-semibold text-text-dark">Projects Table</h2>` and the filter block (task 7.3)
- [ ] 8.3 Add `<DataTable :value="filteredProjects" v-model:expanded-rows="expandedRows" data-key="id">` with `pt` overrides: `headerCell: 'bg-app-bg h-[44px] text-[13px] font-semibold text-text-dark px-3'`, `bodyRow: 'h-[56px] border-t border-divider'`, `bodyCell: 'px-3'`
- [ ] 8.4 Add Project column (`fill` width): `<Column field="name" header="Project">` with body template rendering `<span class="text-sm font-semibold text-text-dark">{{ slotProps.data.name }}</span>`
- [ ] 8.5 Add Source column (140px): body renders `<span class="text-[13px] font-normal text-text-muted">{{ slotProps.data.source === 'github' ? 'GitHub Repo' : 'Manual' }}</span>`
- [ ] 8.6 Add Assigned members column (220px): body renders `<span class="text-[13px] font-normal text-text-muted">{{ (assignments.get(slotProps.data.id) ?? []).length }} members</span>`
- [ ] 8.7 Add Hours column (120px): body renders `<span class="text-[13px] font-semibold text-text-dark">{{ slotProps.data.totalHours }}h</span>`
- [ ] 8.8 Add Visibility column (120px): body renders bespoke `<span>` — Public: `class="bg-accent-tint text-brand rounded-sm px-2 py-1 text-xs font-semibold"`; Private: `class="bg-status-warn-bg text-status-warn-text rounded-sm px-2 py-1 text-xs font-semibold"`
- [ ] 8.9 Add Actions column (150px, right-aligned): two `<Button variant="text">` — Edit (`text-[13px] font-semibold text-brand`) and Archive (`text-[13px] font-semibold text-destructive`)
- [ ] 8.10 Wire Edit button `@click`: set `expandedRows` to only that row (single-row enforcement — clear then set)
- [ ] 8.11 Declare `expandedRows` ref as `Record<string, boolean>` (keyed by project id)

## 9. ProjectsView — Inline Settings Expansion Panel

- [ ] 9.1 Add `<template #expansion="slotProps">` inside DataTable
- [ ] 9.2 Expansion panel root: `<div class="bg-app-bg border-t border-divider p-4 flex items-end gap-[10px]">`
- [ ] 9.3 Add panel label: `<p class="text-[13px] font-semibold text-text-dark">Project settings</p>`
- [ ] 9.4 Add members field: `<div class="flex flex-col gap-1.5 flex-1">` with label `Select members` + `<MultiSelect v-model="editMembers[slotProps.data.id]" :options="memberSelectOptions" option-label="label" option-value="value" class="w-full h-[38px] rounded-sm" />`
- [ ] 9.5 Compute `memberSelectOptions`: map `members.value` to `{ label: \`${m.displayName ?? m.email} (${m.role})\`, value: m.userId }`
- [ ] 9.6 Add visibility field: `<div class="flex flex-col gap-1.5 w-[180px]">` with label `Visibility` + `<Select v-model="editVisibility[slotProps.data.id]" :options="visibilityOptions" option-label="label" option-value="value" class="w-full h-[38px] rounded-sm" />`
- [ ] 9.7 Declare `editMembers` as `Record<string, string[]>` and `editVisibility` as `Record<string, string>`; pre-populate them when a row expands (watch `expandedRows`)
- [ ] 9.8 Add Cancel `<Button severity="secondary" variant="outlined" label="Cancel" class="rounded-sm h-[34px]" @click="collapseRow(id)" />`
- [ ] 9.9 Add Save `<Button label="Save" class="bg-brand text-surface rounded-sm h-[34px]" :loading="savingRows[id]" @click="saveRow(id)" />`
- [ ] 9.10 Implement `saveRow(projectId)`: diff current members vs original assignments — call `assignMember` for added users, `removeAssignment` for removed; call `updateProject` if visibility changed; on complete reload assignments for that project, collapse row, show success toast; on error show error toast
- [ ] 9.11 Implement `collapseRow(projectId)`: remove project id key from `expandedRows`

## 10. ProjectsView — Archive Action

- [ ] 10.1 Implement `archiveProject(projectId)`: call `updateProject(token, projectId, { isActive: false })`; on success call `loadAll()` and show success toast; on error show error toast

## 11. ProjectsView — Loading and Empty States

- [ ] 11.1 Show `<ProgressSpinner strokeWidth="3" style="width:40px;height:40px" />` centered in page while `loading.value` is true (before first data load)
- [ ] 11.2 Show `<Skeleton>` rows (height `h-[56px]`) in place of DataTable rows while assignments are loading after the project list resolves
- [ ] 11.3 Add DataTable `#empty` slot: `<div class="py-8 text-center text-sm text-text-muted">No projects yet.</div>`

## 12. Quality

- [ ] 12.1 Run `pnpm --filter admin-web lint` — fix all reported issues
- [ ] 12.2 Run `pnpm --filter admin-web typecheck` — fix all type errors
- [ ] 12.3 Run `pnpm --filter @gitiempo/web-shared typecheck` — fix all type errors
