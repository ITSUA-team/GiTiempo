import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectImportsService } from './project-imports.service';
import type { AuthUser } from '../../auth/types/auth-user';

const user = {
  sub: 'user-1',
  workspaceId: 'workspace-1',
} as AuthUser;

interface RecordedInsert {
  values: Record<string, unknown>;
}

interface DbStubOptions {
  tracking?: unknown[];
  repositoryRefWins?: boolean;
  reclaims?: boolean;
}

function createDbStub(
  inserts: RecordedInsert[],
  existing: unknown[] = [],
  options: DbStubOptions = {},
) {
  const { reclaims = false, repositoryRefWins = true, tracking = [] } = options;
  const deletedProjectIds: string[] = [];

  const tx = {
    delete: vi.fn(() => ({
      where: vi.fn(async () => {
        deletedProjectIds.push('project-1');
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserts.push({ values });

        const isRepositoryRef = values.externalType === 'repository';
        const conflict = {
          returning: vi.fn(async () =>
            isRepositoryRef && !repositoryRefWins
              ? []
              : [{ projectId: 'project-1' }],
          ),
          then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve(undefined).then(resolve),
        };

        return {
          onConflictDoNothing: vi.fn(() => conflict),
          returning: vi.fn(async () => [{ id: 'project-1' }]),
        };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () =>
            reclaims ? [{ projectId: 'project-1' }] : [],
          ),
        })),
      })),
    })),
  };

  const trackingChain = {
    where: vi.fn(() => ({
      orderBy: vi.fn(() => ({ limit: vi.fn(async () => tracking) })),
    })),
  };

  return {
    deletedProjectIds,
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => trackingChain),
        where: vi.fn(() => ({ limit: vi.fn(async () => existing) })),
      })),
    })),
    transaction: vi.fn(async (run: (executor: unknown) => Promise<unknown>) =>
      run(tx),
    ),
  };
}

describe('ProjectImportsService GitHub project import', () => {
  let inserts: RecordedInsert[];
  let members: { requireRole: ReturnType<typeof vi.fn> };
  let github: {
    getRepository: ReturnType<typeof vi.fn>;
    resolveImportableProject: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    inserts = [];
    members = { requireRole: vi.fn(async () => undefined) };
    github = {
      getRepository: vi.fn(async () => ({ fullName: 'ITSUA-team/Kesher' })),
      resolveImportableProject: vi.fn(async () => ({
        number: 7,
        ownerLogin: 'approved-org',
        title: 'Real Board',
        url: 'https://github.com/orgs/approved-org/projects/7',
      })),
    };
  });

  function createService(db = createDbStub(inserts)) {
    return new ProjectImportsService(
      db as never,
      members as never,
      github as never,
      {} as never,
    );
  }

  it('stores the provenance GitHub reports, never what the caller sent', async () => {
    const service = createService();

    const response = await service.importGitHubProjects(user, {
      githubProjects: [{ githubProjectId: 'PVT_kwDO', githubRepos: [] }],
    });

    expect(response.results[0]).toMatchObject({ status: 'imported' });
    expect(github.resolveImportableProject).toHaveBeenCalledWith(
      user,
      'PVT_kwDO',
    );

    const project = inserts.find((row) => 'name' in row.values);
    const ref = inserts.find((row) => 'externalKey' in row.values);

    expect(project?.values.name).toBe('approved-org/Real Board');
    expect(ref?.values.externalUrl).toBe(
      'https://github.com/orgs/approved-org/projects/7',
    );
    expect(ref?.values.metadata).toEqual({
      githubProjectNumber: 7,
      githubProjectOwner: 'approved-org',
      githubProjectTitle: 'Real Board',
    });
  });

  it('refuses a project whose real owner the workspace has not approved', async () => {
    github.resolveImportableProject.mockRejectedValueOnce(
      new NotFoundException('GitHub project owner could not be verified'),
    );
    const service = createService();

    const response = await service.importGitHubProjects(user, {
      githubProjects: [{ githubProjectId: 'PVT_forged', githubRepos: [] }],
    });

    expect(response.results[0]).toMatchObject({
      projectId: null,
      status: 'failed',
    });
    expect(inserts).toHaveLength(0);
  });

  it('refuses a project the caller cannot see on GitHub', async () => {
    github.resolveImportableProject.mockRejectedValueOnce(
      new NotFoundException('GitHub project could not be verified'),
    );
    const service = createService();

    const response = await service.importGitHubProjects(user, {
      githubProjects: [{ githubProjectId: 'PVT_invisible', githubRepos: [] }],
    });

    expect(response.results[0]?.status).toBe('failed');
    expect(inserts).toHaveLength(0);
  });

  it('verifies every board rather than only the first', async () => {
    github.resolveImportableProject
      .mockResolvedValueOnce({
        number: 1,
        ownerLogin: 'approved-org',
        title: 'First',
        url: null,
      })
      .mockRejectedValueOnce(new NotFoundException('not allowed'));
    const service = createService();

    const response = await service.importGitHubProjects(user, {
      githubProjects: [
        { githubProjectId: 'PVT_one', githubRepos: [] },
        { githubProjectId: 'PVT_two', githubRepos: [] },
      ],
    });

    expect(github.resolveImportableProject).toHaveBeenCalledTimes(2);
    expect(response.results.map((result) => result.status)).toEqual([
      'imported',
      'failed',
    ]);
  });

  it('refuses a board whose repository another project already tracks', async () => {
    const db = createDbStub(inserts, [], {
      tracking: [{ id: 'project-9', isActive: true, name: 'Kesher' }],
    });
    const service = createService(db);

    const response = await service.importGitHubProjects(user, {
      githubProjects: [
        { githubProjectId: 'PVT_kwDO', githubRepos: ['itsua-team/kesher'] },
      ],
    });

    expect(response.results[0]).toMatchObject({
      projectId: null,
      status: 'repository-taken',
      trackingProject: { id: 'project-9', isActive: true, name: 'Kesher' },
    });
    expect(response.results[0]?.message).toContain('Kesher');
    expect(inserts).toHaveLength(0);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('ignores an archived project holding the repository', async () => {
    const service = createService(createDbStub(inserts, [], { tracking: [] }));

    const response = await service.importGitHubProjects(user, {
      githubProjects: [
        { githubProjectId: 'PVT_kwDO', githubRepos: ['itsua-team/kesher'] },
      ],
    });

    expect(response.results[0]?.status).toBe('imported');
  });

  it('reclaims the repository mapping an archived project still holds', async () => {
    const db = createDbStub(inserts, [], {
      repositoryRefWins: false,
      reclaims: true,
    });
    const service = createService(db);

    const response = await service.importGitHubProjects(user, {
      githubProjects: [
        { githubProjectId: 'PVT_kwDO', githubRepos: ['itsua-team/kesher'] },
      ],
    });

    expect(response.results[0]).toMatchObject({
      linkedRepository: 'ITSUA-team/Kesher',
      status: 'imported',
    });
    expect(db.deletedProjectIds).toEqual([]);
  });

  it('rolls the project back when the repository is taken mid-write', async () => {
    const db = createDbStub(inserts, [], { repositoryRefWins: false });
    const service = createService(db);

    const response = await service.importGitHubProjects(user, {
      githubProjects: [
        { githubProjectId: 'PVT_kwDO', githubRepos: ['itsua-team/kesher'] },
      ],
    });

    expect(response.results[0]).toMatchObject({
      projectId: null,
      status: 'repository-taken',
    });
    expect(db.deletedProjectIds).toEqual(['project-1']);
  });

  it('imports normally when no project tracks the repository', async () => {
    const service = createService(createDbStub(inserts, [], { tracking: [] }));

    const response = await service.importGitHubProjects(user, {
      githubProjects: [
        { githubProjectId: 'PVT_kwDO', githubRepos: ['itsua-team/kesher'] },
      ],
    });

    expect(response.results[0]).toMatchObject({
      linkedRepository: 'ITSUA-team/Kesher',
      status: 'imported',
      trackingProject: null,
    });
    expect(
      inserts.find((row) => row.values.externalType === 'repository')?.values
        .externalKey,
    ).toBe('ITSUA-team/Kesher');
  });

  it('lets a refused board leave the rest of the request alone', async () => {
    github.resolveImportableProject
      .mockResolvedValueOnce({
        number: 1,
        ownerLogin: 'approved-org',
        title: 'Taken',
        url: null,
      })
      .mockResolvedValueOnce({
        number: 2,
        ownerLogin: 'approved-org',
        title: 'Free',
        url: null,
      });
    const service = createService(
      createDbStub(inserts, [], {
        tracking: [{ id: 'project-9', isActive: true, name: 'Kesher' }],
      }),
    );

    const response = await service.importGitHubProjects(user, {
      githubProjects: [
        { githubProjectId: 'PVT_one', githubRepos: ['itsua-team/kesher'] },
        { githubProjectId: 'PVT_two', githubRepos: [] },
      ],
    });

    expect(response.results.map((result) => result.status)).toEqual([
      'repository-taken',
      'imported',
    ]);
  });

  it('requires an admin or pm before reaching GitHub at all', async () => {
    members.requireRole.mockRejectedValueOnce(new Error('forbidden'));
    const service = createService();

    await expect(
      service.importGitHubProjects(user, {
        githubProjects: [{ githubProjectId: 'PVT_kwDO', githubRepos: [] }],
      }),
    ).rejects.toThrow('forbidden');
    expect(github.resolveImportableProject).not.toHaveBeenCalled();
  });
});
