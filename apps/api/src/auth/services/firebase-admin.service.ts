import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Env } from '../../config/env.validation';
import type {
  DecodedFirebaseToken,
  FirebaseAdminService,
} from './firebase-admin.interface';

const APP_NAME = 'gitiempo-api';

/**
 * Production Firebase Admin provider. Lazily initializes a single app
 * instance and verifies ID tokens with `checkRevoked = true`.
 *
 * Any verification failure is translated to `UnauthorizedException`
 * with a generic message so callers cannot leak internal details.
 */
@Injectable()
export class RealFirebaseAdminService implements FirebaseAdminService {
  private app: App | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async verifyIdToken(idToken: string): Promise<DecodedFirebaseToken> {
    const app = this.getApp();
    try {
      const decoded = await getAuth(app).verifyIdToken(idToken, true);
      return {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        email_verified: decoded.email_verified,
      };
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }

  private getApp(): App {
    if (this.app) return this.app;
    const existing = getApps().find((a) => a.name === APP_NAME);
    if (existing) {
      this.app = existing;
      return existing;
    }
    const projectId = this.config.get('FIREBASE_PROJECT_ID', { infer: true });
    const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL', {
      infer: true,
    });
    const privateKey = this.config.get('FIREBASE_PRIVATE_KEY', {
      infer: true,
    });
    if (!projectId || !clientEmail || !privateKey) {
      // Env validation guarantees these in non-test envs, but guard just
      // in case this provider is accidentally instantiated in test mode.
      throw new Error(
        'Firebase Admin credentials are not configured. ' +
          'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
      );
    }
    this.app = initializeApp(
      {
        credential: cert({ projectId, clientEmail, privateKey }),
      },
      APP_NAME,
    );
    return this.app;
  }
}
