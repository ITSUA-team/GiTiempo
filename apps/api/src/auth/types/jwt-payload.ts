/**
 * Shape of the HS256 access token payload issued by `TokenService`.
 *
 * Intentionally minimal in this change (see design decision D3):
 * - `sub`  — local `users.id` (UUID)
 * - `email` — local user email (convenience)
 * - `firebaseUid` — identity provider subject, kept for audit
 * - `iss` / `aud` — verified on every request
 */
export interface JwtPayload {
  sub: string;
  email: string;
  firebaseUid: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}
