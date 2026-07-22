import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GithubTaskMaterializationService } from './github-task-materialization.service';

function orgsMock(canonicalOwner: string | null) {
  return {
    resolveCanonicalOrganizationLogin: vi
      .fn()
      .mockResolvedValue(canonicalOwner),
  } as never;
}

describe('GithubTaskMaterializationService', () => {
  it('rewrites the issue owner to the connected organization casing', async () => {
    const createdTask = {
      id: 'task-new',
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      title: 'Issue title',
      status: 'open',
      defaultBillableForTimeEntries: true,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const refValues: Array<{ externalKey: string }> = [];
    const values = vi
      .fn()
      .mockReturnValueOnce({
        returning: vi.fn().mockResolvedValue([createdTask]),
      })
      .mockImplementationOnce((v: { externalKey: string }) => {
        refValues.push(v);
        return {
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ taskId: 'task-new' }]),
          }),
        };
      });
    const executor = {
      delete: vi.fn(),
      insert: vi.fn().mockReturnValue({ values }),
      select: vi.fn(),
    };
    // The org "ITSUA-team" is connected; the extension sent it lowercased.
    const service = new GithubTaskMaterializationService(
      {} as never,
      orgsMock('ITSUA-team'),
    );
    Object.defineProperty(service, 'findGitHubTaskRef', {
      value: vi.fn().mockResolvedValue(null),
    });

    await service.findOrCreateTaskForIssue(executor as never, {
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      issueKey: 'itsua-team/gitiempo#153',
      issueTitle: 'Issue title',
      defaultBillableForTimeEntries: true,
    });

    // Stored under the connected org's canonical casing, not the input's.
    expect(refValues[0]?.externalKey).toBe('ITSUA-team/gitiempo#153');
  });

  it('leaves the owner untouched when the organization is not connected', async () => {
    const createdTask = {
      id: 'task-new',
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      title: 'Issue title',
      status: 'open',
      defaultBillableForTimeEntries: true,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const refValues: Array<{ externalKey: string }> = [];
    const values = vi
      .fn()
      .mockReturnValueOnce({
        returning: vi.fn().mockResolvedValue([createdTask]),
      })
      .mockImplementationOnce((v: { externalKey: string }) => {
        refValues.push(v);
        return {
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ taskId: 'task-new' }]),
          }),
        };
      });
    const executor = {
      delete: vi.fn(),
      insert: vi.fn().mockReturnValue({ values }),
      select: vi.fn(),
    };
    const service = new GithubTaskMaterializationService(
      {} as never,
      orgsMock(null),
    );
    Object.defineProperty(service, 'findGitHubTaskRef', {
      value: vi.fn().mockResolvedValue(null),
    });

    await service.findOrCreateTaskForIssue(executor as never, {
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      issueKey: 'some-org/repo#9',
      issueTitle: 'Issue title',
      defaultBillableForTimeEntries: true,
    });

    expect(refValues[0]?.externalKey).toBe('some-org/repo#9');
  });

  it('fails closed when a GitHub repository ref points outside the current workspace', async () => {
    const executor = {
      select: vi.fn(),
    };
    const service = new GithubTaskMaterializationService(
      {} as never,
      orgsMock(null),
    );

    Object.defineProperty(service, 'findGitHubProjectRef', {
      value: vi.fn().mockResolvedValue({
        projectId: 'foreign-project',
      }),
    });
    Object.defineProperty(service, 'requireProjectRow', {
      value: vi
        .fn()
        .mockRejectedValue(new NotFoundException('GitHub project not found')),
    });

    await expect(
      service.findOrCreateProjectForRepo(
        executor as never,
        {
          sub: 'user-1',
          email: 'user@example.com',
          firebaseUid: 'user-uid',
          workspaceId: 'workspace-1',
          role: 'admin',
        },
        'octo/repo',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('fails closed when a GitHub issue ref already belongs to a different project', async () => {
    const createdTask = {
      id: 'task-new',
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      title: 'Issue title',
      status: 'open',
      defaultBillableForTimeEntries: true,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const returningTask = vi.fn().mockResolvedValue([createdTask]);
    const onConflictDoNothing = vi
      .fn()
      .mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
    const values = vi
      .fn()
      .mockReturnValueOnce({ returning: returningTask })
      .mockReturnValueOnce({ onConflictDoNothing });
    const executor = {
      delete: vi
        .fn()
        .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      insert: vi.fn().mockReturnValue({ values }),
      select: vi.fn(),
    };
    const service = new GithubTaskMaterializationService(
      {} as never,
      orgsMock(null),
    );

    Object.defineProperty(service, 'findGitHubTaskRef', {
      value: vi.fn().mockResolvedValue(null),
    });
    Object.defineProperty(service, 'findGitHubTaskRefInWorkspace', {
      value: vi.fn().mockResolvedValue({
        taskId: 'task-existing',
        projectId: 'project-2',
      }),
    });

    await expect(
      service.findOrCreateTaskForIssue(executor as never, {
        workspaceId: 'workspace-1',
        projectId: 'project-1',
        issueKey: 'octo/repo#184',
        issueTitle: 'Issue title',
        defaultBillableForTimeEntries: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
