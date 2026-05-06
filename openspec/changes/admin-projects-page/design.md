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
| Page heading | `text-[28px] font-semibold text-text-dark` |
| Sub-description | `text-sm font-normal text-text-muted` |
| Header gap | `gap-[6px]` vertical |
| Stat cards row | `h-[96px]`, `gap-4`, 3 equal-width cards |
| Stat card | `rounded-lg shadow-card bg-surface p-4 gap-2` vertical layout |
| Stat label | `text-[13px] font-medium text-text-muted` |
| Stat value | `text-[28px] font-semibold text-text-dark` |
| Projects card | `rounded-lg shadow-card bg-surface p-5 gap-4` vertical layout |
| Table heading | `text-lg font-semibold text-text-dark` |
| Filter label | `text-xs font-medium text-text-muted` (12px) |
| Filter dropdown | `h-[38px] w-[260px] rounded-sm border-divider` |
| Table header row | `bg-app-bg h-[44px]`, cells `text-[13px] font-semibold text-text-dark px-3` |
| Table body row | `h-[56px] border-t border-divider` |
| Project name cell | `text-sm font-semibold text-text-dark` |
| Source/members cells | `text-[13px] font-normal text-text-muted` |
| Hours cell | `text-[13px] font-semibold text-text-dark` |
| Public badge | `bg-accent-tint text-brand rounded-sm px-2 py-1 text-xs font-semibold` |
| Private badge | `bg-status-warn-bg text-status-warn-text rounded-sm px-2 py-1 text-xs font-semibold` |
| Edit action | `text-[13px] font-semibold text-brand` ghost button |
| Archive action | `text-[13px] font-semibold text-destructive` ghost button |
| Column widths | Project: fill, Source: 140px, Members: 220px, Hours: 120px, Visibility: 120px, Actions: 150px |

Project settings inline expansion (appears below the expanded row, `bg-app-bg border-t border-divider p-4 gap-[10px]`):
- Row label: `text-[13px] font-semibold text-text-dark`
- `<MultiSelect>` for members: `fill` width, `h-[38px]`, `rounded-sm`
- `<Select>` for visibility: `w-[180px]`, `h-[38px]`, `rounded-sm`
- Cancel button: `severity="secondary" variant="outlined" rounded-sm h-[34px]`
- Save button: `bg-brand text-surface rounded-sm h-[34px]`

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
