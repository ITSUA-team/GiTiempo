import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';
import { InvitesController } from './controllers/invites.controller';
import { InviteDeliveryService } from './services/invite-delivery.service';
import { InvitesService } from './services/invites.service';

@Module({
  imports: [AuthModule, MembersModule],
  controllers: [InvitesController],
  providers: [InvitesService, InviteDeliveryService],
})
export class InvitesModule {}
