import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { MembersModule } from '../members/members.module';
import { UsersModule } from '../users/users.module';
import { AuthService } from './services/auth.service';
import { AuthGithubService } from './services/auth-github.service';
import { AuthController } from './controllers/auth.controller';
import { AuthGithubController } from './controllers/auth-github.controller';
import { TokenService } from './services/token.service';
import { RealFirebaseAdminService } from './services/firebase-admin.service';
import { FakeFirebaseAdminService } from './services/firebase-admin.fake';
import { FIREBASE_ADMIN } from './services/firebase-admin.interface';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Global auth wiring.
 *
 * `@Global()` so that `JwtAuthGuard` (bound via `APP_GUARD`) can resolve
 * `TokenService` from any module without each feature module having to
 * re-import `AuthModule`.
 *
 * `FIREBASE_ADMIN` is bound conditionally:
 *  - `NODE_ENV=test` → `FakeFirebaseAdminService` (no creds, deterministic
 *    tokens of the form `test:<uid>:<email>[:<name>]`)
 *  - otherwise       → real `firebase-admin` wrapper.
 */
@Global()
@Module({
  imports: [UsersModule, MembersModule],
  providers: [
    AuthService,
    AuthGithubService,
    TokenService,
    RefreshTokenRepository,
    {
      provide: FIREBASE_ADMIN,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const env = config.get('NODE_ENV', { infer: true });
        if (env === 'test') {
          return new FakeFirebaseAdminService();
        }
        return new RealFirebaseAdminService(config);
      },
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  controllers: [AuthController, AuthGithubController],
  exports: [TokenService, AuthService, FIREBASE_ADMIN],
})
export class AuthModule {}
