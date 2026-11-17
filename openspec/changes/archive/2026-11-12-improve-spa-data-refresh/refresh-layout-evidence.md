# Refresh layout follow-up

User-requested removal of the visible Time Entries and Projects refresh
messages is implemented on top of `bcf14339` and the uncommitted timer
follow-up. Both status-row elements are removed; the existing page sections
carry `aria-busy` during refresh. Refresh ownership, retained content,
stale-action guards, initial skeletons, error/retry UI, and notifications are
unchanged. No replacement element occupies layout space.

The approved `GITiempo.pen` frames `R2FI0`, `yAu6B`, and `FRM1d` remain the
structure reference: filters, day/project headings, fields, actions, desktop
tables, and mobile cards retain their ordering and spacing. This removal is
the user's explicit adjustment to the former refresh-status requirement.
No PrimeVue conflict or shared-component extraction was needed.

## Real-page acceptance

Chrome for Testing through the existing local DevTools session; desktop
1280×900 and mobile 390×844. Only GET responses were delayed by 15 seconds.
No timer or other record was created, updated, or deleted by this check.
The task text filter was cleared afterward, viewport restored to desktop,
and the owned interception controller disabled/stopped. User-owned servers,
Chrome, and other tabs were left open.

| Page | Viewport | Result | Heading top before / during pending read | Evidence |
| --- | --- | --- | --- | --- |
| Time Entries | Desktop | PASS | 201.25 / 201.25 px | [Pending filter](evidence/no-refresh-banner-time-entries-desktop.png) |
| Time Entries | Mobile | PASS | 364.25 / 364.25 px | [Pending clear](evidence/no-refresh-banner-time-entries-mobile.png) |
| Projects | Desktop | PASS | 150 / 150 px | [Pending route return](evidence/no-refresh-banner-projects-desktop.png) |
| Projects | Mobile | PASS | 315.5 / 315.5 px | [Pending route return](evidence/no-refresh-banner-projects-mobile.png) |

In all four checks `aria-busy` changed from false to true while the response
was pending, the removed copy was absent, and loaded rows/cards remained.
Completion restored false. Screenshots were reviewed against the existing
desktop/mobile structure; no additional visual delta was introduced.

## Verification

- Existing two view suites: 64 tests pass, including retained rows, stale
  action restrictions, busy state, and absence of the removed copy.
- Root typecheck, lint, and tests pass; lint has existing warnings and no
  errors. Both frontend suites are included.
- Independent source/test/docs review: approved, no blocker.
- Strict OpenSpec validation and `git diff --check`: pass.

The session exposes no codebase-memory index tools, so reindexing was not
available. This UI-only change does not need API integration checks. No
commit, push, archive, or deployment is part of this follow-up.
