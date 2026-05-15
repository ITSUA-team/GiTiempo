## Why

`SectionHeader` and `StatsHeader` currently render the same title/description/action header pattern with only the optional stats row differing. Keeping both components creates duplicated shared UI contracts and makes page header spacing, typography, and action alignment easier to drift across the apps.

## What Changes

- Extend `SectionHeader` so it is the canonical shared header component for page, section, and stats-header layouts.
- Move `StatsHeader`'s stats slot behavior into `SectionHeader` through an explicit variant.
- Update user and admin app call sites to consume `SectionHeader` for all matching page, section, and stats header surfaces.
- Remove the standalone `StatsHeader` export/component after its behavior is represented by `SectionHeader`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `frontend-shared-leaves`: Shared header leaves should consolidate structurally identical page, section, and stats header patterns in `SectionHeader`.
- `layout`: Page/header action alignment should continue to use the shared header structure, including pages that include stat card rows.

## Impact

- Affects `packages/web-shared/src/components/SectionHeader.vue`, `StatsHeader.vue`, and the shared component barrel.
- Affects admin views that currently import `StatsHeader`.
- Affects frontend verification for `admin-web`, `user-web`, and `@gitiempo/web-shared` typechecking.
- No API, database, contract, auth, or routing behavior changes.
