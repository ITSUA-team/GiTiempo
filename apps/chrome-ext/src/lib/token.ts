/**
 * Reads display-only claims out of the extension's own access token.
 *
 * The token is already trusted (the API issued it and we store it), so we only
 * base64url-decode the payload to surface the signed-in user for the popup
 * header. Anything malformed yields null and the caller degrades gracefully.
 */
function decodeAccessTokenPayload(
  accessToken: string,
): Record<string, unknown> | null {
  const segment = accessToken.split(".")[1];

  if (!segment) {
    return null;
  }

  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const parsed: unknown = JSON.parse(atob(padded));

    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function decodeAccessTokenEmail(accessToken: string): string | null {
  const email = decodeAccessTokenPayload(accessToken)?.email;

  return typeof email === "string" && email.trim().length > 0
    ? email.trim()
    : null;
}
