import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  projectExternalRefs,
  projectAssignments,
  projects,
  tasks,
  timeEntries,
  users,
  workspaceGitHubInstallations,
  workspaceGitHubOrganizations,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import { bearer, login } from './helpers/auth';

const organization = {
  appId: '5074370',
  installationId: '170958670',
  login: 'ITSUA-team',
  normalizedLogin: 'itsua-team',
  organizationId: '178578840',
};
const repository = 'ITSUA-team/GiTiempo';
const issueNumber = 439;

async function run(): Promise<void> {
  let app: INestApplication | undefined;
  let db: DrizzleDB | undefined;
  let workspaceId: string | undefined;
  let userId: string | undefined;

  try {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    const database = app.get<DrizzleDB>(DRIZZLE);
    db = database;

    const suffix = randomUUID();
    const [workspace] = await database
      .insert(workspaces)
      .values({ name: `Real GitHub provider QA ${suffix}` })
      .returning({ id: workspaces.id });
    if (!workspace) throw new Error('Failed to create QA workspace');
    workspaceId = workspace.id;

    const uid = `real-github-provider-qa-${suffix}`;
    const email = `${uid}@example.test`;
    const [user] = await database
      .insert(users)
      .values({
        firebaseUid: uid,
        email,
        displayName: 'Real GitHub provider QA',
      })
      .returning({ id: users.id });
    if (!user) throw new Error('Failed to create QA user');
    userId = user.id;
    await database
      .insert(workspaceMembers)
      .values({ workspaceId, userId, role: 'member' });
    await database.insert(workspaceGitHubOrganizations).values({
      workspaceId,
      organizationLogin: organization.login,
      normalizedLogin: organization.normalizedLogin,
      createdByUserId: userId,
    });
    await database.insert(workspaceGitHubInstallations).values({
      workspaceId,
      organizationId: organization.organizationId,
      organizationLogin: organization.login,
      normalizedOrganizationLogin: organization.normalizedLogin,
      installationId: organization.installationId,
      appId: organization.appId,
      status: 'verified',
      authorizationVersion: 15,
      verifiedAt: new Date(),
      verifiedByUserId: userId,
    });
    const [project] = await database
      .insert(projects)
      .values({
        workspaceId,
        name: `Managed provider QA ${suffix}`,
        visibility: 'private',
      })
      .returning({ id: projects.id });
    if (!project) throw new Error('Failed to create QA project');
    await database.insert(projectExternalRefs).values({
      workspaceId,
      projectId: project.id,
      provider: 'github',
      externalType: 'repository',
      externalKey: repository,
      externalUrl: `https://github.com/${repository}`,
      referenceProvenance: 'provider-verified',
      syncedAt: new Date(),
    });
    await database.insert(projectAssignments).values({
      workspaceId,
      projectId: project.id,
      userId,
      assignedBy: userId,
    });

    const token = (
      await login(app, `test:${uid}:${email}:Real GitHub provider QA`)
    ).accessToken;
    const started = await request(app.getHttpServer())
      .post('/time-entries/timer/start-from-github-reference')
      .set('Authorization', bearer(token))
      .send({
        githubRepo: repository,
        issueNumber,
        issueTitle: 'Read-only GitHub provider QA',
        issueUrl: `https://github.com/${repository}/issues/${issueNumber}`,
      });
    if (started.status !== 201) {
      throw new Error(
        `Expected managed timer start to succeed, got ${started.status}: ${JSON.stringify(started.body)}`,
      );
    }
    const stopped = await request(app.getHttpServer())
      .post('/time-entries/timer/stop')
      .set('Authorization', bearer(token))
      .send({ expectedTimerId: started.body.id });
    if (stopped.status !== 200) {
      throw new Error(`Expected timer stop to succeed, got ${stopped.status}`);
    }
    process.stdout.write(
      `${JSON.stringify({
        issueNumber,
        projectId: started.body.projectId,
        source: started.body.source,
        startStatus: started.status,
        stopStatus: stopped.status,
      })}\n`,
    );
  } finally {
    if (db && workspaceId) {
      await db
        .delete(timeEntries)
        .where(eq(timeEntries.workspaceId, workspaceId));
      await db.delete(tasks).where(eq(tasks.workspaceId, workspaceId));
      await db.delete(projects).where(eq(projects.workspaceId, workspaceId));
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    }
    if (db && userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
    await app?.close();
  }
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
