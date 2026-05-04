## Context

A `quality-review` of the current branch (`main..HEAD`) identified five categories of technical debt across the frontend layer. All five are independent, low-risk fixes that can be applied in a single change:

1. **Duplicate HTTP transport** — `packages/web-shared/src/api/http-helpers.ts` (`getJson`, `postJson`, `patchJson`, `deleteJson`) coexists with the newer unified `packages/web-shared/src/http.ts` (`requestJson`). Three clients still use the old helpers; two (`timer-page-client`, `auth/http-client`) already use `requestJson`. This split violates the `gitiempo-frontend-rules` constraint: "Do not land a new shared transport helper while sibling frontend clients keep their own copies."

2. **Duplicated `formatHours`** — Identical logic lives in `ProjectsTable.vue` (admin-web) and `useProjectFormatters.ts` (user-web). Divergence is inevitable.

3. **Premature row-close in `saveSettings`** — `ProjectsTable.vue` sets `expandedProjectId.value = null` synchronously, before the async `handleSave` in `ProjectsView.vue` completes. A failed save silently loses the user's changes with no inline feedback.

4. **Raw hex in `ProjectSourceCard.vue`** — Seven out of eight colour values have design-token equivalents documented in `docs/ui/components.md`; using raw hex breaks the token-update contract.

5. **Raw `<button>` in three components** — `docs/ui/components.md` explicitly requires PrimeVue `<Button>` for standard SPA controls; `AddProjectForm.vue`, `ProjectsTable.vue`, and `AdminPageHeader.vue` all use raw `<button>`.

## Goals / Non-Goals

**Goals:**

- Consolidate all three remaining `api/` clients onto `requestJson`; delete `http-helpers.ts`.
- Extract `formatHours` into `packages/web-shared` and update both call sites.
- Fix `saveSettings` so the inline-edit row closes only after a confirmed save result.
- Replace raw hex in `ProjectSourceCard.vue` with token utilities; keep `#F7F2FC` (no token).
- Replace raw `<button>` in `AddProjectForm.vue`, `ProjectsTable.vue`, `AdminPageHeader.vue` with PrimeVue `<Button>`.

**Non-Goals:**

- Fixing the N+1 `listProjectAssignments` fetch pattern (separate backend + contract change).
- Fixing `setTimeout(router.back)` in `ProjectView.vue` (separate user-web change).
- Any new API endpoints or DB migrations.
- Redesigning the inline-edit UX beyond the minimal save-timing fix.

## Decisions

### 1. HTTP transport migration strategy

**Decision:** Migrate clients one-by-one within this change; delete `http-helpers.ts` in the same PR.

`requestJson` from `@gitiempo/web-shared/http` already supports GET/POST/PATCH/DELETE via the `method` param and optional `body`. No new API surface needed. The three remaining clients (`projects-client.ts`, `members-client.ts`, `time-entries-client.ts`) each use only `getJson` + one or two of `postJson`/`patchJson`/`deleteJson` — all map directly to `requestJson` calls.

`http-helpers.ts` is not exported from the package's main barrel or `package.json` exports map, so deleting it is a package-internal change with no external consumers.

### 2. `formatHours` placement

**Decision:** New file `packages/web-shared/src/utils/format-hours.ts`, exported from `packages/web-shared/src/index.ts`.

`formatHours` is a pure function with no Vue/PrimeVue dependency. It belongs in a neutral `utils/` directory rather than under `components/` or `api/`. `useProjectFormatters.ts` in user-web will import from `@gitiempo/web-shared` and re-export alongside its other formatters; `ProjectsTable.vue` in admin-web will import directly.

Alternative considered: inline the function in both files and document the duplication as accepted. Rejected — the function is identical and the extraction is trivial.

### 3. `saveSettings` row-close timing

**Decision:** Add a `save-done` emit from `ProjectsTable` that carries `{ success: boolean, projectId: string }`. `ProjectsView` listens and calls a new `closeProjectRow(projectId)` method (or equivalent) only on success.

Two alternatives were considered:

- **Option A (chosen):** emit `save` as before, and add a separate `save-done` event that the parent fires back via a prop/expose. Clean separation: table does not know about async outcomes; view owns the close decision.
- **Option B:** make `saveSettings` async, await the parent's handler via a callback prop. Rejected — passing async callbacks as props is non-idiomatic in Vue 3; makes testing harder.
- **Option C:** keep synchronous close but add an undo toast. Rejected — confusing UX and doesn't fix the "no feedback on failure" root issue.

Concretely: `ProjectsTable` emits `save` as today. `ProjectsView.handleSave` calls a new `closeRow(id)` function after the successful save. `ProjectsView` passes `closedProjectId` as a prop that `ProjectsTable` watches to reset `expandedProjectId`.

### 4. Raw hex → tokens

**Decision:** Direct substitution following the `docs/ui/components.md` token table.

| Raw hex   | Token utility                 |
| --------- | ----------------------------- |
| `#1A1A1A` | `text-text-dark`              |
| `#666666` | `text-text-muted`             |
| `#5D2B85` | `border-brand` / `text-brand` |
| `#F4F4F5` | `bg-app-bg`                   |
| `#F7F2FC` | no token — keep as raw        |

### 5. Raw `<button>` → `<Button>`

**Decision:** Use PrimeVue `<Button>` with appropriate `variant` and `severity` per `docs/ui/components.md` button conventions.

| Location                        | Current               | Replacement                                        |
| ------------------------------- | --------------------- | -------------------------------------------------- |
| `AddProjectForm` Back           | raw `<button>`        | `<Button variant="outlined" severity="secondary">` |
| `AddProjectForm` Create project | raw `<button>`        | `<Button>` (primary, default)                      |
| `ProjectsTable` Cancel          | raw `<button>`        | `<Button variant="outlined" severity="secondary">` |
| `ProjectsTable` Save            | raw `<button>`        | `<Button>`                                         |
| `ProjectsTable` Edit            | raw `<button>` inline | `<Button variant="text">`                          |
| `ProjectsTable` Archive         | raw `<button>` inline | `<Button variant="text" severity="danger">`        |
| `ProjectsTable` Unarchive       | raw `<button>` inline | `<Button variant="text">`                          |
| `AdminPageHeader` back-link     | raw `<button>`        | `<Button variant="text" severity="secondary">`     |

Custom sizing via `pt` or class overrides where pixel-perfect match requires deviation from default PrimeVue sizes.

## Risks / Trade-offs

- **`requestJson` migration regression** — three clients handle many endpoints; a missed `method:` param defaults to GET silently. Mitigation: existing e2e tests cover the main paths; run `pnpm --filter @gitiempo/api test:e2e` after migration.
- **PrimeVue `<Button>` styling delta** — replacing raw buttons with `<Button>` may produce small visual differences if the PrimeVue preset styles differ from the current inline Tailwind classes. Mitigation: visual check against Pencil design nodes after implementation; adjust `pt` as needed.
- **`save-done` prop wiring** — adds a small amount of coordination between `ProjectsView` and `ProjectsTable`. If the table is later extracted to `web-shared`, the prop must travel with it. Mitigation: document in component JSDoc.
