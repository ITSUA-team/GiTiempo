import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../../auth/types/auth-user';
import { MembersService } from '../services/members.service';

@Injectable()
export class WorkspaceAdminGuard implements CanActivate {
  constructor(private readonly members: MembersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (!req.user) throw new UnauthorizedException('Unauthorized');

    await this.members.requireAdmin(req.user.sub, req.user.workspaceId);
    return true;
  }
}
