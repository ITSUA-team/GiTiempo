import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE, Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { validate } from './config/env.validation';
import type { Env } from './config/env.validation';
import { LoggerModuleConfig } from './config/logger.config';
import { DbModule } from './db/db.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CommonsModule } from './commons/commons.module';
import { MembersModule } from './members/members.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { InvitesModule } from './invites/invites.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    LoggerModuleConfig,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
            limit: config.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
      }),
    }),
    DbModule,
    MembersModule,
    UsersModule,
    AuthModule,
    WorkspacesModule,
    InvitesModule,
    ProjectsModule,
    TasksModule,
    CommonsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_GUARD,
      inject: ['THROTTLER:MODULE_OPTIONS', ThrottlerStorage, Reflector],
      useFactory: (
        options: ConstructorParameters<typeof ThrottlerGuard>[0],
        storage: ThrottlerStorage,
        reflector: Reflector,
      ) => new ThrottlerGuard(options, storage, reflector),
    },
  ],
})
export class AppModule {}
