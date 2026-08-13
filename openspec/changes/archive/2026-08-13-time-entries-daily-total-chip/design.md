## Context

The Time Entries page groups entries by their started-at day. Each group renders a heading and an icon-only create action, and each entry renders its own duration in a right-aligned column. Nothing showed what a day added up to.

The total has been built and the design file updated, but they disagree on presentation: the page renders `Today, Apr 21 — 🕐 2h 22m` with an em dash and bare brand-purple text, while `GITiempo.pen` carries a tinted chip. This document records the decisions behind the chip so the two can be reconciled once and stay that way.

Constraints worth stating up front:

- The figure is derived on the client. `GET /time-entries` returns the page of entries and pagination metadata, and no total per day.
- Because it is derived from the loaded page, the total describes **the entries currently shown**, not everything ever tracked on that date. With pagination or a project filter active, the two differ.
- A running entry has `durationSeconds: null`, so its contribution only exists relative to the current moment.

## Goals / Non-Goals

**Goals:**

- A member can see how long a day took without adding rows up.
- The total agrees with the rows beneath it.
- A day containing a running entry keeps its total moving.
- Page and design file express the same thing.

**Non-Goals:**

- A weekly or range-wide total. The dashboard and reports already own aggregate views.
- A server-computed total, or any change to the list contract.
- Making the total describe the whole day when the visible rows are a filtered or paginated subset. That is a real limitation, recorded under Risks rather than solved here.

## Decisions

### Compute the total where the grouping happens

`groupTimeEntriesByLocalDay` already receives `nowMs` and is consumed through a computed that depends on it, so a total computed there advances with the ticking clock for free.

The alternative — computing it in the component — would have needed its own clock subscription to keep a running day live, duplicating something the grouping already has.

### Sum full entry durations, not the slice that falls inside the day

`getEntryTrackedSecondsWithinRange` sits next to the grouping code and looks like the natural tool, but it clips an entry to a range.

An entry starting 23:30 and ending 01:00 is grouped under the day it **started** and shows its whole length in its row. Clipping it to the day boundary would print a heading total that does not equal the visible rows — which reads as a bug, not as precision. Consistency with what is on screen wins over calendar exactness.

### Sum raw seconds, accept a rounding gap against the rows

`formatCompactDuration` floors to minutes and reports anything under a minute as `1m`. Summing raw seconds and formatting once can therefore differ from adding up the displayed row values, in either direction, by a minute or two.

The alternative — summing the rounded row values — would always agree visually but would drift from the real figure, and the ask in #377 is for the real figure. Toggl and Clockify take the same position.

### Present it as a chip, not as trailing text

The design language already has a chip: `$color-accent-tint` fill, `$color-brand` text, `$radius-sm`, seen in `statusOpen` on Projects List and `status2` on Admin Invoices. The total reuses it rather than introducing a new treatment.

Two things follow, and both matter:

- **No separator character.** The em dash currently in the page appears nowhere else in the design. A chip is self-contained and does not need one.
- **Brand purple here is not the running-state signal.** Bare purple text means "live", as on `Running now`. Purple *on a tint* is simply how chips look, so a chip does not read as a day that is still running.

One value departs from the existing chips on purpose: the number is 13px rather than their 12px, matching the Duration column it sums.

### Keep the heading at two children

The heading frame uses `space_between` with the date on the left and the create action on the right. A third child would have spread all three evenly and left the chip floating mid-row, so the date and chip are wrapped in a group and the heading keeps two children: group left, action right.

## Risks / Trade-offs

- **The total describes the visible page, not the calendar day** → With pagination or filters active it can understate the day. Mitigated by the total sitting inside a list the member just filtered, so the context is on screen; the honest fix is a server-side per-day aggregate, which is out of scope here.
- **Heading total and row durations can differ by a minute** → Inherent to flooring per row. Accepted deliberately; the heading carries the accurate figure.
- **Recomputed on every clock tick** → The reduce runs over one page of entries, at most the page size, once a second. Negligible, and it replaces a subscription the component would otherwise need.
- **Design file edited as JSON rather than through the editor** → The Pencil MCP server was not connected. Re-serialising the file at HEAD reproduces it byte for byte and a structural comparison confines changes to the two day headers, but the rendering has not been seen. Opening the frame once confirms it.
- **Icon libraries differ between code and design** → The design uses lucide throughout, the app uses heroicons. Pre-existing and out of scope; noted so the `clock` glyph choice is not mistaken for an inconsistency introduced here.

## Migration Plan

None. Presentation only, derived from data the page already holds. No migration, no contract change, no rollout ordering. Reverting is reverting the commits.

## Open Questions

- Should the chip appear for a day whose visible total is `0m`, or be omitted? Currently it renders, because a group only exists when it has entries.
- Should the total reflect the whole day rather than the visible page? That needs an API affordance and is a separate change.
