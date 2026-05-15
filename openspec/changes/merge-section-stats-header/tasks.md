## 1. Shared Component Consolidation

- [x] 1.1 Extend `SectionHeader` with a stats variant that preserves current `StatsHeader` title, description, actions, and optional stats-row layout.
- [x] 1.2 Extend the existing page header behavior of `SectionHeader` to support an optional actions slot without requiring the stats variant.
- [x] 1.3 Remove the standalone `StatsHeader` component export after all consumers migrate.

## 2. App Call Site Migration

- [x] 2.1 Replace all `StatsHeader` imports/usages in admin pages with `SectionHeader variant="stats"`.
- [x] 2.2 Replace user-web page header action rows with `SectionHeader` page-header action slots rather than wrapper markup or stats variant usage.
- [x] 2.3 Confirm no `StatsHeader` references remain in app or shared Vue/TypeScript code.

## 3. Verification

- [x] 3.1 Run `pnpm --filter @gitiempo/web-shared lint && pnpm --filter @gitiempo/web-shared typecheck`.
- [x] 3.2 Run `pnpm --filter admin-web lint && pnpm --filter admin-web typecheck`.
- [x] 3.3 Run `pnpm --filter user-web lint && pnpm --filter user-web typecheck`.
- [x] 3.4 Run focused user/admin tests for changed page-header action rendering when the implementation changes action-slot behavior.
- [x] 3.5 Validate the OpenSpec change with strict validation.
