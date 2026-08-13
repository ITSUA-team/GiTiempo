# Daily total chip in the Time Entries day heading

## Why

A day group on the Time Entries page lists its entries but never their sum, so a member who wants to know how long they worked on a given day has to add the rows up by hand (#377).

The total has since been added to the page and drawn into `GITiempo.pen`, but the two disagree: the design carries a tinted chip beside the date, while the page renders an em dash followed by bare purple text. Leaving that gap open means the next person to touch the header has to guess which one is authoritative.

## What Changes

- Each day heading shows the total time tracked for that day, beside the date.
- The total is rendered as the tinted chip already drawn in the design: `$color-accent-tint` fill, `$radius-sm`, a lucide `clock` glyph and the duration in `$color-brand`.
- The em dash separator and the bare-text treatment currently in the page are removed. A chip is a self-contained object and needs no separator character, and the dash exists nowhere else in the design language.
- A day containing a running entry keeps its total advancing with the clock rather than freezing until reload.
- The total counts each entry at its full length, matching the duration each row displays, and is formatted with the same compact format as the Duration column.

No API, contract, or persistence change: the figure is derived on the client from entries the page has already loaded.

## Capabilities

### New Capabilities

None. This modifies how an existing surface presents data it already has.

### Modified Capabilities

- `user-pages`: the "Entries render grouped by day" scenario currently requires a day group to show "a day heading and a primary icon-only `New time entry` action". It gains a requirement that the heading also shows the day's tracked total, and that the total stays live while an entry in that day is running.

## Impact

- `apps/user-web/src/lib/time-entry-display.ts` — the day group carries a total; a helper resolves an entry's duration when the stored one is absent.
- `apps/user-web/src/components/time-entries/TimeEntriesDaySection.vue` — the heading renders the chip.
- `GITiempo.pen` — the Time Entries frame already carries the chip in both day headers.
- No change to `apps/api`, `packages/shared`, or any query contract.

## Current state

Partly built already, on `feat/time-entries-daily-total`:

- the total is computed and displayed, and it ticks with a running entry;
- the design file carries the chip;
- the page still renders the dash and bare purple text rather than the chip.

This change closes that last gap and records the requirement so the two cannot drift apart again.
