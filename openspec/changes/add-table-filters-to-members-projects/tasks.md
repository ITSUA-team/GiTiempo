## 1. Members Table Filters

- [x] 1.1 Add typed Members table filter state, default values, filter options, and computed helpers for global search, role, assigned-project, and last-active filters using browser-local day/week semantics.
- [x] 1.2 Add the Members table header search, desktop filter row, and mobile filter controls matching the `Admin Members` `.pen` screen and existing Reports table treatment.
- [x] 1.3 Apply Members filters to both desktop rows and mobile cards, and ensure clearing filters restores all loaded members allowed by the page scope.
- [x] 1.4 Preserve Assign PM, Edit, and Remove action behavior while collapsing or reconciling expanded rows that become hidden by active filters.
- [x] 1.5 Add or update `MembersTable` component tests for search, role filter, assigned-project filter, last-active filter, clearing filters, mobile filter rendering, no Actions-column filter control, and preserved row actions.

## 2. Projects Table Filters

- [x] 2.1 Replace the standalone assigned-member Projects filter with typed Projects table filter state and computed helpers for global search, project, source, assigned-member, hours, and visibility filters using the documented hours buckets.
- [x] 2.2 Add the Projects table header search, desktop filter row, and mobile filter controls matching the `Admin Projects` `.pen` screen and existing Reports table treatment.
- [x] 2.3 Apply Projects filters to both desktop rows and mobile cards, and ensure clearing filters restores all loaded projects allowed by the page scope.
- [x] 2.4 Preserve Edit, Archive, Unarchive, and project-settings expansion behavior while collapsing or reconciling expanded rows that become hidden by active filters.
- [x] 2.5 Add or update `ProjectsTable` component tests for search, source filter, assigned-member filter, hours filter, visibility filter, clearing filters, mobile filter rendering, no Actions-column filter control, and preserved row actions.

## 3. Verification

- [x] 3.1 Complete reusable-pattern and design-parity review against `GITiempo.pen` screens `Admin Reports`, `Admin Members`, and `Admin Projects`, documenting any PrimeVue-only compromises.
- [x] 3.2 Run `pnpm --filter admin-web lint`.
- [x] 3.3 Run `pnpm --filter admin-web typecheck`.
- [x] 3.4 Run `pnpm --filter admin-web test -- src/components/MembersTable.spec.ts src/components/ProjectsTable.spec.ts`.
- [x] 3.5 If implementation touches `packages/web-shared`, run `pnpm --filter @gitiempo/web-shared lint`, `pnpm --filter @gitiempo/web-shared typecheck`, `pnpm --filter user-web lint`, and `pnpm --filter user-web typecheck`.
