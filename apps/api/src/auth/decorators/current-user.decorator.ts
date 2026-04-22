import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../types/auth-user';

/**
 * Param decorator that returns the authenticated subject populated by
 * `JwtAuthGuard`.
 *
 * Usage:
 *   `@CurrentUser()`         — full `AuthUser`
 *   `@CurrentUser('sub')`    — single field (`string`)
 *
 * Handlers that read this decorator must run behind the global auth
 * guard (they should NOT be marked `@SkipAuth()`), otherwise `req.user`
 * is undefined.
 */
export const CurrentUser = createParamDecorator(
  (
    key: keyof AuthUser | undefined,
    ctx: ExecutionContext,
  ): AuthUser | string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    if (!user) return undefined;
    return key ? user[key] : user;
  },
);
