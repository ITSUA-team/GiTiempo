## Context

`apps/admin-web/src/components/MembersTable.vue` and `apps/admin-web/src/components/ProjectsTable.vue` already render the required table chrome, local filters, mobile card branches, and inline row expansion. They also import page-level infrastructure such as auth stores, API clients, confirmation helpers, and toast helpers for member removal and project archive/unarchive mutations.

The nearest app guidance in `apps/admin-web/AGENTS.md` keeps full route pages and app-specific orchestration app-local, requires PrimeVue/tokens for standard UI, and requires preserving approved design parity. The relevant UI docs are `docs/ui/components.md`, `docs/ui/pages-admin.md`, and `docs/ui/patterns.md`; they require management tables with icon-only actions, distinct mobile branches, toast feedback, and route/page-shell ownership of confirmation hosts. The approved `GITiempo.pen` file could not be inspected through the Pencil tool because no `.pen` file is open in the editor, so implementation must reopen/check the admin Members and Projects frames before final UI sign-off.

## Goals / Non-Goals

**Goals:**

- Make `MembersTable.vue` and `ProjectsTable.vue` presentational for destructive/mutating row actions by emitting typed row-level intents instead of importing API clients, auth stores, confirmations, or toasts.
- Keep table-owned UI state that is legitimately presentational: search/filter state, responsive table/card rendering, row expansion state, and row collapse after child form save/cancel events.
- Move member removal and project archive/unarchive orchestration to the route view or a focused admin-web composable so API calls, confirmations, success/error toasts, and refresh logic are tested at the owner boundary.
- Preserve existing user-visible behavior, accessibility labels/tooltips, refresh behavior, and error handling.

**Non-Goals:**

- No backend, database, OpenAPI, or shared contract changes.
- No redesign of the Members or Projects pages beyond preserving current approved table behavior.
- No extraction of product-specific admin row markup into `@gitiempo/web-shared`.
- No change to `MemberAssignPmPanel`, `MemberEditForm`, or `ProjectEditForm` unless their current save/cancel events need minor wiring compatibility updates.

## Decisions

- Keep filtering and expansion state inside table components.
  - Rationale: filtering, responsive row/card rendering, and inline panel visibility are tightly coupled to the presentational table surface and are already covered by component tests.
  - Alternative considered: move all table state to the route view. That would make route views larger without improving API orchestration boundaries.
- Replace table-owned mutations with typed emits carrying the affected row payload.
  - Rationale: parent owners need row context for confirmation copy and API calls, while table components only need to report user intent from desktop and mobile action controls.
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
- Move project archive confirmation, archive API/toast/refresh handling, and unarchive API/toast/refresh handling into `ProjectsView.vue` or a focused projects-page composable.
- Update table tests to remove API/toast/confirmation mocks and assert emitted intents from desktop and mobile actions.
- Update view/composable tests to cover success and failure orchestration for member removal, project archive, and project unarchive.
- Rollback is straightforward: restore previous table-owned handlers and event wiring if the refactor fails verification; no persisted data or contract migration is involved.

## Open Questions

- Whether the implementation should keep orchestration directly in route views or extract focused composables will be decided after the first pass based on view size and test clarity.
- The approved `GITiempo.pen` admin Members and Projects frames need to be opened in the Pencil editor before implementation sign-off because the current tool session could not access them.
