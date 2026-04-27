/**
 * Authenticated subject mapped onto `req.user` by `JwtAuthGuard`.
 *
 * Consumed by controllers via `@CurrentUser()` / `@CurrentUser('sub')`.
 * Keep in sync with the claims emitted by `TokenService.signAccess`.
 */
export interface AuthUser {
  sub: string;
  email: string;
  firebaseUid: string;
  workspaceId: string;
  role: 'admin' | 'pm' | 'member';
}
