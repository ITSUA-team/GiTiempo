## Context

`apps/admin-web/src/components/MembersTable.vue` and `apps/admin-web/src/components/ProjectsTable.vue` already render the required table chrome, local filters, mobile card branches, and inline row expansion. They also import page-level infrastructure such as auth stores, API clients, confirmation helpers, and toast helpers for member removal and project archive/unarchive mutations. The clarified table boundary is stricter than the initial pass: admin table components must not own local filter state, filtering derivation, expansion state, expansion-mode state, edit/assignment form rendering, or mutation orchestration. The inline expansion forms rendered from those tables must also stay UI-only by emitting save payloads rather than importing clients, stores, or toasts.

The nearest app guidance in `apps/admin-web/AGENTS.md` keeps full route pages and app-specific orchestration app-local, requires PrimeVue/tokens for standard UI, and requires preserving approved design parity. The relevant UI docs are `docs/ui/components.md`, `docs/ui/pages-admin.md`, and `docs/ui/patterns.md`; they require management tables with icon-only actions, distinct mobile branches, toast feedback, and route/page-shell ownership of confirmation hosts. The approved `GITiempo.pen` file could not be inspected through the Pencil tool because no `.pen` file is open in the editor, so implementation must reopen/check the admin Members and Projects frames before final UI sign-off.

## Goals / Non-Goals

**Goals:**

- Make `MembersTable.vue` and `ProjectsTable.vue` fully presentational by receiving prepared table rows, filter values/options, empty-state copy, viewport mode, expanded rows, and row-expansion slot content from their parents, then emitting typed row-level intents and filter/expanded-row updates. Project archive/unarchive intents stay inside the page-owned inline settings content rather than row/card table actions.
- Make inline expansion forms presentational by keeping validation/control rendering local while emitting typed save payloads to the route view.
- Move member removal and project archive/unarchive orchestration to the route view or a focused admin-web composable so API calls, confirmations, success/error toasts, and refresh logic are tested at the owner boundary.
- Preserve existing user-visible behavior, accessibility labels/tooltips, refresh behavior, and error handling.

**Non-Goals:**

- No backend, database, OpenAPI, or shared contract changes.
- No redesign of the Members or Projects pages beyond preserving current approved table behavior.
- No extraction of product-specific admin row markup into `@gitiempo/web-shared`.
- No change to `MemberAssignPmPanel`, `MemberEditForm`, or `ProjectEditForm` unless their current save/cancel events need minor wiring compatibility updates.

## Decisions

- Move Members and Projects table filtering, prepared display-row derivation, expansion state, and expansion-mode state to route views or focused table-state composables.
  - Rationale: the stricter dumb/presentational boundary now applies to all admin table components. Tables should render supplied rows and forward user intents.
  - Alternative considered: keep filter and expansion state in table components as presentational UI state. That conflicts with the clarified requirement and keeps tables harder to isolate.
- Replace table-owned mutations with typed emits from the page-owned interaction surface carrying the affected row payload.
  - Rationale: parent owners need row context for confirmation copy and API calls, while table components only need to report filter/edit intent from desktop and mobile controls. Project archive/unarchive controls remain in the inline settings content documented by the UI source of truth.
  - Alternative considered: emit only IDs. That would force parents to re-find rows for names/copy and creates more edge cases when loaded data changes during confirmation.
- Put orchestration in the existing route views first, then extract focused composables only if route code becomes broad.
  - Rationale: this is an app-local refactor with one page owner per mutation family. A composable is useful for testability or view thinness, but an up-front shared abstraction would be unnecessary.
  - Alternative considered: create a generic management-table mutation composable. That would hide product-specific confirmation copy, log contexts, and refresh requirements behind a broad abstraction.
- Keep confirmation/toast host ownership outside leaf tables.
  - Rationale: `docs/ui/patterns.md` explicitly keeps global confirmation hosts at route, page-shell, or app-shell level, and leaf components should not own global service infrastructure.
  - Alternative considered: pass confirmation/toast callbacks as table props. Emits are simpler, easier to test, and preserve a clear one-way data flow.

## Risks / Trade-offs

- [Risk] Moving mutations could accidentally change refresh scope after archive/unarchive or member removal. -> Mitigation: keep existing `refreshMembers` and `refresh` paths, and add/adjust view or composable specs for success and failure paths.
- [Risk] Desktop and mobile actions could diverge during emit rewiring. -> Mitigation: table specs must assert both branches emit the same intent for the same action type.
- [Risk] Route views can become orchestration-heavy. -> Mitigation: extract a small page-specific composable only if the view accumulates repeated mutation state or hard-to-test logic.
- [Risk] Removing auth-store checks from tables can change no-token behavior. -> Mitigation: route/composable handlers must keep the existing early return when no access token is available.
- [Risk] Design parity could regress unintentionally even though this is not a visual redesign. -> Mitigation: implementation must inspect the approved admin Members and Projects `.pen` frames and perform a parity check before completion.

## Migration Plan

- Update table emits and click handlers first while preserving all existing markup, `data-testid` values, labels, and tooltips.
- Move member removal confirmation/API/toast/refresh handling into `MembersView.vue` or a focused members-page composable.
- Move Members table filtering, row display preparation, expansion state, and edit/assignment expansion rendering out of `MembersTable.vue` into `MembersView.vue` or a focused members-table composable.
- Move Projects table filtering, row display preparation, expansion state, and project settings expansion rendering out of `ProjectsTable.vue` into `ProjectsView.vue` or a focused projects-table composable.
- Move member assignment save, member role save, and project settings save API/toast orchestration out of inline expansion forms into the page owners.
- Move project archive confirmation, archive API/toast/refresh handling, and unarchive API/toast/refresh handling into `ProjectsView.vue` or a focused projects-page composable.
- Update table tests to remove API/toast/confirmation mocks and assert emitted intents from desktop and mobile actions.
- Update view/composable tests to cover success and failure orchestration for member removal, project archive, and project unarchive.
- Rollback is straightforward: restore previous table-owned handlers and event wiring if the refactor fails verification; no persisted data or contract migration is involved.

## Open Questions

- None. The implementation keeps orchestration in page-owned route views or focused app-local composables, and the approved `GITiempo.pen` admin Members and Projects frames were inspected during implementation sign-off.
