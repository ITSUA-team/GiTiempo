## 1. Preparation

- [x] 1.1 Inspect the affected `apps/user-web` and `apps/admin-web` components that render Time Entries day headers, User Projects project headers, Admin Invoices table header, Admin Members table header, and Admin Projects table header.
- [x] 1.2 Check for an existing small shared or local icon-action primitive before adding new repeated markup; otherwise keep the PrimeVue button changes local to each surface.
- [x] 1.3 Build a parity checklist from `docs/ui/pages-user.md`, `docs/ui/pages-admin.md`, `docs/ui/patterns.md`, `docs/ui/components.md`, `docs/ui/accessibility.md`, and the `GITiempo.pen` frames `Time Entries`, `Projects List`, `Admin Invoices`, `Admin Members`, and `Admin Projects`.

## 2. User Web Implementation

- [x] 2.1 Replace Time Entries day-level `New time entry` text openers with primary icon-only PrimeVue actions that keep tooltip and accessible label copy `New time entry`.
- [x] 2.2 Preserve Time Entries day prefill behavior and existing manual time-entry dialog title, field order, validation, submit button copy, and mutation flow.
- [x] 2.3 Replace User Projects project-level `Add task` text openers with primary icon-only PrimeVue actions that keep tooltip and accessible label copy `Add task`.
- [x] 2.4 Apply the same User Projects `Add task` icon-action pattern to the mobile project-section branch and remove any stale page-content text `+ New task` opener that conflicts with the approved design.
- [x] 2.5 Preserve User Projects project preselection behavior and existing task dialog title, field order, validation, submit button copy, and mutation flow.
- [x] 2.6 Update focused user-web tests to query icon-only openers by accessible name and cover Time Entries day create plus User Projects desktop and mobile project-section add behavior.

## 3. Admin Web Implementation

- [ ] 3.1 Replace the Admin Invoices table-header `Create invoice` text opener with a primary icon-only action next to search, preserving tooltip and accessible label copy `Create invoice` and the existing dialog flow.
- [x] 3.2 Replace the Admin Members stats/header `Invite Member` text opener with a table-header primary icon-only action next to search, preserving tooltip and accessible label copy `Invite member` and the existing invite dialog flow.
- [x] 3.3 Replace the Admin Projects table-header `New Project` text opener with a primary icon-only action next to search, preserving tooltip and accessible label copy `New project` and navigation to `/projects/new`.
- [ ] 3.4 Update focused admin-web tests to query icon-only openers by accessible name and cover invoice dialog opening, member invite dialog opening, and project new-route navigation.

## 4. Verification

- [x] 4.1 Run `pnpm --filter user-web lint` and `pnpm --filter user-web typecheck`.
- [x] 4.2 Run `pnpm --filter user-web test` for the affected user-web component/view behavior.
- [x] 4.3 Run `pnpm --filter admin-web lint` and `pnpm --filter admin-web typecheck`.
- [x] 4.4 Run `pnpm --filter admin-web test` for the affected admin-web component/view behavior.
- [ ] 4.5 Complete a design parity review against the approved `.pen` frames and document any PrimeVue-only compromises, or state that none were required.
