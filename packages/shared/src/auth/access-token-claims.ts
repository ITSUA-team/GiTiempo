/**
 * Display-only reads of the access token issued by the API (`JwtPayload` in
 * `apps/api/src/auth/types/jwt-payload.ts`).
 *
 * The token is already trusted — the API issued it and the client stored it —
 * so the payload is only base64url-decoded, never verified here. Anything
 * malformed yields null so callers degrade gracefully. Lives in `shared` so the
 * SPAs and the Chrome extension decode claims the same way.
 */
export type AccessTokenPayload = Record<string, unknown>;

export function readAccessTokenPayload(
  accessToken: string | null | undefined,
): AccessTokenPayload | null {
  const payload = accessToken?.split(".")[1];

  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const parsed: unknown = JSON.parse(globalThis.atob(padded));

    return parsed && typeof parsed === "object"
      ? (parsed as AccessTokenPayload)
      : null;
  } catch {
    return null;
  }
}

export function readAccessTokenStringClaim(
  payload: AccessTokenPayload,
  claim: string,
): string | null {
  const value = payload[claim];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}
