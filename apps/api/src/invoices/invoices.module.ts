import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module';
import { InvoicesController } from './controllers/invoices.controller';
import { InvoicesService } from './services/invoices.service';

@Module({
  imports: [MembersModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
