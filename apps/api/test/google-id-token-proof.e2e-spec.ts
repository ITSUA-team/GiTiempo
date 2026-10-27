import { UnauthorizedException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/services/auth.service';
import type { DecodedFirebaseToken } from '../src/auth/services/firebase-admin.interface';
import { FIREBASE_ADMIN } from '../src/auth/services/firebase-admin.interface';
import type { FakeFirebaseAdminService } from '../src/auth/services/firebase-admin.fake';
import { GoogleIdTokenVerifier } from '../src/auth/services/google-id-token-verifier.service';
import { TokenService } from '../src/auth/services/token.service';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  firebaseIdentityReservations,
  firebaseSubjectBindings,
  invites,
  refreshTokens,
  users,
  workspaceMembers,
  workspaceSettings,
  workspaces,
} from '../src/db/schema';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';

type GoogleProof = { email: string; subject: string };

let requestCounter = 1;

function googleAliasToken(firebaseUid: string, email: string): string {
  return `test:${firebaseUid}:${email}:Google Alias:provider=google.com`;
}

describe('Google ID-token login proof (e2e)', () => {
  let app: INestApplication;
  let auth: AuthService;
  let db: DrizzleDB;
  let firebase: FakeFirebaseAdminService;
  let tokens: TokenService;
  const verifier = { verify: vi.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleIdTokenVerifier)
      .useValue(verifier)
      .compile();
    app = module.createNestApplication();
    app.getHttpAdapter().getInstance().set('trust proxy', true);
    await app.init();
    auth = app.get(AuthService);
    db = app.get<DrizzleDB>(DRIZZLE);
    firebase = app.get(FIREBASE_ADMIN);
    tokens = app.get(TokenService);
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    verifier.verify.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createGithubFoundation() {
    const suffix = randomUUID();
    const email = `google-proof-${suffix}@example.test`;
    const firebaseUid = `github-foundation-${suffix}`;
    await firebase.createEmailPasswordUser({
      uid: firebaseUid,
      email,
      password: 'password123',
      displayName: 'GitHub Foundation',
    });
    const pair = await auth.provisionSocialSession({
      email,
      firebaseUid,
      name: 'GitHub Foundation',
      provider: 'github',
      verifiedEmails: [email],
    });
    const claims = tokens.verifyAccess(pair.accessToken);

    return {
      email,
      firebaseUid,
      userId: claims.sub,
      workspaceId: claims.workspaceId,
    };
  }

  function installMissingEmailGoogleAlias(
    token: string,
    googleSubjects: string[],
  ): void {
    const originalVerify = firebase.verifyIdToken.bind(firebase);
    vi.spyOn(firebase, 'verifyIdToken').mockImplementation(async (idToken) => {
      const decoded = await originalVerify(idToken);
      if (idToken !== token) return decoded;

      return {
        ...decoded,
        email: undefined,
        email_verified: false,
        googleSubjects,
        signInProvider: 'google.com',
      } satisfies DecodedFirebaseToken;
    });
  }

  async function cleanFoundation(input: {
    firebaseUid: string;
    userId: string;
    workspaceId: string;
  }): Promise<void> {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, input.userId));
    await db
      .delete(firebaseSubjectBindings)
      .where(eq(firebaseSubjectBindings.userId, input.userId));
    await db
      .delete(firebaseIdentityReservations)
      .where(
        and(
          eq(firebaseIdentityReservations.firebaseUid, input.firebaseUid),
          eq(firebaseIdentityReservations.userId, input.userId),
        ),
      );
    await db
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.userId, input.userId));
    await db
      .delete(workspaceSettings)
      .where(eq(workspaceSettings.workspaceId, input.workspaceId));
    await db.delete(workspaces).where(eq(workspaces.id, input.workspaceId));
    await db.delete(users).where(eq(users.id, input.userId));
    await firebase.deleteUser(input.firebaseUid);
  }

  async function stateForUser(userId: string) {
    const [bindings, sessions, memberships] = await Promise.all([
      db
        .select({ firebaseUid: firebaseSubjectBindings.firebaseUid })
        .from(firebaseSubjectBindings)
        .where(eq(firebaseSubjectBindings.userId, userId)),
      db
        .select({ id: refreshTokens.id })
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, userId)),
      db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, userId)),
    ]);

    return {
      bindings: bindings.map((binding) => binding.firebaseUid).sort(),
      memberships: memberships.map((membership) => membership.id).sort(),
      sessions: sessions.map((session) => session.id).sort(),
    };
  }

  async function postLogin(firebaseIdToken: string, googleIdToken: string) {
    return request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', `10.476.0.${requestCounter++}`)
      .send({ firebaseIdToken, googleIdToken });
  }

  async function postInviteAcceptance(input: {
    firebaseIdToken: string;
    googleIdToken?: string;
    token: string;
  }) {
    return request(app.getHttpServer()).post('/invites/accept').send(input);
  }

  it('accepts an invite-first missing-email Google identity from its verified proof without creating a personal workspace', async () => {
    const { admin, workspace } = await getSeededAdminWorkspace(db);
    const email = `invite-google-proof-${randomUUID()}@example.test`;
    const firebaseUid = `invite-google-alias-${randomUUID()}`;
    const subject = `google-subject-${randomUUID()}`;
    const token = randomUUID();
    const firebaseIdToken = googleAliasToken(firebaseUid, email);
    const googleIdToken = `valid-proof-${randomUUID()}`;
    const [invite] = await db
      .insert(invites)
      .values({
        workspaceId: workspace.id,
        email,
        invitedBy: admin.id,
        role: 'member',
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
      })
      .returning();
    if (!invite) throw new Error('Expected invite fixture');

    try {
      await firebase.verifyIdToken(firebaseIdToken);
      installMissingEmailGoogleAlias(firebaseIdToken, [subject]);
      verifier.verify.mockResolvedValue({
        email,
        subject,
      } satisfies GoogleProof);
      const workspacesBefore = await db
        .select({ id: workspaces.id })
        .from(workspaces);

      const response = await postInviteAcceptance({
        firebaseIdToken,
        googleIdToken,
        token,
      });

      expect(response.status).toBe(204);
      const [acceptedInvite] = await db
        .select({ status: invites.status })
        .from(invites)
        .where(eq(invites.id, invite.id));
      expect(acceptedInvite?.status).toBe('accepted');
      const [invitee] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email));
      expect(invitee).toBeDefined();
      expect(
        await db
          .select({ workspaceId: workspaceMembers.workspaceId })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, invitee!.id)),
      ).toEqual([{ workspaceId: workspace.id }]);
      expect(await db.select({ id: workspaces.id }).from(workspaces)).toEqual(
        workspacesBefore,
      );
    } finally {
      const [invitee] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email));
      await db.delete(invites).where(eq(invites.id, invite.id));
      if (invitee) {
        await db
          .delete(firebaseSubjectBindings)
          .where(eq(firebaseSubjectBindings.userId, invitee.id));
        await db
          .delete(firebaseIdentityReservations)
          .where(eq(firebaseIdentityReservations.userId, invitee.id));
        await db
          .delete(workspaceMembers)
          .where(eq(workspaceMembers.userId, invitee.id));
        await db.delete(users).where(eq(users.id, invitee.id));
      }
    }
  });

  it('rejects a contradictory Google proof without accepting the invite or creating a user', async () => {
    const { admin, workspace } = await getSeededAdminWorkspace(db);
    const email = `invite-google-reject-${randomUUID()}@example.test`;
    const firebaseUid = `invite-google-alias-${randomUUID()}`;
    const token = randomUUID();
    const firebaseIdToken = googleAliasToken(firebaseUid, email);
    const [invite] = await db
      .insert(invites)
      .values({
        workspaceId: workspace.id,
        email,
        invitedBy: admin.id,
        role: 'member',
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
      })
      .returning();
    if (!invite) throw new Error('Expected invite fixture');

    try {
      await firebase.verifyIdToken(firebaseIdToken);
      installMissingEmailGoogleAlias(firebaseIdToken, ['firebase-subject']);
      verifier.verify.mockResolvedValue({
        email,
        subject: 'different-proof-subject',
      } satisfies GoogleProof);
      const workspacesBefore = await db
        .select({ id: workspaces.id })
        .from(workspaces);

      const response = await postInviteAcceptance({
        firebaseIdToken,
        googleIdToken: `contradictory-proof-${randomUUID()}`,
        token,
      });

      expect(response.status).toBe(401);
      expect(
        await db
          .select({ status: invites.status })
          .from(invites)
          .where(eq(invites.id, invite.id)),
      ).toEqual([{ status: 'pending' }]);
      expect(
        await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email)),
      ).toEqual([]);
      expect(await db.select({ id: workspaces.id }).from(workspaces)).toEqual(
        workspacesBefore,
      );
    } finally {
      await db.delete(invites).where(eq(invites.id, invite.id));
    }
  });

  it('accepts a team invite for a missing-email Google alias of an existing GitHub-founded user', async () => {
    const foundation = await createGithubFoundation();
    const { admin, workspace } = await getSeededAdminWorkspace(db);
    const aliasUid = `google-invite-alias-${randomUUID()}`;
    const subject = `google-subject-${randomUUID()}`;
    const token = randomUUID();
    const firebaseIdToken = googleAliasToken(aliasUid, foundation.email);
    const [invite] = await db
      .insert(invites)
      .values({
        workspaceId: workspace.id,
        email: foundation.email,
        invitedBy: admin.id,
        role: 'member',
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
      })
      .returning();
    if (!invite) throw new Error('Expected invite fixture');

    try {
      await firebase.verifyIdToken(firebaseIdToken);
      installMissingEmailGoogleAlias(firebaseIdToken, [subject]);
      verifier.verify.mockResolvedValue({
        email: foundation.email,
        subject,
      } satisfies GoogleProof);
      const workspacesBefore = await db
        .select({ id: workspaces.id })
        .from(workspaces);

      const response = await postInviteAcceptance({
        firebaseIdToken,
        googleIdToken: `valid-proof-${randomUUID()}`,
        token,
      });

      expect(response.status).toBe(204);
      expect(
        await db
          .select({ status: invites.status })
          .from(invites)
          .where(eq(invites.id, invite.id)),
      ).toEqual([{ status: 'accepted' }]);
      expect(
        await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, foundation.email)),
      ).toEqual([{ id: foundation.userId }]);
      expect(
        await db
          .select({ firebaseUid: firebaseSubjectBindings.firebaseUid })
          .from(firebaseSubjectBindings)
          .where(
            and(
              eq(firebaseSubjectBindings.firebaseUid, aliasUid),
              eq(firebaseSubjectBindings.userId, foundation.userId),
            ),
          ),
      ).toEqual([{ firebaseUid: aliasUid }]);
      expect(
        await db
          .select({ workspaceId: workspaceMembers.workspaceId })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, foundation.userId)),
      ).toEqual(
        expect.arrayContaining([
          { workspaceId: foundation.workspaceId },
          { workspaceId: workspace.id },
        ]),
      );
      expect(await db.select({ id: workspaces.id }).from(workspaces)).toEqual(
        workspacesBefore,
      );
    } finally {
      await db.delete(invites).where(eq(invites.id, invite.id));
      await db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.userId, foundation.userId),
            eq(workspaceMembers.workspaceId, workspace.id),
          ),
        );
      await db
        .delete(firebaseSubjectBindings)
        .where(eq(firebaseSubjectBindings.firebaseUid, aliasUid));
      await cleanFoundation(foundation);
    }
  });

  it('reuses the GitHub-founded user and workspace for a missing-email Google alias', async () => {
    const foundation = await createGithubFoundation();
    const aliasUid = `google-alias-${randomUUID()}`;
    const subject = `google-subject-${randomUUID()}`;
    const firebaseIdToken = googleAliasToken(aliasUid, foundation.email);
    const googleIdToken = `valid-proof-${randomUUID()}`;

    try {
      await firebase.verifyIdToken(firebaseIdToken);
      installMissingEmailGoogleAlias(firebaseIdToken, [subject]);
      verifier.verify.mockResolvedValue({
        email: foundation.email,
        subject,
      } satisfies GoogleProof);

      const response = await postLogin(firebaseIdToken, googleIdToken);

      expect(response.status).toBe(200);
      const claims = tokens.verifyAccess(response.body.accessToken as string);
      expect(claims).toMatchObject({
        sub: foundation.userId,
        workspaceId: foundation.workspaceId,
      });
      expect(
        await db
          .select()
          .from(firebaseSubjectBindings)
          .where(eq(firebaseSubjectBindings.firebaseUid, aliasUid)),
      ).toEqual([
        expect.objectContaining({
          providerId: 'google',
          userId: foundation.userId,
          verifiedEmail: foundation.email,
        }),
      ]);
      expect(
        await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, foundation.email)),
      ).toHaveLength(1);
    } finally {
      await cleanFoundation(foundation);
    }
  });

  it.each([
    {
      proofSubject: 'matching-subject',
      reason: 'a rejected Google proof',
      rejectProof: true,
      subjects: ['matching-subject'],
    },
    {
      proofSubject: 'different-subject',
      reason: 'a mismatched Firebase Google subject',
      rejectProof: false,
      subjects: ['matching-subject'],
    },
    {
      proofSubject: 'matching-subject',
      reason: 'ambiguous Firebase Google subjects',
      rejectProof: false,
      subjects: ['matching-subject', 'second-subject'],
    },
  ])(
    'rejects $reason without changing account state',
    async ({ proofSubject, rejectProof, subjects }) => {
      const foundation = await createGithubFoundation();
      const aliasUid = `google-alias-${randomUUID()}`;
      const firebaseIdToken = googleAliasToken(aliasUid, foundation.email);

      try {
        await firebase.verifyIdToken(firebaseIdToken);
        installMissingEmailGoogleAlias(firebaseIdToken, subjects);
        if (rejectProof) {
          verifier.verify.mockRejectedValue(
            new UnauthorizedException('Unauthorized'),
          );
        } else {
          verifier.verify.mockResolvedValue({
            email: foundation.email,
            subject: proofSubject,
          } satisfies GoogleProof);
        }
        const before = await stateForUser(foundation.userId);

        const response = await postLogin(
          firebaseIdToken,
          `proof-${randomUUID()}`,
        );

        expect(response.status).toBe(401);
        expect(await stateForUser(foundation.userId)).toEqual(before);
        expect(
          await db
            .select({ id: firebaseSubjectBindings.id })
            .from(firebaseSubjectBindings)
            .where(eq(firebaseSubjectBindings.firebaseUid, aliasUid)),
        ).toEqual([]);
      } finally {
        await cleanFoundation(foundation);
      }
    },
  );

  it.each(['disabled', 'deleted'] as const)(
    'rejects a %s live Firebase alias without changing account state',
    async (liveState) => {
      const foundation = await createGithubFoundation();
      const aliasUid = `google-alias-${randomUUID()}`;
      const subject = `google-subject-${randomUUID()}`;
      const firebaseIdToken = googleAliasToken(aliasUid, foundation.email);

      try {
        if (liveState === 'disabled') {
          await firebase.verifyIdToken(firebaseIdToken);
          firebase.setUserDisabled(aliasUid, true);
        } else {
          await firebase.createEmailPasswordUser({
            displayName: 'Deleted alias',
            email: `${aliasUid}@example.test`,
            password: 'password123',
            uid: aliasUid,
          });
          await firebase.deleteUser(aliasUid);
        }
        installMissingEmailGoogleAlias(firebaseIdToken, [subject]);
        verifier.verify.mockResolvedValue({ email: foundation.email, subject });
        const before = await stateForUser(foundation.userId);

        const response = await postLogin(
          firebaseIdToken,
          `proof-${randomUUID()}`,
        );

        expect(response.status).toBe(401);
        expect(await stateForUser(foundation.userId)).toEqual(before);
        expect(
          await db
            .select({ id: firebaseSubjectBindings.id })
            .from(firebaseSubjectBindings)
            .where(eq(firebaseSubjectBindings.firebaseUid, aliasUid)),
        ).toEqual([]);
      } finally {
        await cleanFoundation(foundation);
      }
    },
  );
});
