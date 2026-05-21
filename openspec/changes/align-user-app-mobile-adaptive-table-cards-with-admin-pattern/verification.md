## Archive Checklist

- [x] Confirm `implement-user-projects-list-page` was archived/applied before this change.
- [x] Confirm `docs/ui/pages-user.md` documents the mobile-card behavior for Dashboard, Projects, and Time Entries.

## Design Parity Evidence

- Approved `.pen` frames reviewed: `User Dashboard` (`obxTM`), `Time Entries` (`R2FI0`), `Projects List` (`yAu6B`).
- [x] Paste the recorded parity checklist for desktop table content, actions, spacing, hierarchy, and mobile adaptation constraints.
- Desktop parity checklist:
  - Dashboard recent entries keep the existing desktop table columns for task, project, range, and duration.
  - Projects task sections keep the existing desktop grouped table structure, section header hierarchy, and icon-only row actions.
  - Time Entries day groups keep the existing desktop grouped table layout, running-entry highlight, and completed-entry action behavior.
  - Mobile cards preserve the same record fields and action affordances as their desktop rows while removing horizontal scrolling below `640px`.
  - Shared mobile card shell and viewport helper stay presentational; product-specific content remains app-local.
- [x] Note any PrimeVue-only compromise, or write `None`.
- PrimeVue-only compromise: None.

## Verification Evidence

- [x] Record the exact commands run.
- Commands run:
  - `pnpm --filter user-web lint`
  - `pnpm --filter user-web typecheck`
  - `pnpm --filter user-web test`
  - `pnpm --filter admin-web lint`
  - `pnpm --filter admin-web typecheck`
  - `pnpm --filter admin-web test`
- [x] Record the result of `pnpm --filter user-web lint`.
- Result: passed.
- [x] Record the result of `pnpm --filter user-web typecheck`.
- Result: passed.
- [x] Record the result of `pnpm --filter user-web test`.
- Result: passed, `23` test files and `136` tests.
- [x] If `packages/web-shared` changed, record the results of `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test`.
- Result: all passed; admin tests passed with `29` test files and `121` tests.
