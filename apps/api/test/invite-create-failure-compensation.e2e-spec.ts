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
import { invites } from '../src/db/schema';
import { InviteDeliveryService } from '../src/invites/services/invite-delivery.service';
import { bearer, login } from './helpers/auth';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';

interface AppContext {
  app: INestApplication;
  db: DrizzleDB;
  adminToken: string;
  workspaceId: string;
  delivery: { deliver: ReturnType<typeof vi.fn> };
}

async function createApp(options?: {
  deliveryError?: Error;
  firebaseProvisioningError?: Error;
  firebasePasswordSetupLinkError?: Error;
}): Promise<AppContext> {
  let builder: TestingModuleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  const delivery = {
    deliver: options?.deliveryError
      ? vi.fn().mockRejectedValue(options.deliveryError)
      : vi.fn().mockResolvedValue(undefined),
  };
  builder = builder.overrideProvider(InviteDeliveryService).useValue({
    deliver: delivery.deliver,
  });

  const firebase = {
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: 'admin-uid',
      email: 'admin@example.com',
      name: 'Admin',
      email_verified: true,
    }),
    getOrCreateInvitedUserByEmail: options?.firebaseProvisioningError
      ? vi.fn().mockRejectedValue(options.firebaseProvisioningError)
      : vi.fn().mockResolvedValue({
          uid: 'firebase-invitee',
          email: 'invitee@example.com',
          isExistingUser: false,
        }),
    generatePasswordSetupLink: options?.firebasePasswordSetupLinkError
      ? vi.fn().mockRejectedValue(options.firebasePasswordSetupLinkError)
      : vi.fn().mockResolvedValue('https://firebase.test/reset'),
  };

  builder = builder.overrideProvider(FIREBASE_ADMIN).useValue(firebase);

  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication();
  await app.init();

  const db = app.get<DrizzleDB>(DRIZZLE);
  const tokens = await login(app);
  const { workspace } = await getSeededAdminWorkspace(db);

  return {
    app,
    db,
    adminToken: tokens.accessToken,
    workspaceId: workspace.id,
    delivery,
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
    expect(failed.delivery.deliver).toHaveBeenCalledTimes(1);

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
    const pendingRow = retriedRows.find((row) => row.status === 'pending');
    expect(pendingRow?.token).not.toBe(failedToken);
  });

  it('expires a failed invite when Firebase provisioning fails and allows retry', async () => {
    const email = `firebase-provisioning-failure-${randomUUID()}@example.com`;
    const failed = await createApp({
      firebaseProvisioningError: new Error(
        'Failed to provision invited Firebase user',
      ),
    });
    apps.push(failed.app);

    const failedResponse = await request(failed.app.getHttpServer())
      .post('/invites')
      .set('Authorization', bearer(failed.adminToken))
      .send({ email, role: 'member' });

    expect(failedResponse.status).toBe(500);
    expect(failed.delivery.deliver).not.toHaveBeenCalled();

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
    expect(retried.delivery.deliver).toHaveBeenCalledTimes(1);

    const retriedRows = await retried.db
      .select()
      .from(invites)
      .where(eq(invites.email, email));

    expect(retriedRows).toHaveLength(2);
    expect(retriedRows.map((row) => row.status).sort()).toEqual([
      'expired',
      'pending',
    ]);
    const pendingRow = retriedRows.find((row) => row.status === 'pending');
    expect(pendingRow?.token).not.toBe(failedToken);
  });

  it('expires a failed invite when password setup link generation fails and allows retry', async () => {
    const email = `firebase-link-failure-${randomUUID()}@example.com`;
    const failed = await createApp({
      firebasePasswordSetupLinkError: new Error(
        'Failed to generate Firebase password setup link',
      ),
    });
    apps.push(failed.app);

    const failedResponse = await request(failed.app.getHttpServer())
      .post('/invites')
      .set('Authorization', bearer(failed.adminToken))
      .send({ email, role: 'member' });

    expect(failedResponse.status).toBe(500);
    expect(failed.delivery.deliver).not.toHaveBeenCalled();

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
    expect(retried.delivery.deliver).toHaveBeenCalledTimes(1);

    const retriedRows = await retried.db
      .select()
      .from(invites)
      .where(eq(invites.email, email));

    expect(retriedRows).toHaveLength(2);
    expect(retriedRows.map((row) => row.status).sort()).toEqual([
      'expired',
      'pending',
    ]);
    const pendingRow = retriedRows.find((row) => row.status === 'pending');
    expect(pendingRow?.token).not.toBe(failedToken);
  });
});
