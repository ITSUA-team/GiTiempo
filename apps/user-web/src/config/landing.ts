/**
 * Section on the public landing that describes the Chrome extension. Kept here
 * so the "which section" decision has one call site, not one per view.
 */
const EXTENSION_SECTION_ANCHOR = "github-workflow";

/**
 * Resolves the landing destination for the login extension callout.
 *
 * Returns null when the landing is not configured or the value cannot be parsed,
 * so callers hide the callout rather than render a link that goes nowhere.
 */
export function getLandingExtensionHref(
  configuredUrl?: string,
): string | null {
  const trimmed = configuredUrl?.trim();

  if (!trimmed) {
    return null;
  }

  const base = typeof window === "undefined" ? undefined : window.location.origin;

  try {
    const url = base ? new URL(trimmed, base) : new URL(trimmed);

    url.hash = EXTENSION_SECTION_ANCHOR;

    return url.toString();
  } catch {
    return null;
  }
}
