import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { calculateDurationSeconds } from '../time-entry-duration';
import { TimeEntriesService } from './time-entries.service';

const user: AuthUser = {
  sub: 'user-1',
  email: 'user@example.com',
  firebaseUid: 'uid-1',
  workspaceId: 'workspace-1',
  role: 'member',
};

const mockUsersActivity = {
  touchLastActive: vi.fn().mockResolvedValue(undefined),
};

const mockGithubTasks = {} as never;

function mockGithub(
  repository: { fullName: string } = { fullName: 'octo-org/repo-name' },
  issue?: { number?: number; title?: string },
) {
  return {
    getRepository: vi.fn().mockResolvedValue(repository),
    getRepositoryIssue: vi.fn(
      async (
        _user: unknown,
        _owner: string,
        _repo: string,
        issueNumber: number,
      ) => ({
        number: issue?.number ?? issueNumber,
        title: issue?.title ?? 'Issue title from GitHub',
      }),
    ),
  } as never;
}

const completedEntry = {
  id: 'entry-1',
  workspaceId: user.workspaceId,
  taskId: 'task-1',
  userId: user.sub,
  startedAt: new Date('2026-01-01T10:00:00.000Z'),
  endedAt: new Date('2026-01-01T11:00:00.000Z'),
  durationSeconds: 3600,
  description: null,
  isBillable: true,
  source: 'manual' as const,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-01T10:00:00.000Z'),
};

function selectRows(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

function selectRowsForUpdate(rows: unknown[]) {
  const forUpdate = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn().mockReturnValue({ for: forUpdate });
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, forUpdate };
}

describe('TimeEntriesService', () => {
  it('calculates positive whole-second duration', () => {
    expect(
      calculateDurationSeconds(
        new Date('2026-01-01T10:00:00.000Z'),
        new Date('2026-01-01T10:30:00.500Z'),
      ),
    ).toBe(1800);
  });

  it('rounds sub-second positive intervals up to one second', () => {
    expect(
      calculateDurationSeconds(
        new Date('2026-01-01T10:00:00.000Z'),
        new Date('2026-01-01T10:00:00.250Z'),
      ),
    ).toBe(1);
  });

  it('rejects zero or negative duration', () => {
    expect(() =>
      calculateDurationSeconds(
        new Date('2026-01-01T10:00:00.000Z'),
        new Date('2026-01-01T10:00:00.000Z'),
      ),
    ).toThrow(BadRequestException);
  });

  it('updates running entries with task and description changes', async () => {
    const set = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: completedEntry.id }]),
      }),
    });
    const tx = {
      update: vi.fn().mockReturnValue({ set }),
      select: vi.fn().mockReturnValue(
        selectRowsForUpdate([
          {
            ...completedEntry,
            description: 'Existing note',
            endedAt: null,
            durationSeconds: null,
            source: 'web',
          },
        ]),
      ),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const tasks = {
      requireTrackableTaskForUpdate: vi
        .fn()
        .mockResolvedValue({ task: { id: 'task-2' } }),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );

    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue({
        ...completedEntry,
        description: 'Investigate release blocker',
        endedAt: null,
        durationSeconds: null,
        source: 'web',
        taskId: 'task-2',
      }),
    });

    await expect(
      service.updateOwnEntry(user, completedEntry.id, {
        description: 'Investigate release blocker',
        taskId: 'task-2',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        description: 'Investigate release blocker',
        taskId: 'task-2',
      }),
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Investigate release blocker',
        taskId: 'task-2',
      }),
    );
  });

  it('clears running-entry descriptions without stopping the timer', async () => {
    const set = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: completedEntry.id }]),
      }),
    });
    const tx = {
      update: vi.fn().mockReturnValue({ set }),
      select: vi.fn().mockReturnValue(
        selectRowsForUpdate([
          {
            ...completedEntry,
            description: 'Existing note',
            endedAt: null,
            durationSeconds: null,
            source: 'web',
          },
        ]),
      ),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );
    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue({
        ...completedEntry,
        description: null,
        endedAt: null,
        durationSeconds: null,
        source: 'web',
      }),
    });

    await expect(
      service.updateOwnEntry(user, completedEntry.id, { description: null }),
    ).resolves.toEqual(
      expect.objectContaining({
        description: null,
      }),
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
      }),
    );
  });

  it('rejects running-entry time or billable updates', async () => {
    const tx = {
      select: vi.fn().mockReturnValue(
        selectRowsForUpdate([
          {
            ...completedEntry,
            endedAt: null,
            durationSeconds: null,
            source: 'web',
          },
        ]),
      ),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const tasks = {
      requireTrackableTaskForUpdate: vi.fn(),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );

    await expect(
      service.updateOwnEntry(user, completedEntry.id, {
        description: 'x',
        endedAt: '2026-01-01T12:00:00.000Z',
        taskId: 'task-2',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tasks.requireTrackableTaskForUpdate).not.toHaveBeenCalled();
  });

  it('propagates invisible task reassignment failures for running entries', async () => {
    const tx = {
      select: vi.fn().mockReturnValue(
        selectRowsForUpdate([
          {
            ...completedEntry,
            endedAt: null,
            durationSeconds: null,
            source: 'web',
          },
        ]),
      ),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const tasks = {
      requireTrackableTaskForUpdate: vi
        .fn()
        .mockRejectedValue(new NotFoundException('Task not found')),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );

    await expect(
      service.updateOwnEntry(user, completedEntry.id, { taskId: 'task-2' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('propagates inactive task reassignment failures for running entries', async () => {
    const tx = {
      select: vi.fn().mockReturnValue(
        selectRowsForUpdate([
          {
            ...completedEntry,
            endedAt: null,
            durationSeconds: null,
            source: 'web',
          },
        ]),
      ),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const tasks = {
      requireTrackableTaskForUpdate: vi
        .fn()
        .mockRejectedValue(
          new UnprocessableEntityException('Task is inactive'),
        ),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );

    await expect(
      service.updateOwnEntry(user, completedEntry.id, { taskId: 'task-2' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('allows task-only reassignment for running entries', async () => {
    const runningEntry = {
      ...completedEntry,
      endedAt: null,
      durationSeconds: null,
      source: 'web' as const,
    };
    const set = vi.fn().mockReturnThis();
    const where = vi.fn().mockReturnThis();
    const returning = vi.fn().mockResolvedValue([{ id: runningEntry.id }]);
    const tx = {
      select: vi.fn().mockReturnValue(selectRowsForUpdate([runningEntry])),
      update: vi.fn().mockReturnValue({ set, where, returning }),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const tasks = {
      requireTrackableTaskForUpdate: vi
        .fn()
        .mockResolvedValue({ task: { id: 'task-2' } }),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );
    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue({ ...runningEntry, taskId: 'task-2' }),
    });

    await service.updateOwnEntry(user, runningEntry.id, { taskId: 'task-2' });

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tasks.requireTrackableTaskForUpdate).toHaveBeenCalledWith(
      user,
      'task-2',
      tx,
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-2',
      }),
    );
    expect(set).not.toHaveBeenCalledWith(
      expect.objectContaining({
        durationSeconds: expect.anything(),
      }),
    );
  });

  it('rejects deletes of running entries', async () => {
    const db = {
      select: vi.fn().mockReturnValue(
        selectRows([
          {
            ...completedEntry,
            endedAt: null,
            durationSeconds: null,
            source: 'web',
          },
        ]),
      ),
      delete: vi.fn(),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );

    await expect(
      service.deleteOwnEntry(user, completedEntry.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('maps running timer unique constraint to conflict', async () => {
    const returning = vi.fn().mockRejectedValue({
      code: '23505',
      constraint: 'time_entries_running_unique',
    });
    const values = vi.fn().mockReturnValue({ returning });
    const tx = { insert: vi.fn().mockReturnValue({ values }) };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const tasks = {
      requireTrackableTaskForUpdate: vi.fn().mockResolvedValue({
        task: { id: 'task-1', defaultBillableForTimeEntries: true },
        project: { id: 'project-1', isActive: true },
      }),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );

    await expect(
      service.startTimer(user, { taskId: 'task-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns current timers from another workspace', async () => {
    const otherWorkspaceRunningEntry = {
      ...completedEntry,
      endedAt: null,
      durationSeconds: null,
      source: 'web' as const,
      workspaceId: 'workspace-2',
    };
    const db = {
      select: vi.fn().mockReturnValue(
        selectRows([
          {
            id: otherWorkspaceRunningEntry.id,
          },
        ]),
      ),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );
    const requireEntryResponse = vi
      .fn()
      .mockResolvedValue(otherWorkspaceRunningEntry);
    Object.defineProperty(service, 'requireEntryResponse', {
      value: requireEntryResponse,
    });

    await expect(service.getCurrentTimer(user)).resolves.toEqual({
      timeEntry: otherWorkspaceRunningEntry,
    });
    expect(requireEntryResponse).toHaveBeenCalledWith(
      db,
      otherWorkspaceRunningEntry.id,
    );
  });

  it('returns an empty current timer response when no user timer is running', async () => {
    const db = {
      select: vi.fn().mockReturnValue(selectRows([])),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );

    await expect(service.getCurrentTimer(user)).resolves.toEqual({
      timeEntry: null,
    });
  });

  it('starts web timers with an optional description', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: completedEntry.id }]);
    const values = vi.fn().mockReturnValue({ returning });
    const tx = { insert: vi.fn().mockReturnValue({ values }) };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const tasks = {
      requireTrackableTaskForUpdate: vi.fn().mockResolvedValue({
        project: { id: 'project-1', isActive: true },
        task: {
          id: 'task-1',
          defaultBillableForTimeEntries: false,
          isActive: true,
        },
      }),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );
    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue({
        ...completedEntry,
        description: 'Investigate release blocker',
        endedAt: null,
        durationSeconds: null,
        source: 'web',
      }),
    });

    await service.startTimer(user, {
      description: 'Investigate release blocker',
      taskId: 'task-1',
    });

    expect(tasks.requireTrackableTaskForUpdate).toHaveBeenCalledWith(
      user,
      'task-1',
      tx,
    );
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Investigate release blocker',
        isBillable: false,
        source: 'web',
        workspaceId: user.workspaceId,
      }),
    );
  });

  it('stops the current user timer from another workspace', async () => {
    const otherWorkspaceRunningEntry = {
      ...completedEntry,
      endedAt: null,
      durationSeconds: null,
      source: 'web' as const,
      workspaceId: 'workspace-2',
    };
    const returning = vi.fn().mockResolvedValue([
      {
        id: otherWorkspaceRunningEntry.id,
      },
    ]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const tx = {
      select: vi
        .fn()
        .mockReturnValue(selectRowsForUpdate([otherWorkspaceRunningEntry])),
      update: vi.fn().mockReturnValue({ set }),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const stoppedEntry = {
      ...otherWorkspaceRunningEntry,
      endedAt: new Date('2026-01-01T10:30:00.000Z'),
      durationSeconds: 1800,
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );
    const requireEntryResponse = vi.fn().mockResolvedValue(stoppedEntry);
    Object.defineProperty(service, 'requireEntryResponse', {
      value: requireEntryResponse,
    });

    await expect(
      service.stopTimer(user, {
        expectedTimerId: otherWorkspaceRunningEntry.id,
      }),
    ).resolves.toEqual(stoppedEntry);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        durationSeconds: expect.any(Number),
        endedAt: expect.any(Date),
      }),
    );
    expect(requireEntryResponse).toHaveBeenCalledWith(
      db,
      otherWorkspaceRunningEntry.id,
    );
  });

  it('returns a conflict when the expected running timer changed', async () => {
    const tx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              for: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );

    await expect(
      service.stopTimer(user, { expectedTimerId: completedEntry.id }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not stop another user timer', async () => {
    const tx = {
      select: vi.fn().mockReturnValue(selectRowsForUpdate([])),
      update: vi.fn(),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );

    await expect(
      service.stopTimer(user, { expectedTimerId: completedEntry.id }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('creates manual entries with computed duration and source', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: completedEntry.id }]);
    const values = vi.fn().mockReturnValue({ returning });
    const tx = { insert: vi.fn().mockReturnValue({ values }) };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const tasks = {
      requireTrackableTaskForUpdate: vi.fn().mockResolvedValue({
        task: { id: 'task-1', defaultBillableForTimeEntries: false },
        project: { id: 'project-1', isActive: true },
      }),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );
    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue(completedEntry),
    });

    await service.createManualEntry(user, {
      taskId: 'task-1',
      startedAt: '2026-01-01T10:00:00.000Z',
      endedAt: '2026-01-01T11:00:00.000Z',
    });

    expect(tasks.requireTrackableTaskForUpdate).toHaveBeenCalledWith(
      user,
      'task-1',
      tx,
    );
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        durationSeconds: 3600,
        isBillable: false,
        source: 'manual',
      }),
    );
  });

  it('honors manual time-entry billable overrides', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: completedEntry.id }]);
    const values = vi.fn().mockReturnValue({ returning });
    const tx = { insert: vi.fn().mockReturnValue({ values }) };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const tasks = {
      requireTrackableTaskForUpdate: vi.fn().mockResolvedValue({
        task: { id: 'task-1', defaultBillableForTimeEntries: false },
        project: { id: 'project-1', isActive: true },
      }),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );
    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue(completedEntry),
    });

    await service.createManualEntry(user, {
      taskId: 'task-1',
      startedAt: '2026-01-01T10:00:00.000Z',
      endedAt: '2026-01-01T11:00:00.000Z',
      isBillable: true,
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        isBillable: true,
      }),
    );
  });

  it('reassigns completed entries to another visible active task', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: completedEntry.id }]);
    const set = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning }),
    });
    const tx = {
      select: vi.fn().mockReturnValue(selectRowsForUpdate([completedEntry])),
      update: vi.fn().mockReturnValue({ set }),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const tasks = {
      requireTrackableTaskForUpdate: vi.fn().mockResolvedValue({
        project: { id: 'project-2', isActive: true },
        task: { id: 'task-2', isActive: true },
      }),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );
    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue({ ...completedEntry, taskId: 'task-2' }),
    });

    await service.updateOwnEntry(user, completedEntry.id, { taskId: 'task-2' });

    expect(tasks.requireTrackableTaskForUpdate).toHaveBeenCalledWith(
      user,
      'task-2',
      tx,
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        durationSeconds: 3600,
        taskId: 'task-2',
      }),
    );
  });

  it('propagates inactive task reassignment failures for completed entries', async () => {
    const tx = {
      select: vi.fn().mockReturnValue(selectRowsForUpdate([completedEntry])),
      update: vi.fn(),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
    };
    const tasks = {
      requireTrackableTaskForUpdate: vi
        .fn()
        .mockRejectedValue(
          new UnprocessableEntityException('Task is inactive'),
        ),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
      mockGithubTasks,
      mockGithub(),
    );

    await expect(
      service.updateOwnEntry(user, completedEntry.id, { taskId: 'task-2' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(tx.update).not.toHaveBeenCalled();
  });
});

describe('TimeEntriesService installation authorization', () => {
  function fixture(
    options: {
      role?: string;
      assigned?: boolean;
      visibility?: string;
      projectActive?: boolean;
      taskActive?: boolean;
      taskStatus?: string;
    } = {},
  ) {
    const project = {
      id: 'project-1',
      workspaceId: user.workspaceId,
      isActive: options.projectActive ?? true,
      visibility: options.visibility ?? 'public',
      defaultBillableForTasks: false,
    };
    const task = {
      id: 'task-1',
      workspaceId: user.workspaceId,
      projectId: project.id,
      isActive: options.taskActive ?? true,
      status: options.taskStatus ?? 'open',
      defaultBillableForTimeEntries: false,
    };
    const values = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: completedEntry.id }]),
    });
    const rows = [
      [{ role: options.role ?? 'member' }],
      [project],
      ...(options.role === 'admin' ||
      (options.role === 'pm' && project.visibility === 'public')
        ? []
        : [options.assigned === false ? [] : [{ id: 'assignment-1' }]]),
      [task],
    ];
    const tx = {
      select: vi.fn(() => {
        const result = rows.shift() ?? [];
        const chain: Record<string, unknown> = {};
        for (const key of ['from', 'where', 'limit'])
          chain[key] = vi.fn(() => chain);
        chain.for = vi.fn().mockResolvedValue(result);
        return chain;
      }),
      insert: vi.fn().mockReturnValue({ values }),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const members = {
      requireActiveMembership: vi
        .fn()
        .mockResolvedValue({ role: options.role ?? 'member' }),
    };
    const verified = {
      associationId: 'association-1',
      authorizationVersion: 1,
      organizationLogin: 'Org',
      repository: { fullName: 'Org/Repo' },
      issue: { number: 123, title: 'Verified title' },
    };
    const installations = {
      prepareIssue: vi.fn().mockResolvedValue(verified),
      verifyBoard: vi.fn().mockResolvedValue(true),
      assertCurrent: vi.fn().mockResolvedValue(undefined),
    };
    const githubTasks = {
      findExistingIssueProject: vi.fn().mockResolvedValue(project),
      listMappedBoardIds: vi.fn().mockResolvedValue(['board-1']),
      resolveExistingProjectForIssue: vi.fn().mockResolvedValue(project),
      findOrCreateTaskForIssue: vi.fn().mockResolvedValue(task),
    };
    const service = new TimeEntriesService(
      db as never,
      members as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      githubTasks as never,
      installations as never,
    );
    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue(completedEntry),
    });
    return {
      service,
      db,
      tx,
      values,
      members,
      installations,
      githubTasks,
      verified,
    };
  }
  const input = { githubRepo: 'org/repo', issueNumber: 123 };

  it('uses installation metadata without a personal connection and preserves source and billing', async () => {
    const f = fixture();
    await f.service.startTimerFromGitHub(user, input);
    expect(f.installations.prepareIssue).toHaveBeenCalledWith(
      user,
      'org',
      'repo',
      123,
    );
    expect(f.installations.assertCurrent).toHaveBeenCalledWith(
      f.tx,
      user,
      f.verified,
    );
    expect(f.githubTasks.findOrCreateTaskForIssue).toHaveBeenCalledWith(f.tx, {
      workspaceId: user.workspaceId,
      projectId: 'project-1',
      issueKey: 'Org/Repo#123',
      issueTitle: 'Verified title',
      defaultBillableForTimeEntries: false,
    });
    expect(f.values).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'extension', isBillable: false }),
    );
  });
  it('locks membership before the installation policy and association', async () => {
    const f = fixture();
    await f.service.startTimerFromGitHub(user, input);

    expect(f.tx.select.mock.invocationCallOrder[0]).toBeLessThan(
      f.installations.assertCurrent.mock.invocationCallOrder[0]!,
    );
  });
  it.each(['public', 'private'])(
    'requires member assignment for %s projects before materializing',
    async (visibility) => {
      const f = fixture({ assigned: false, visibility });
      await expect(
        f.service.startTimerFromGitHub(user, input),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'project_assignment_required',
        }),
        message:
          'You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time.',
      });
      expect(f.githubTasks.findOrCreateTaskForIssue).not.toHaveBeenCalled();
      expect(f.tx.insert).not.toHaveBeenCalled();
    },
  );
  it.each([
    ['admin', 'private'],
    ['admin', 'public'],
    ['pm', 'public'],
  ])('preserves %s access to %s projects', async (role, visibility) => {
    const f = fixture({ role, visibility, assigned: false });
    await expect(f.service.startTimerFromGitHub(user, input)).resolves.toEqual(
      completedEntry,
    );
  });
  it('requires PM private-project visibility', async () => {
    const f = fixture({ role: 'pm', visibility: 'private', assigned: false });
    await expect(
      f.service.startTimerFromGitHub(user, input),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(f.tx.insert).not.toHaveBeenCalled();
  });
  it.each([
    { projectActive: false },
    { taskActive: false },
    { taskStatus: 'closed' },
  ])('rejects inactive or closed targets %j', async (options) => {
    const f = fixture(options);
    await expect(
      f.service.startTimerFromGitHub(user, input),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(f.tx.insert).not.toHaveBeenCalled();
  });
  it('does no provider lookup for removed members', async () => {
    const f = fixture();
    f.members.requireActiveMembership.mockRejectedValue(
      new ForbiddenException(),
    );
    await expect(
      f.service.startTimerFromGitHub(user, input),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.installations.prepareIssue).not.toHaveBeenCalled();
  });
  it('writes nothing on installation verification failure', async () => {
    const f = fixture();
    f.installations.prepareIssue.mockRejectedValue(new ForbiddenException());
    await expect(
      f.service.startTimerFromGitHub(user, input),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.db.transaction).not.toHaveBeenCalled();
  });
  it('rechecks installation revocation before task writes', async () => {
    const f = fixture();
    f.installations.assertCurrent.mockRejectedValue(new ForbiddenException());
    await expect(
      f.service.startTimerFromGitHub(user, input),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.githubTasks.findOrCreateTaskForIssue).not.toHaveBeenCalled();
    expect(f.tx.insert).not.toHaveBeenCalled();
  });
  it('verifies mapped boards for direct issues with no repository mapping', async () => {
    const f = fixture();
    f.githubTasks.findExistingIssueProject.mockResolvedValue(null as never);
    await f.service.startTimerFromGitHub(user, input);
    expect(f.installations.verifyBoard).toHaveBeenCalledWith(
      f.verified,
      'board-1',
    );
    expect(f.githubTasks.listMappedBoardIds).toHaveBeenCalledWith(
      user.workspaceId,
      'Org',
    );
    expect(f.githubTasks.resolveExistingProjectForIssue).toHaveBeenCalledWith(
      f.tx,
      user,
      expect.objectContaining({ verifiedBoardIds: ['board-1'] }),
    );
  });
  it('does not trust a forged board hint or an unverified mapped board', async () => {
    const f = fixture();
    f.githubTasks.findExistingIssueProject.mockResolvedValue(null as never);
    await f.service.startTimerFromGitHub(user, {
      ...input,
      githubProjectId: 'forged',
    });
    expect(f.installations.verifyBoard).not.toHaveBeenCalled();
    expect(f.githubTasks.resolveExistingProjectForIssue).toHaveBeenCalledWith(
      f.tx,
      user,
      expect.objectContaining({ verifiedBoardIds: [] }),
    );
  });
  it('keeps canonical existing task/repository precedence over board hints', async () => {
    const f = fixture();
    await f.service.startTimerFromGitHub(user, {
      ...input,
      githubProjectId: 'board-1',
    });
    expect(f.installations.verifyBoard).not.toHaveBeenCalled();
  });
});
