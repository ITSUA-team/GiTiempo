/**
 * Formats a fractional-hours value into a human-readable string.
 *
 * Examples:
 *   0     → "0h"
 *   1.5   → "1h 30m"
 *   2     → "2h"
 *   0.25  → "0h 15m"
 */
export function formatHours(hours: number): string {
  if (hours === 0) return '0h';
  const h = Math.floor(hours);
  const m = Math.round((hours % 1) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
