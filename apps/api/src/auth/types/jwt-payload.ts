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
