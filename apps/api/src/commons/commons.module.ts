import { Module } from '@nestjs/common';
import { CommonsController } from './controllers/commons.controller';

@Module({
  controllers: [CommonsController],
})
export class CommonsModule {}
