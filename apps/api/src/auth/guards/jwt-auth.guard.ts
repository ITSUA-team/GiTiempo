import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SKIP_AUTH_KEY } from '../decorators/skip-auth.decorator';
import { TokenService } from '../services/token.service';
import type { AuthUser } from '../types/auth-user';

/**
 * Global bearer-token guard. Registered via `APP_GUARD` in `AuthModule`.
 *
 * - Bypasses verification when `@SkipAuth()` is present on the handler or
 *   controller class.
 * - Extracts the `Authorization: Bearer <token>` header and delegates
 *   signature + `iss` + `aud` + `exp` validation to `TokenService`.
 * - On success, populates `req.user` with an `AuthUser`.
 * - On any failure, throws `UnauthorizedException` with a generic
 *   message (no leak of which check failed).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const token = this.extractBearerToken(req);
    if (!token) throw new UnauthorizedException('Unauthorized');

    try {
      const payload = this.tokenService.verifyAccess(token);
      req.user = {
        sub: payload.sub,
        email: payload.email,
        firebaseUid: payload.firebaseUid,
        workspaceId: payload.workspaceId,
        role: payload.role,
      };
      return true;
    } catch (err) {
      // Do not leak which check failed; debug-level trace is enough.
      this.logger.debug(
        `Access token verification failed: ${
          err instanceof Error ? err.name : 'unknown'
        }`,
      );
      throw new UnauthorizedException('Unauthorized');
    }
  }

  private extractBearerToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header || typeof header !== 'string') return null;
    const [scheme, value] = header.split(' ');
    if (!scheme || scheme.toLowerCase() !== 'bearer') return null;
    if (!value) return null;
    return value.trim();
  }
}
