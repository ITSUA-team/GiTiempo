import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { FIREBASE_ADMIN } from '../src/auth/services/firebase-admin.interface';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import { invites, workspaces } from '../src/db/schema';
import { InviteDeliveryService } from '../src/invites/services/invite-delivery.service';
import { bearer, login } from './helpers/auth';

interface AppContext {
  app: INestApplication;
  db: DrizzleDB;
  adminToken: string;
  workspaceId: string;
}

async function createApp(options?: {
  deliveryError?: Error;
  firebaseProvisioningError?: Error;
}): Promise<AppContext> {
  let builder: TestingModuleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  builder = builder.overrideProvider(InviteDeliveryService).useValue({
    deliver: options?.deliveryError
      ? vi.fn().mockRejectedValue(options.deliveryError)
      : vi.fn().mockResolvedValue(undefined),
  });

  if (options?.firebaseProvisioningError) {
    builder = builder.overrideProvider(FIREBASE_ADMIN).useValue({
      verifyIdToken: vi.fn(),
      getOrCreateInvitedUserByEmail: vi
        .fn()
        .mockRejectedValue(options.firebaseProvisioningError),
      generatePasswordSetupLink: vi.fn(),
    });
  }

  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication();
  await app.init();

  const db = app.get<DrizzleDB>(DRIZZLE);
  const tokens = await login(app);
  const [workspace] = await db.select().from(workspaces).limit(1);

  if (!workspace) throw new Error('Expected seeded workspace');

  return {
    app,
    db,
    adminToken: tokens.accessToken,
    workspaceId: workspace.id,
  };
}

describe('Invite create failure compensation (e2e)', () => {
  const apps: INestApplication[] = [];

  afterEach(async () => {
    while (apps.length > 0) {
      await apps.pop()!.close();
    }
  });

  it('expires a failed invite and allows retry with a fresh pending invite', async () => {
    const email = `delivery-failure-${randomUUID()}@example.com`;
    const failed = await createApp({ deliveryError: new Error('SMTP failed') });
    apps.push(failed.app);

    const failedResponse = await request(failed.app.getHttpServer())
      .post('/invites')
      .set('Authorization', bearer(failed.adminToken))
      .send({ email, role: 'member' });

    expect(failedResponse.status).toBe(500);

    const failedRows = await failed.db
      .select()
      .from(invites)
      .where(eq(invites.email, email));

    expect(failedRows).toHaveLength(1);
    expect(failedRows[0]?.status).toBe('expired');
    const failedToken = failedRows[0]!.token;

    const retried = await createApp();
    apps.push(retried.app);

    const retryResponse = await request(retried.app.getHttpServer())
      .post('/invites')
      .set('Authorization', bearer(retried.adminToken))
      .send({ email, role: 'member' });

    expect(retryResponse.status).toBe(201);

    const retriedRows = await retried.db
      .select()
      .from(invites)
      .where(eq(invites.email, email));

    expect(retriedRows).toHaveLength(2);
    expect(retriedRows.map((row) => row.status).sort()).toEqual([
      'expired',
      'pending',
    ]);
    expect(retriedRows.some((row) => row.token !== failedToken)).toBe(true);
  });
});
