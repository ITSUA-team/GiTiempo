import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray, like } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GithubService } from '../src/github/services/github.service';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  projectExternalRefs,
  projects,
  users,
  workspaceGitHubOrganizations,
} from '../src/db/schema';
import { bearer, login } from './helpers/auth';
import { getSeededAdminWorkspace } from './helpers/seeded-workspace';

const ORGANIZATION = 'gitiempo-import-test';
const UNVERIFIABLE_OWNER = 'not-approved-org';

/**
 * Stands in for the GitHub lookup the import now performs. Boards register the
 * provenance the server would read, so a test can only influence the stored
 * project through what GitHub reports, exactly as the endpoint does.
 */
const boardProvenance = new Map<
  string,
  { number: number; ownerLogin: string; title: string; url: string | null }
>();

const githubService = {
  getRepository: (_user: unknown, owner: string, repo: string) =>
    Promise.resolve({ fullName: `${owner}/${repo}` }),
  resolveImportableProject: (_user: unknown, githubProjectId: string) => {
    const known = boardProvenance.get(githubProjectId);

    if (!known || known.ownerLogin === UNVERIFIABLE_OWNER) {
      return Promise.reject(
        new NotFoundException(
          'GitHub project could not be verified for this workspace',
        ),
      );
    }

    return Promise.resolve(known);
  },
};

describe('Project imports (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let adminToken: string;
  let workspaceId: string;

  function board(
    overrides: {
      defaultBillableForTasks?: boolean;
      githubRepos?: string[];
      owner?: string;
      title?: string;
      visibility?: string;
    } = {},
  ) {
    const suffix = randomUUID().slice(0, 8);
    const githubProjectId = `PVT_import_${suffix}`;
    const { owner, title, ...payload } = overrides;

    boardProvenance.set(githubProjectId, {
      number: 9,
      ownerLogin: owner ?? ORGANIZATION,
      title: title ?? `Board ${suffix}`,
      url: `https://github.com/orgs/${owner ?? ORGANIZATION}/projects/9`,
    });

    return { githubProjectId, githubRepos: [], ...payload };
  }

  async function importBoards(
    githubProjects: Record<string, unknown>[],
    token = adminToken,
  ) {
    return request(app.getHttpServer())
      .post('/projects/import/github-projects')
      .set('Authorization', bearer(token))
      .send({ githubProjects });
  }

  async function readProject(projectId: string) {
    const [row] = await db
      .select({
        defaultBillableForTasks: projects.defaultBillableForTasks,
        name: projects.name,
        visibility: projects.visibility,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    return row;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GithubService)
      .useValue(githubService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);

    const { workspace } = await getSeededAdminWorkspace(db);
    workspaceId = workspace.id;

    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.firebaseUid, 'seed-user-1'))
      .limit(1);
    if (!admin) throw new Error('Expected the seeded admin');

    await db
      .delete(workspaceGitHubOrganizations)
      .where(eq(workspaceGitHubOrganizations.normalizedLogin, ORGANIZATION));
    await db.insert(workspaceGitHubOrganizations).values({
      workspaceId,
      organizationLogin: ORGANIZATION,
      normalizedLogin: ORGANIZATION,
      createdByUserId: admin.id,
    });

    adminToken = (await login(app)).accessToken;
  });

  afterEach(async () => {
    const imported = await db
      .select({ id: projects.id })
      .from(projects)
      .where(like(projects.name, `${ORGANIZATION}/%`));

    if (imported.length === 0) {
      return;
    }

    const ids = imported.map((row) => row.id);
    await db
      .delete(projectExternalRefs)
      .where(inArray(projectExternalRefs.projectId, ids));
    await db.delete(projects).where(inArray(projects.id, ids));
  });

  afterAll(async () => {
    await db
      .delete(workspaceGitHubOrganizations)
      .where(eq(workspaceGitHubOrganizations.normalizedLogin, ORGANIZATION));
    await app.close();
  });

  it('stores the visibility and billable default the caller chose', async () => {
    const response = await importBoards([
      board({ defaultBillableForTasks: false, visibility: 'public' }),
    ]);

    expect(response.status).toBe(200);
    const result = response.body.results[0];
    expect(result.status).toBe('imported');

    const stored = await readProject(result.projectId);
    expect(stored?.visibility).toBe('public');
    expect(stored?.defaultBillableForTasks).toBe(false);
  });

  it('falls back to the column defaults when neither is sent', async () => {
    const response = await importBoards([board()]);

    expect(response.status).toBe(200);
    const stored = await readProject(response.body.results[0].projectId);

    expect(stored?.visibility).toBe('private');
    expect(stored?.defaultBillableForTasks).toBe(true);
  });

  it('names the project after the organization and the board', async () => {
    const imported = board({ title: 'Krvn' });
    const response = await importBoards([imported]);
    const stored = await readProject(response.body.results[0].projectId);

    expect(stored?.name).toBe(`${ORGANIZATION}/Krvn`);
  });

  it('refuses a visibility the projects table cannot store', async () => {
    const response = await importBoards([board({ visibility: 'internal' })]);

    expect(response.status).toBe(400);
  });

  it('reports a board it cannot verify without aborting the batch', async () => {
    const allowed = board();
    const response = await importBoards([
      board({ owner: UNVERIFIABLE_OWNER }),
      allowed,
    ]);

    expect(response.status).toBe(200);
    expect(response.body.results[0].status).toBe('failed');
    expect(response.body.results[0].projectId).toBeNull();
    expect(response.body.results[1].status).toBe('imported');
  });

  it('does not modify a project that is already imported', async () => {
    const imported = board({ visibility: 'public' });
    const first = await importBoards([imported]);
    const projectId = first.body.results[0].projectId;

    const second = await importBoards([{ ...imported, visibility: 'private' }]);

    expect(second.body.results[0].status).toBe('already-imported');
    expect(second.body.results[0].projectId).toBe(projectId);
    expect((await readProject(projectId))?.visibility).toBe('public');
  });
});
