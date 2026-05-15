## Context

`packages/web-shared` currently exposes both `SectionHeader` and `StatsHeader`. `SectionHeader` already owns the shared page/section title, description, and action-slot pattern across both SPAs, while `StatsHeader` repeats the same header block and adds an optional stats row for admin management pages.

The affected frontend surfaces are shared Vue components in `packages/web-shared` and controlled app call sites in `apps/admin-web` and `apps/user-web`. There are no backend, API, contract, database, auth, or routing changes.

## Goals / Non-Goals

**Goals:**

- Make `SectionHeader` the single shared component for page, section, and stats header layouts.
- Preserve the current visual structure of existing `StatsHeader` pages when migrated.
- Remove the standalone `StatsHeader` implementation and export after all call sites use `SectionHeader`.
- Keep route/page composition local to each app.

**Non-Goals:**

- Do not redesign page header typography, stat cards, tables, or management-page layout.
- Do not introduce a generic class-overridable header builder.
- Do not change API, auth, routing, or state-management behavior.

## Decisions

- Add a `stats` variant to `SectionHeader` rather than keeping a wrapper component.
  - Rationale: the duplicated behavior is purely presentational and all current `StatsHeader` call sites are controlled within the monorepo.
  - Alternative considered: keep `StatsHeader` as a wrapper around `SectionHeader`. Rejected because it preserves two public component names for one design-system pattern.
- Preserve the current `StatsHeader` DOM shape inside the new `SectionHeader` variant.
  - Rationale: this minimizes page-level visual churn and keeps existing desktop layouts stable.
  - Alternative considered: make page header stats a generic `variant="page"` slot. Rejected because stat rows need a distinct vertical spacing pattern.
- Update admin page imports and usage directly.
  - Rationale: all `StatsHeader` consumers are known, and removing the export prevents new usage from drifting back to the deprecated component.

## Risks / Trade-offs

- Stats variant increases `SectionHeader` responsibility slightly → Keep the API narrow: only `variant`, `actions`, and `stats` slots.
- Removing `StatsHeader` can break missed imports → Search all app and shared code for `StatsHeader`, then run admin/user/web-shared typechecks.
- Visual drift on management pages → Preserve current classes and verify against docs-defined header/stat-card structure; no PrimeVue-specific compromise is expected.
