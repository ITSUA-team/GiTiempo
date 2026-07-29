/**
 * Resolves where the login extension callout sends the user.
 *
 * Returns null when no install page is configured or the value is not an
 * absolute http(s) address, so callers hide the callout rather than render a
 * link that goes nowhere.
 */
export function getExtensionInstallHref(
  configuredUrl?: string,
): string | null {
  const trimmed = configuredUrl?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    // The install page lives on someone else's site, so only an absolute
    // http(s) URL counts. Resolving anything else against our own origin would
    // produce a same-origin link that goes nowhere.
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
