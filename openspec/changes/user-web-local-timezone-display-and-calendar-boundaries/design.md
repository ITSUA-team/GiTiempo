## Context

The API stores and returns time-entry timestamps as ISO datetimes. The backend list endpoint already accepts absolute `dateFrom` and `dateTo` ISO boundaries, so local calendar behavior can be implemented by the frontend calculating the correct browser-local boundary instants before sending requests.

The active `migrate-date-time-utils-to-date-fns` change currently says user-facing time-entry displays, filters, dashboard windows, and grouped day labels remain UTC-based. This proposal intentionally supersedes that assumption for member-facing `user-web` surfaces only.

## Decisions

### Browser-local user-web semantics

Member-facing `user-web` timestamp labels and calendar boundaries use the authenticated user's current browser-local timezone. This is a runtime browser behavior, not a persisted user preference.

Affected user-web behavior:

- Time Entries row/card time ranges
- Time Entries day grouping and day headings
- Time Entries DatePicker filter conversion to `dateFrom` and `dateTo`
- Time Entries day-level create dialog presets
- Dashboard `Today` and `This Week` aggregate windows
- Dashboard recent-entry time ranges
- Projects task updated metadata
- Profile GitHub `connectedAt` and `updatedAt` labels

### API and storage remain absolute

The frontend continues to submit ISO datetime strings for `startedAt`, `endedAt`, `dateFrom`, and `dateTo`. Backend filtering semantics remain closed-open and absolute:

- `dateFrom` is inclusive
- `dateTo` is exclusive

This avoids adding timezone fields to request contracts and keeps database `timestamptz` behavior unchanged.

### Workspace timezone remains separate

Workspace timezone is not the display source for member-facing user-web pages in this change. Existing workspace timezone behavior remains scoped to admin/workspace/reporting calendar interpretation.

### Shared helpers expose explicit semantics

Shared frontend date-time helpers should support clearly named UTC and browser-local primitives. User-web member-facing surfaces consume browser-local helpers for display and local calendar windows, while admin/report and backend paths keep their documented UTC or report-specific local behavior.

## Non-Goals

- No persisted per-user timezone setting.
- No workspace-settings API or permission change.
- No backend filtering or timestamp storage change.
- No visual redesign of affected pages.
- No admin/reporting calendar semantic change.
