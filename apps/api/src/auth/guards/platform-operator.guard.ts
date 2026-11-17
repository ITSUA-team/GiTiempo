import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../../config/env.validation';
import type { AuthUser } from '../types/auth-user';

/**
 * Gates the platform-operator surface. Roles are workspace-scoped, so a
 * platform operator is a user ID from the `PLATFORM_OPERATOR_USER_IDS`
 * allowlist matched against the subject authenticated by `JwtAuthGuard`.
 */
@Injectable()
export class PlatformOperatorGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (!req.user) throw new UnauthorizedException('Unauthorized');

    const allowed = this.config.get('PLATFORM_OPERATOR_USER_IDS', {
      infer: true,
    });
    if (!allowed.includes(req.user.sub)) {
      throw new ForbiddenException('Forbidden');
    }
    return true;
  }
}
