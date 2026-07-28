/**
 * Ordering check shared by every {dateFrom, dateTo} range in the contracts.
 * Absent ends pass, so it composes with the optional filter windows on the
 * report and time-entry list queries. `inclusive` is the one axis that differs
 * between callers and the single place the `>` vs `>=` decision is made: a
 * filter window rejects a zero-width range (dateTo strictly after dateFrom),
 * while a saved report's stored window may be a single day (dateTo equal to
 * dateFrom).
 */
export function isOrderedDateRange(
  range: { dateFrom?: string; dateTo?: string },
  options: { inclusive?: boolean } = {},
): boolean {
  if (range.dateFrom === undefined || range.dateTo === undefined) return true;
  const from = new Date(range.dateFrom).getTime();
  const to = new Date(range.dateTo).getTime();
  return options.inclusive ? to >= from : to > from;
}
