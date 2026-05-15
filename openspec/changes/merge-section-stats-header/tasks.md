## 1. Shared Component Consolidation

- [x] 1.1 Extend `SectionHeader` with a stats variant that preserves current `StatsHeader` title, description, actions, and optional stats-row layout.
- [x] 1.2 Remove the standalone `StatsHeader` component export after all consumers migrate.

## 2. App Call Site Migration

- [x] 2.1 Replace all `StatsHeader` imports/usages in admin pages with `SectionHeader variant="stats"`.
- [x] 2.2 Confirm no `StatsHeader` references remain in app or shared Vue/TypeScript code.

## 3. Verification

- [x] 3.1 Run frontend/shared verification for `@gitiempo/web-shared`, `admin-web`, and `user-web`.
- [x] 3.2 Validate the OpenSpec change with strict validation.
