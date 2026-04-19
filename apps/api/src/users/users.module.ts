import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    // Enables `@ZodSerializerDto(...)` on controller methods to strip
    // any internal fields (e.g. `firebaseUid`) from the response.
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
