# Shared Components Audit

**Scope:** `apps/admin-web/src/components/` vs `apps/user-web/src/components/`

---

## 1. Component Inventory

### admin-web components

| Path                             | Category                        |
| -------------------------------- | ------------------------------- |
| `layout/AdminPageHeader.vue`     | Layout primitive — page heading |
| `layout/AdminAppShell.vue`       | App shell                       |
| `projects/AddProjectForm.vue`    | Feature form                    |
| `projects/ProjectSourceCard.vue` | Feature card                    |
| `projects/ProjectsTable.vue`     | Feature table                   |
| `projects/ProjectStatsCards.vue` | Feature stat cards              |

### user-web components

| Path                          | Category              |
| ----------------------------- | --------------------- |
| `layout/AppShell.vue`         | App shell             |
| `project/ProjectHeader.vue`   | Project detail header |
| `project/ProjectNotFound.vue` | Empty state           |
| `timer/TimerPageContent.vue`  | Timer page body       |

---

## 2. Duplicate / Near-Duplicate Analysis

### `AdminPageHeader` (admin-web) ↔ inline `<header>` blocks (user-web)

**Admin-web file:** `apps/admin-web/src/components/layout/AdminPageHeader.vue`

**User-web occurrences (inline, not a component):**

- `apps/user-web/src/components/timer/TimerPageContent.vue` (lines 61–68)
- `apps/user-web/src/views/ProfileView.vue` (lines 22–29)

**What differs:**

| Aspect               | admin-web `AdminPageHeader` | user-web (inline) |
| -------------------- | --------------------------- | ----------------- |
| Title font size      | `text-[28px]` (28px)        | `text-2xl` (24px) |
| Optional back button | ✅ prop `backLabel`         | ✗ not present     |
| Action slot          | ✅ default slot             | ✗ not present     |
| Encapsulation        | Vue component               | Raw HTML block    |

**Proposed unified component:** `AppPageHeader` in `packages/web-shared/src/components/AppPageHeader.vue`

```ts
// Props
title:      string           // required
subtitle?:  string           // optional
backLabel?: string           // optional — shows "← {backLabel}" button
titleSize?: 'lg' | 'xl'      // optional — 'xl'=28px (admin default), 'lg'=24px (user default), default='xl'

// Emits
back: []                     // fired when back button clicked

// Slots
default                      // action buttons, rendered right of title row
```

**Target path:** `packages/web-shared/src/components/AppPageHeader.vue`
**Export via:** `packages/web-shared/src/components/index.ts`

**Migration:**

- admin-web: delete `AdminPageHeader.vue`, update `ProjectsView` + `AddProjectView` imports
- user-web: replace inline `<header>` blocks in `TimerPageContent.vue` + `ProfileView.vue`

---

### `AdminAppShell` (admin-web) ↔ `AppShell` (user-web)

**Paths:**

- `apps/admin-web/src/components/layout/AdminAppShell.vue`
- `apps/user-web/src/components/layout/AppShell.vue`

**What differs:**

| Aspect            | AdminAppShell                                             | AppShell                                          |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------- |
| `navItems`        | Dashboard, Reports, Invoices, Members, Projects, Settings | Dashboard, Timer, Time Entries, Projects, Profile |
| `counterpartHref` | `VITE_USER_APP_URL` → "User workspace"                    | `VITE_ADMIN_APP_URL` → "Admin workspace"          |
| Structure         | Identical                                                 | Identical                                         |

**Recommendation:** Both shells already use `WorkspaceHeader` and `WorkspaceNavigation` from `@gitiempo/web-shared`. The `navItems` and `counterpartHref` are inherently app-specific. **Do not extract** — correctly app-local per `packages/web-shared/AGENTS.md`.

---

### No other true duplicates found

`ProjectHeader.vue` (user-web) is domain-specific — takes `ProjectResponse + totalHoursFormatted`. Not a layout primitive, stays app-local.

`ProjectNotFound.vue` (user-web) is an empty state card specific to the project detail flow. Stays app-local.

---

## 3. Summary — Extraction Candidates

| Component                           | Action            | Target                                                 |
| ----------------------------------- | ----------------- | ------------------------------------------------------ |
| `AdminPageHeader` → `AppPageHeader` | Extract + migrate | `packages/web-shared/src/components/AppPageHeader.vue` |
| `AdminAppShell` / `AppShell`        | Keep app-local    | n/a                                                    |
| All other components                | Keep app-local    | n/a                                                    |
