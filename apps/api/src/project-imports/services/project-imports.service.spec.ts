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

function createDbStub(inserts: RecordedInsert[], existing: unknown[] = []) {
  const tx = {
    delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserts.push({ values });

        const conflict = {
          returning: vi.fn(async () => [{ projectId: 'project-1' }]),
          then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve(undefined).then(resolve),
        };

        return {
          onConflictDoNothing: vi.fn(() => conflict),
          returning: vi.fn(async () => [{ id: 'project-1' }]),
        };
      }),
    })),
  };

  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
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
  let github: { resolveImportableProject: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    inserts = [];
    members = { requireRole: vi.fn(async () => undefined) };
    github = {
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
