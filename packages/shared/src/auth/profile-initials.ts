/**
 * Initials for a profile avatar, shared so the SPA headers and the Chrome
 * extension popup label the same person identically.
 *
 * Callers pick the source label (display name, email, a guest fallback) and the
 * fallback used when it yields no letters.
 */
export function deriveProfileInitials(source: string, fallback: string): string {
  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || fallback
  );
}
