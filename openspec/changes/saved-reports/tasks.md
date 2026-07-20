## 1. Shared contract

- [x] 1.1 Add `packages/shared/src/contracts/saved-reports.ts`: `savedReportPeriodSchema` (`this_week | this_month | previous_month | last_7_days | last_30_days`), `savedReportDateRangeSchema` (discriminated union of relative period and absolute window), `savedReportConfigSchema` (dateRange, ordered grouping path reusing `timeReportGroupByPathSchema` vocabulary, `projectId`, `memberId`, column filters), `savedReportSchema`, create/update payloads, and list response
- [x] 1.2 Make the config schema tolerant per design D3: strip unknown keys, default missing filter keys, so older stored configs keep parsing
- [x] 1.3 Export the module from `packages/shared/src/contracts/index.ts`
- [x] 1.4 Cover parsing in `saved-reports.spec.ts`: both date-range shapes, unknown period rejected, unknown grouping dimension rejected, defaults applied to a minimal config
- [x] 1.5 Build shared and confirm dependents typecheck

## 2. Database

- [x] 2.1 Add `apps/api/src/reports/schemas/saved-reports.schema.ts` (first `schemas/` folder in the reports module): `id` uuid pk, `workspace_id` fk restrict, `created_by` fk, `name` varchar(120), `config` jsonb, `created_at`/`updated_at`
- [x] 2.2 Add a case-insensitive unique index on (`workspace_id`, lower(`name`)) and an index on `workspace_id`
- [x] 2.3 Re-export the schema from `apps/api/src/db/schema.ts`
- [x] 2.4 Generate the Drizzle migration and verify the SQL matches the intended constraints

## 3. Saved reports API

- [x] 3.1 Add DTOs re-wrapping the shared contracts
- [x] 3.2 Implement `SavedReportsService`: list by workspace, create, update (config and/or name), delete; parse `config` through the shared schema on read and write; map the unique-violation to a conflict via `postgres-errors.ts`
- [x] 3.3 Add `SavedReportsController` with `GET/POST /reports/saved` and `PATCH/DELETE /reports/saved/:id`, guarded to admin and PM exactly as the time-report endpoints are
- [x] 3.4 Register the service and controller in `reports.module.ts`
- [x] 3.5 Unit coverage in `saved-reports.service.spec.ts`: workspace scoping, duplicate-name conflict, config validation on read and write, update and delete paths
- [x] 3.6 Add `apps/api/test/saved-reports.e2e-spec.ts`: CRUD round-trip, workspace isolation (404 across workspaces), duplicate name 409, member 403 on read and write, invalid config 400, PM can edit an admin's preset
- [x] 3.7 Regenerate `packages/shared/openapi.json` via the build-based workflow (per `apps/api/AGENTS.md` gotcha)

## 4. Admin web preset core

- [x] 4.1 Add `src/lib/saved-report-config.ts`: `buildConfigFromState`, `applyConfigToState`, `resolveRelativePeriod(period, now)` returning a concrete range, and `normaliseConfig` for comparison; keep it pure and take `now` as a parameter so tests are deterministic
- [x] 4.2 Implement dirty comparison per design D4: compare normalised stored shapes, never the resolved window, so a relative preset is not dirty the day after it was saved
- [x] 4.3 Resolve identities that no longer exist in the user's option scope to the unfiltered choice, reporting the fallback
- [x] 4.4 Cover all of the above in `saved-report-config.spec.ts` — this is the pure core and carries most of the test weight

## 5. Admin web data layer

- [x] 5.1 Add `src/services/admin-saved-reports-client.ts` for list/create/update/delete; spec file
- [x] 5.2 Add `src/composables/reports/useSavedReports.ts`: preset list state, active preset, dirty flag, save/save-as/rename/delete actions with cache invalidation; spec file

## 6. Admin web UI

- [ ] 6.1 Add relative period options to the report date range control beside the existing custom range picker, per design D2
- [ ] 6.2 Build `src/components/reports/SavedReportsBar.vue` to the approved `savedReportsBar` frame (node `kT0h1`): `Saved reports` label, 32px pill tabs with the active pill tinted and bookmark-marked, `+ New report` pill, unsaved-changes dot and label, `Save` button, `Save as new…` action
- [ ] 6.3 Add the rename/delete overflow menu on the active tab and record it in the final review as a deliberate addition to the approved design (per `apps/admin-web/AGENTS.md`)
- [ ] 6.4 Wire the bar into `ReportsView.vue` above the summary cards, threading apply/save/new through the reports composables
- [ ] 6.5 Add the name prompt for `Save as new…` and surface the duplicate-name conflict inline
- [ ] 6.6 Cover the bar and view wiring in `SavedReportsBar.spec.ts` and `ReportsView.spec.ts`: tab rendering and active state, apply restores state, dirty indicator appears and clears, save/save-as/new actions, duplicate-name error

## 7. Docs and verification

- [ ] 7.1 Document the saved reports bar, preset semantics, and relative periods in `docs/ui/pages-admin.md`
- [ ] 7.2 API: `pnpm --filter @gitiempo/api lint && typecheck && test`; run e2e after `db:migrate` + `db:seed`
- [ ] 7.3 Admin web: `pnpm --filter admin-web lint && typecheck && test`
- [ ] 7.4 State in the final review whether any PrimeVue constraint forced a deviation from the approved .pen design
