import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GithubTaskMaterializationService } from './github-task-materialization.service';

describe('GithubTaskMaterializationService', () => {
  it('fails closed when a GitHub repository ref points outside the current workspace', async () => {
    const executor = {
      select: vi.fn(),
    };
    const service = new GithubTaskMaterializationService({} as never);

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
    const service = new GithubTaskMaterializationService({} as never);

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
