## 1. Source-Of-Truth Alignment

- [x] 1.1 Update `docs/ui/pages-user.md` to document browser-local timezone behavior for affected user-web surfaces.
- [x] 1.2 Add `user-pages` spec deltas for Dashboard, Time Entries, and Profile browser-local timestamp/calendar behavior.
- [x] 1.3 Add `user-projects-list-page` spec deltas for browser-local task updated metadata.
- [x] 1.4 Add `frontend-shared-leaves` spec deltas so shared helper requirements preserve user-web browser-local semantics.

## 2. User-Web Implementation

- [ ] 2.1 Replace user-web UTC time-entry range labels with browser-local time labels while preserving running duration behavior.
- [ ] 2.2 Group Time Entries by browser-local started-at day and render local day headings.
- [ ] 2.3 Convert Time Entries DatePicker filters to browser-local day-start and next-browser-local-day-start ISO boundaries.
- [ ] 2.4 Seed day-level manual-entry create dialogs from the rendered browser-local day.
- [ ] 2.5 Calculate Dashboard `Today` and `This Week` stats/focus windows from browser-local day and Monday-start week boundaries.
- [ ] 2.6 Format Projects task updated metadata and Profile GitHub timestamps as browser-local user-facing labels.

## 3. Verification

- [ ] 3.1 Update focused user-web helper/component tests that currently assert UTC display, grouping, and dashboard window behavior.
- [ ] 3.2 Add timezone-sensitive regression coverage using fixed timestamps that cross UTC/local day boundaries.
- [ ] 3.3 Run `pnpm --filter user-web lint`.
- [ ] 3.4 Run `pnpm --filter user-web typecheck`.
- [ ] 3.5 Run `pnpm --filter user-web test`.
- [ ] 3.6 If shared frontend date-time helpers are changed, also run `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and relevant shared/admin tests.
