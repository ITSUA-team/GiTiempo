import { Module } from '@nestjs/common';
import { MembersController } from './controllers/members.controller';
import { MembersService } from './services/members.service';
import { WorkspaceAdminGuard } from './guards/workspace-admin.guard';

@Module({
  controllers: [MembersController],
  providers: [MembersService, WorkspaceAdminGuard],
  exports: [MembersService, WorkspaceAdminGuard],
})
export class MembersModule {}
