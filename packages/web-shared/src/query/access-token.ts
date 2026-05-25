export function requireAccessToken(accessToken: string | null | undefined): string {
  if (!accessToken) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return accessToken;
}
