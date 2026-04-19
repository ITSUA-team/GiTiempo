import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { LoggerModuleConfig } from './config/logger.config';
import { DbModule } from './db/db.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CommonsModule } from './commons/commons.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    LoggerModuleConfig,
    DbModule,
    UsersModule,
    AuthModule,
    CommonsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
