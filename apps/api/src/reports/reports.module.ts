import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module';
import { ReportsController } from './controllers/reports.controller';
import { SavedReportsController } from './controllers/saved-reports.controller';
import { ReportsService } from './services/reports.service';
import { SavedReportsService } from './services/saved-reports.service';

@Module({
  imports: [MembersModule],
  controllers: [ReportsController, SavedReportsController],
  providers: [ReportsService, SavedReportsService],
})
export class ReportsModule {}
