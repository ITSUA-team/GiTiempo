## Preparation Inventory

### References Read

- `apps/user-web/AGENTS.md`
- `apps/admin-web/AGENTS.md`
- `packages/web-shared/AGENTS.md`
- `docs/ui/INDEX.md`
- Vue best-practices references: reactivity, SFC structure, component data flow, composables
- TanStack Query docs through Context7: Vue Query plugin setup, QueryClient config, reactive query keys, enabled queries, `useQuery`, `useMutation`, invalidation, isolated test QueryClient guidance

### Current Query Usage

- No existing `@tanstack/vue-query`, `VueQueryPlugin`, `QueryClient`, `useQuery`, `useMutation`, or `useQueryClient` usage was found in checked source files.

### User Web Composables

| File | Lines | Current responsibilities |
| --- | ---: | --- |
| `apps/user-web/src/composables/useTimeEntriesPage.ts` | 909 | Server-state loading, filters, pagination, task lookup, dialog/form state, validation, create/update/delete side effects, grouping, date/duration formatting, toasts, confirm flow, route aggregation. |
| `apps/user-web/src/composables/useProjectsPage.ts` | 668 | Visible project/task loading, task loading errors, combined search, task dialog/form state, validation, create/update/delete side effects, confirmation, toasts, grouping, date formatting, route aggregation. |
| `apps/user-web/src/composables/useTopBarTimer.ts` | 603 | Current timer loading, visible project/task loading, last-entry lookup, selected timer context, task-picker dialog state, create task validation, start/stop side effects, elapsed ticking/formatting, toasts, route-shell aggregation. |
| `apps/user-web/src/composables/useDashboardOverview.ts` | 471 | Own-entry loading, dashboard summary derivation, recent-entry mapping, running duration derivation, loading/error state, toast feedback. |
| `apps/user-web/src/composables/useProfileGithubConnection.ts` | 251 | GitHub status loading, OAuth callback query cleanup, connect/disconnect side effects, confirmation, toasts, redirect side effect. |

### Admin Web Composables

| File | Lines | Current responsibilities |
| --- | ---: | --- |
| `apps/admin-web/src/composables/useReportsData.ts` | 318 | Project/report loading, setup state, date validation, debounce refresh, table rows/summary derivation, filter option sync, loading/error state, toast feedback. |
| `apps/admin-web/src/composables/useAdminSettingsPage.ts` | 263 | Workspace/settings loading, form state, dirty state, validation integration, save side effects, auth-shell label sync, loading/error state, toasts. |
| `apps/admin-web/src/composables/useAdminDashboardPage.ts` | 219 | Role-scoped dashboard loading, metrics derivation, activity derivation, expand/collapse state, loading/error state, toasts. |
| `apps/admin-web/src/composables/admin-settings-form.ts` | 119 | Pure-ish settings form mapping, validation, and update payload derivation. No server-state ownership. |
| `apps/admin-web/src/composables/useToasts.ts` | 33 | Toast wrapper only. No server-state ownership. |
| `apps/admin-web/src/composables/useConfirmation.ts` | 23 | Confirmation wrapper only. No server-state ownership. |

### Primary Consumers

- `useTimeEntriesPage`: `TimeEntriesView.vue`, `useTimeEntriesPage.spec.ts`, `TimeEntriesView.spec.ts`, and type-only imports from `TimeEntriesDaySection.vue`, `TimeEntriesDaySection.spec.ts`, `TimeEntryDialog.vue`.
- `useTopBarTimer`: `TopBarTimer.vue`, `useTopBarTimer.spec.ts`, `TopBarTimer.spec.ts`.
- `useProjectsPage`: `ProjectView.vue`, `useProjectsPage.spec.ts`, `ProjectView.spec.ts`.
- `useDashboardOverview`: `DashboardOverview.vue`, `useDashboardOverview.spec.ts`, `DashboardOverview.spec.ts`, and type-only imports from dashboard card components.
- `useAdminDashboardPage`: `DashboardView.vue`, `DashboardView.spec.ts`, `useAdminDashboardPage.spec.ts`.
- `useReportsData`: `ReportsView.vue`, `ReportsView.spec.ts`, `useReportsData.spec.ts`.
- `useAdminSettingsPage`: `SettingsView.vue`, `useAdminSettingsPage.spec.ts`.

### Scope Confirmation

- The change remains frontend-only.
- No backend app, database, seed, migration, OpenAPI, or shared API contract change is required by the proposal/design/spec.
- Existing app-local clients remain the fetch boundaries; Query composables must not introduce duplicate transport helpers.
