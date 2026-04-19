import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CommonsController } from './controllers/commons.controller';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

@Module({
  controllers: [CommonsController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class CommonsModule {}
