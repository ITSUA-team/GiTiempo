import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module';
import { ReportsController } from './controllers/reports.controller';
import { ReportsService } from './services/reports.service';

@Module({
  imports: [MembersModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
