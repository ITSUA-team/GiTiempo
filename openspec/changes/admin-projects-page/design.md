## Context

The admin SPA has a protected `/projects` route that currently renders `PlaceholderPage`. The API (`add-project-visibility-and-stats-api` change) is complete and exposes full CRUD for projects, assignments, and summary stats. The approved UI design is in `.pen` node `6iAjf` ("Admin Projects" frame, 1280×900).

Design variables (from `GITiempo.pen`):
- `$color-brand` = `#5D2B85` → `bg-brand` / `text-brand`
- `$color-accent-tint` = `#E8E1F5` → `bg-accent-tint`
- `$color-app-bg` = `#F4F4F5` → `bg-app-bg`
- `$color-surface` = `#FFFFFF` → `bg-surface`
- `$color-text-dark` = `#1A1A1A` → `text-text-dark`
- `$color-text-muted` = `#666666` → `text-text-muted`
- `$color-divider` = `#EEEEEE` → `border-divider`
- `$color-destructive` = `#D32F2F` → `text-destructive`
- `$color-status-warn-bg` = `#FFF8E1` → `bg-status-warn-bg`
- `$color-status-warn-text` = `#F57F17` → `text-status-warn-text`

## Goals / Non-Goals

**Goals:**
- Replace `PlaceholderPage` in `ProjectsView.vue` with pixel-perfect implementation of `.pen` node `6iAjf`
- Stat summary cards: Active Projects, Private, Public (values from `GET /projects/summary`)
- DataTable: project name, source, assigned members count, hours, visibility badge, Edit/Archive actions
- Assigned member `<Select>` filter above table (client-side, `All members` default; option label `Display Name (role)`)
- Inline row expansion: `<MultiSelect>` for members, `<Select>` for visibility, Cancel/Save buttons
- "New Project" `<Button>` opens a `<Dialog>` with name field and visibility selector
- Shared `PageHeader` component in `packages/web-shared` with `title`, `description`, `stats[]` props and default CTA slot

**Non-Goals:**
- Server-side pagination or search
- Archive confirmation dialog (clicking Archive fires the API immediately; toast on success/error)
- Mobile layout (desktop-first for MVP)
- Dark mode

## Decisions

### D1 — Service layer in `apps/admin-web/src/services/`
Two new files: `projects.ts` (7 functions) and `members.ts` (1 function). All accept `accessToken: string` as first param. Use `requestJson` from `@gitiempo/web-shared/http`. API base from `import.meta.env.VITE_API_BASE_URL`.

Correct API routes (verified against `apps/api/src/projects/controllers/projects.controller.ts` and `apps/api/src/members/controllers/members.controller.ts`):

| Function | Method | Correct path |
|---|---|---|
| `fetchProjects` | GET | `/projects` |
| `fetchProjectSummary` | GET | `/projects/management-summary` ← **not** `/projects/summary` |
| `fetchProjectAssignments` | GET | `/projects/{id}/assignments` |
| `createProject` | POST | `/projects` |
| `updateProject` | PATCH | `/projects/{id}` |
| `assignMember` | POST | `/projects/{id}/assignments` |
| `removeAssignment` | DELETE | `/projects/{id}/assignments/{assignmentId}` |
| `fetchMembers` | GET | `/members` ← **not** `/workspace/members` |

### D2 — Access token from Pinia auth store
`authStore.accessToken` is a `shallowRef<string | null>` exposed by the store. Pinia auto-unwraps refs in `storeToRefs`, so use `const { accessToken } = storeToRefs(useAuthStore())` and call `accessToken.value` in async handlers.

### D3 — Assignments loaded eagerly with parallel fetch
On `onMounted`, fetch all projects then fan-out `fetchProjectAssignments(token, project.id)` in parallel via `Promise.all`. Cache results in a `Map<string, ProjectAssignmentListResponse>`. Used for both the member filter dropdown and the inline "assigned members" count column.

### D4 — Member filter is client-side only
`GET /projects` has no `assignedMember` query param. Filter by checking the cached assignments map. Reactive computed that returns `projects.value.filter(p => !filterMember.value || assignments.get(p.id)?.some(a => a.userId === filterMember.value))`.

### D5 — Pixel-perfect layout from `.pen` node `6iAjf`

Page structure (matches design node tree exactly):

| Section | Key measurements |
|---|---|
| Page content wrapper | `p-6 gap-6 bg-app-bg min-h-full flex flex-col` |
| Page heading | `text-[28px] font-semibold text-text-dark` |
| Sub-description | `text-[14px] font-normal text-text-muted` (design: fontSize 14, weight normal — use `text-sm font-normal`) |
| Header text block gap | `gap-[6px]` vertical between heading and description |
| Header row | `flex items-center justify-between` — heading block left, CTA right |
| "New Project" button | `bg-brand text-surface rounded-[6px] py-[10px] px-4 text-[14px] font-semibold` — use padding not fixed height (design: padding `[10, 16]`, cornerRadius 6) |
| PageHeader outer gap | `gap-6` between heading row and stat cards |
| Stat cards row | `flex gap-4` height `h-[96px]`, 3 equal-width cards |
| Stat card | `flex-1 rounded-[10px] shadow-card bg-surface p-4 flex flex-col gap-2` — **cornerRadius is 10px** not `rounded-lg` (8px) |
| Stat label | `text-[13px] font-medium text-text-muted` |
| Stat value | `text-[28px] font-semibold text-text-dark` |
| Projects card | `rounded-[10px] shadow-card bg-surface p-5 flex flex-col gap-4` — **cornerRadius 10px** |
| Table heading | `text-lg font-semibold text-text-dark` (18px/600) |
| Filter label | `text-xs font-medium text-text-muted` (12px/500) — gap between label and input is `gap-[6px]` |
| Filter dropdown | `h-[38px] w-[260px] rounded-[6px]` — design: cornerRadius 6, **not** `rounded-sm` (4px) |
| Table header row | `bg-app-bg h-[44px]`, cells `text-[13px] font-semibold text-text-dark px-3` |
| Table body row | `h-[56px] border-t border-divider` |
| Project name cell | `text-sm font-semibold text-text-dark` (14px/600) |
| Source/members cells | `text-[13px] font-normal text-text-muted` |
| Hours cell | `text-[13px] font-semibold text-text-dark` |
| Public badge | `bg-accent-tint text-brand rounded-sm px-2 py-1 text-xs font-semibold` |
| Private badge | `bg-status-warn-bg text-status-warn-text rounded-sm px-2 py-1 text-xs font-semibold` |
| Edit action | `text-[13px] font-semibold text-brand` variant="text" ghost button |
| Archive action | `text-[13px] font-semibold text-destructive` variant="text" ghost button |
| Column widths | Project: fill, Source: 140px, Members: 220px, Hours: 120px, Visibility: 120px, Actions: 150px |

Project settings inline expansion (appears below the expanded row):
- Root: `bg-app-bg border-t border-divider p-4 flex items-end gap-[10px]`
- Panel label: `text-[13px] font-semibold text-text-dark`
- `<MultiSelect>` for members: `flex-1 h-[38px] rounded-[6px]` — design cornerRadius 6; **filter out admin-role members** from options (API returns 422 "Admins do not need project assignments" if an admin is submitted)
- `<Select>` for visibility: `w-[180px] h-[38px] rounded-[6px]`
- Cancel button: `severity="secondary" variant="outlined" rounded-[6px] h-[34px]`
- Save button: `bg-brand text-surface rounded-[6px] h-[34px]`

**D9 — Admin members excluded from assignment MultiSelect**
The API enforces that admins cannot be assigned to projects (returns 422 "Admins do not need project assignments"). The `<MultiSelect>` in the inline settings expansion panel must filter `members.value` to exclude any member with `role === 'admin'` before building `memberSelectOptions`. The assigned-member filter `<Select>` above the table should also exclude admins for consistency.

**D10 — "New Project" button height**
The design shows the button height is determined by `padding: [10, 16]` (top/bottom 10px + font 14px line-height ≈ 20px = 40px total box) and `cornerRadius: 6`. PrimeVue `<Button>` adds its own internal padding that conflicts with Tailwind padding utilities applied via `class`. To get exact 38px height (matching filter inputs and the `h-[38px]` pattern used elsewhere), use `:pt="{ root: 'h-[38px] px-4 rounded-[6px]' }"` to override PrimeVue's internal padding via the `pt` prop rather than `class`.

**Identified pixel mismatches in current implementation (to fix in Group 13):**
1. Stat card `rounded-lg` (8px) → must be `rounded-[10px]` (design: cornerRadius 10)
2. Projects card `rounded-lg` (8px) → must be `rounded-[10px]`
3. "New Project" button uses `h-9` fixed height → must use `py-[10px] px-4` padding (design: padding [10, 16], cornerRadius 6 = `rounded-[6px]`)
4. `summaryStats` computed uses `summary.value?.activeProjects` — if `summary` is null while `loading` is false (error state), stats show `"—"` but cards still render; this is correct per design. However `summaryStats` should only be passed to `PageHeader` when summary is available — when null after error the stat cards should not render (pass empty array or omit). Currently they always render with `"—"` values which looks broken.

### D6 — Visibility badge uses bespoke `<span>`, not `<Tag severity>`
PrimeVue `<Tag severity="secondary">` renders grey, which does not match the design. Both "Public" (accent-tint/brand) and "Private" (warn) badges use `<span>` with explicit token classes to guarantee pixel-perfect fidelity.

### D7 — Shared `PageHeader` component
`packages/web-shared/src/components/PageHeader.vue` accepts:
```ts
interface StatItem { label: string; value: string | number }
defineProps<{ title: string; description?: string; stats?: StatItem[] }>()
// default slot: CTA area (e.g. <Button>)
```
Exported from `packages/web-shared/src/components/index.ts`.

### D8 — New Project dialog
PrimeVue `<Dialog>` with `v-model:visible`. Fields: project name (`<InputText>`), visibility (`<Select>`). Submit calls `createProject(token, { name, visibility })`, then re-fetches projects list and closes dialog. No Zod schema needed (single required string field validated inline).

## Risks / Trade-offs

- **N+1 assignments fetch on mount**: For workspaces with many projects this fires many parallel requests. Acceptable for MVP; a future `GET /projects?includeAssignments=true` endpoint would consolidate.
- **Eager full members list**: All workspace members are loaded to populate the filter and MultiSelect. Acceptable at current scale.
- **Archive is immediate**: No confirmation dialog. User sees a toast. A future "confirm destructive actions" pattern can add a dialog later.
