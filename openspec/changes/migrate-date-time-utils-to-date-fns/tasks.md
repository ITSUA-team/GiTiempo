## 1. Shared Utility Setup

- [x] 1.1 Add `date-fns` to the shared frontend utility owner, expected `packages/web-shared`, respecting the repository package-management rules.
- [x] 1.2 Add an explicit `@gitiempo/web-shared/time` export path for browser-safe date/time helpers without exposing unrelated shared internals.
- [x] 1.3 Implement shared primitives for UTC date keys, UTC day/week boundaries, local day boundaries, UTC time labels, compact duration labels, elapsed `HH:MM:SS` labels, and running elapsed labels.
- [x] 1.4 Add focused shared utility tests for UTC day boundaries, UTC ISO week windows, local DatePicker day boundaries, compact/report duration formatting, elapsed duration clamping, and running duration labels.

## 2. User-Web Migration

- [x] 2.1 Migrate `apps/user-web` time-entry display helpers to shared primitives while keeping time-entry-specific wording such as `Running` app-local.
- [x] 2.2 Migrate Dashboard overview date windows, aggregate duration labels, and recent-entry row labels to shared primitives without changing rendered labels or weekly UTC semantics.
- [x] 2.3 Migrate top-bar timer elapsed display and Projects updated-date labels to shared primitives without changing timer or project page behavior.
- [x] 2.4 Migrate Time Entries filter date-boundary conversion to shared primitives while preserving current closed-open API query semantics.
- [x] 2.5 Update or add focused user-web tests for Dashboard aggregates, top-bar timer elapsed labels, Projects updated labels, Time Entries grouping, and Time Entries filter query boundaries.

## 3. Admin-Web Migration

- [x] 3.1 Migrate report view-model duration formatting to shared primitives while preserving current report table/search labels.
- [x] 3.2 Migrate report DatePicker date-range query conversion to shared local-day primitives while preserving local-calendar closed-open API boundaries.
- [x] 3.3 Update or add focused admin-web tests for report query/export conversion, invalid date handling, duration labels, and report row filtering that searches formatted durations.

## 4. Cleanup And Verification

- [x] 4.1 Remove superseded duplicated local date/time utility implementations after all consumers import the shared primitives.
- [x] 4.2 Confirm no backend, shared contract, OpenAPI, migration, seed, auth, or permission files changed for this frontend-only migration.
- [x] 4.3 Run shared package verification: `pnpm --filter @gitiempo/web-shared test && pnpm --filter @gitiempo/web-shared typecheck && pnpm --filter @gitiempo/web-shared lint`.
- [x] 4.4 Run user-web verification: `pnpm --filter user-web test && pnpm --filter user-web typecheck && pnpm --filter user-web lint`.
- [x] 4.5 Run admin-web verification: `pnpm --filter admin-web test && pnpm --filter admin-web typecheck && pnpm --filter admin-web lint`.
- [x] 4.6 Run OpenSpec validation: `openspec validate migrate-date-time-utils-to-date-fns --strict`.
