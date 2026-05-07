# Design: Admin Projects Page

## Overview

Replace the `ProjectsView.vue` placeholder in `apps/admin-web` with a full, pixel-perfect implementation of the Admin Projects screen. The page composes dedicated child components for every named UI section; no raw markup lives in the view itself. All interactive controls come from PrimeVue v4. No API contracts, typings, or HTTP libraries are modified.

---

## Component Architecture

```
ProjectsView.vue (route-level view, composition only)
├── StatsHeader.vue            ← packages/web-shared (new, reusable)
│   └── ProjectStatCard.vue   ← apps/admin-web/components (new)
├── ProjectsTable.vue          ← apps/admin-web/components (new)
│   ├── ProjectEditForm.vue    ← apps/admin-web/components (new)
│   └── [PrimeVue DataTable row expansion]
└── [router-link → AddProjectMockView]
```

`AddProjectMockView.vue` is a standalone placeholder view registered as `/admin/projects/new`.

---

## Shared Component: `StatsHeader` (`packages/web-shared`)

### Purpose
Renders a two-zone row: left = title + description text block; right = a named slot for stat cards. Used by Admin Projects and Admin Members pages (same `.pen` pattern on both).

### Props
```ts
title: string
description: string
```

### Slots
- `actions` – right-hand slot (buttons, etc.)
- `stats` – row of stat card tiles rendered below the title/action row

### Design tokens
- Title: `Inter 600 28px $color-text-dark`
- Description: `Inter regular 14px $color-text-muted`
- Layout: `justify-content: space-between` between title block and actions slot; stats slot rendered as a row with `gap: 16px`, height `96px`.

---

## Admin-local Component: `ProjectStatCard`

### Purpose
Single stat tile (label + big number).

### Props
```ts
label: string
value: number | string
```

### Design
- Card: `$color-surface`, `$radius-lg`, shadow `0 1px 3px rgba(0,0,0,0.08)`, `padding: 16px`, `gap: 8px`, `layout: vertical`, `height: fill_container`.
- Label: `Inter 500 13px $color-text-muted`
- Value: `Inter 600 28px $color-text-dark`

---

## Admin-local Component: `ProjectsTable`

### Purpose
PrimeVue `DataTable` with row expansion for the inline edit form. Displays all workspace projects. Emits events upward so the parent view can refresh summary stats.

### Data Source
`GET /projects` → `ProjectListResponse` (existing contract, no changes).

Default sort: `isActive DESC` (active rows first, archived last). Computed at the frontend by sorting the array before binding.

### Props
```ts
projects: ProjectListResponse
members: WorkspaceMemberListResponse   // for the member filter dropdown
loading: boolean
```

### Emits
```ts
edit-saved     // parent re-fetches projects + summary
archive        // parent re-fetches projects + summary
unarchive      // parent re-fetches projects + summary
```

### Columns
| Column | Width | Notes |
|---|---|---|
| Project | fill | Name, `Inter 600 14px $color-text-dark`; archived rows use `$color-text-muted` |
| Source | 140px | `manual` → "Manual", `github` → "GitHub Repo"; `$color-text-muted` |
| Assigned members | 220px | `{n} members` from `project.members.length` |
| Hours | 120px | `{n}h` from `project.totalHours`; `Inter 600 13px $color-text-dark` |
| Visibility | 120px | Badge via PrimeVue `Tag`; public = brand tint; private = warn |
| Actions | 150px, right-aligned | Active: "Edit" (brand link-button) + "Archive" (destructive link-button). Archived: "Unarchive" only (muted). |

### Member filter
PrimeVue `Dropdown` (label "Assigned member", width 260px) populated from `members` prop. Filters table rows client-side by checking `project.members.some(m => m.userId === selected)`.

### Table header
Left: "Projects Table" (`Inter 600 18px $color-text-dark`). Right: member filter.

### Row expansion (edit form)
Clicking "Edit" expands the row. The expanded area renders `ProjectEditForm`. The expanded row's cell padding is `0` (padding stripped via PrimeVue PT or class override so the form sits flush).

---

## Admin-local Component: `ProjectEditForm`

### Purpose
Inline edit form embedded in DataTable row expansion. Fields match the design panel for "Project settings".

### Props
```ts
project: ProjectResponse
```

### Emits
```ts
saved(updated: ProjectResponse)
cancelled
```

### Fields (all PrimeVue)
1. **Members** – PrimeVue `MultiSelect`, label "Select members", full-width. Options from workspace members. Initial value = `project.members.map(m => m.userId)`.
2. **Visibility** – PrimeVue `Dropdown`, label "Visibility", width 180px. Options: `[{ label: 'Public', value: 'public' }, { label: 'Private', value: 'private' }]`.

### Actions (right-aligned row)
- **Cancel** – PrimeVue `Button` severity `secondary` → emits `cancelled`
- **Save** – PrimeVue `Button` severity `primary` → calls `PATCH /projects/:id` with `{ visibility, isActive }` + assignment sync, then emits `saved`.

### Assignment sync
After updating project metadata, compute member diff:
- `toAdd` = selected userIds not in current `project.members`
- `toRemove` = current `project.members` userIds not in selected

Call `POST /projects/:id/assignments` for each `toAdd` and `DELETE /projects/:id/assignments/:userId` for each `toRemove`. All calls are sequential. On completion emit `saved`.

### Layout
- Wrapper: `$color-app-bg`, `padding: 16px`, `gap: 10px`, `layout: vertical`, top border `1px $color-divider`.
- Title: "Project settings" `Inter 600 13px $color-text-dark`.
- Fields row: horizontal flex, `gap: 10px`, `align-items: end`.
- Row padding override: the DataTable expanded row cell must have `padding: 0` (achieved via PrimeVue PassThrough `bodyCell` override on the expansion column, or a scoped CSS `:deep` rule targeting `.p-datatable-row-expansion td`).

---

## Archive / Unarchive Flow

- **Archive**: calls `PATCH /projects/:id` with `{ isActive: false }`. On success, emits `archive` upward.
- **Unarchive**: calls `PATCH /projects/:id` with `{ isActive: true }`. On success, emits `unarchive` upward.
- Parent (`ProjectsView`) re-fetches `GET /projects` and `GET /projects/management-summary` after either event, keeping `StatsHeader` stat cards live.
- Archived rows: only "Unarchive" action shown; project name rendered in `$color-text-muted`.

---

## `ProjectsView` Composition

```
<StatsHeader title="Projects" description="Manage project visibility...">
  <template #actions>
    <Button label="New Project" @click="router.push('/admin/projects/new')" />
  </template>
  <template #stats>
    <ProjectStatCard label="Active Projects" :value="summary.activeProjects" />
    <ProjectStatCard label="Private" :value="summary.privateProjects" />
    <ProjectStatCard label="Public" :value="summary.publicProjects" />
  </template>
</StatsHeader>

<ProjectsTable
  :projects="sortedProjects"
  :members="members"
  :loading="loading"
  @edit-saved="refresh"
  @archive="refresh"
  @unarchive="refresh"
/>
```

`refresh()` re-fetches both `GET /projects` and `GET /projects/management-summary`.

`sortedProjects` = computed: active projects first (`isActive: true`), then archived.

---

## Routing

Add to `apps/admin-web/src/router/index.ts`:
```ts
{ path: '/admin/projects/new', component: AddProjectMockView, meta: { requiresAuth: true } }
```

`AddProjectMockView.vue` renders a `PlaceholderPage` with copy indicating the add-project form is coming soon.

---

## Pixel-Parity Checklist (from `.pen` design)

| Element | Spec |
|---|---|
| Page padding | `24px` all sides |
| Stats row height | `96px`, `gap: 16px` |
| Stat card padding | `16px`, `gap: 8px` |
| Projects card padding | `20px`, `gap: 16px` |
| Table head row height | `44px`, `$color-app-bg` |
| Table data row height | `56px` |
| Table cell padding | `0 12px` |
| Expansion row cell padding | `0` |
| Member filter width | `260px` |
| Visibility column width | `120px` |
| Actions column width | `150px` |
| "Edit" / "Archive" padding | `4px 6px` |
| Topbar height | `64px` |
| Sidebar width | `240px` |
| Active nav item | brand color + left border `3px $color-brand` + `$color-accent-tint` bg |

---

## Data Fetching Strategy

All fetching in `ProjectsView` (single source of truth):

1. On mount: `GET /projects`, `GET /projects/management-summary`, `GET /workspace-members`
2. `refresh()` on any mutation event: re-runs (1) and (2) only (not members list).

No Pinia store required for this page — local `ref`s in `ProjectsView` are sufficient.

---

## Constraints

- No API, contract, or typing changes.
- No new HTTP libraries; use existing `http.ts` helpers in `apps/admin-web`.
- All UI controls must be PrimeVue v4 components (no raw `<input>`, `<button>`, `<select>` elements in component templates).
- Every named UI section = its own `.vue` component file; `ProjectsView.vue` is composition-only.
- Optional chaining (`?.`) and optional properties (`prop?: Type`) are forbidden in component props interfaces and contract-facing types.
