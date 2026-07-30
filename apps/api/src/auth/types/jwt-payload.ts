import type { WorkspaceRole } from '@gitiempo/shared';

/**
 * Shape of the HS256 access token payload issued by `TokenService`.
 *
 * Intentionally minimal in this change (see design decision D3):
 * - `sub`  — local `users.id` (UUID)
 * - `email` — local user email (convenience)
 * - `firebaseUid` — identity provider subject, kept for audit
 * - `workspaceId` / `role` — workspace session context
 * - `iss` / `aud` — verified on every request
 *
 * Clients also decode this payload for display and cache scoping, through
 * `readAccessTokenPayload` in `packages/shared`: the SPAs read `sub`,
 * `workspaceId`, and `role`, and the Chrome extension popup reads `email`.
 * Those readers degrade silently when a claim disappears, so rename or drop
 * one only together with them.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  firebaseUid: string;
  workspaceId: string;
  role: WorkspaceRole;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}
