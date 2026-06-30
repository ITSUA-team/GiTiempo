import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { timeEntries } from '../schemas/time-entries.schema';
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
    );

    await expect(
      service.startTimer(user, { taskId: 'task-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
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
      }),
    );
  });

  it('returns not found when stopping without a running timer', async () => {
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
    );

    await expect(service.stopTimer(user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
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
    );

    await expect(
      service.updateOwnEntry(user, completedEntry.id, { taskId: 'task-2' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('starts GitHub timer transactionally', async () => {
    const timeEntryValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: completedEntry.id }]),
    });
    const tx = {
      select: vi.fn().mockReturnValue(
        selectRowsForUpdate([
          {
            id: 'task-1',
            isActive: true,
            projectId: 'project-1',
            status: 'open',
            workspaceId: user.workspaceId,
            defaultBillableForTimeEntries: false,
          },
        ]),
      ),
      insert: vi.fn((table) => {
        if (table === timeEntries) {
          return {
            values: timeEntryValues,
          };
        }
        return {
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'created' }]),
            onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
          }),
        };
      }),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const members = {
      requireActiveMembership: vi.fn().mockResolvedValue({ role: 'member' }),
    };
    const githubTasks = {
      findOrCreateProjectForRepo: vi.fn().mockResolvedValue({
        project: {
          id: 'project-1',
          defaultBillableForTasks: false,
          isActive: true,
        },
        created: true,
      }),
      findOrCreateTaskForIssue: vi.fn().mockResolvedValue({
        id: 'task-1',
        isActive: true,
        status: 'open',
      }),
    };
    const service = new TimeEntriesService(
      db as never,
      members as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      githubTasks as never,
    );
    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue(completedEntry),
    });

    await service.startTimerFromGitHub(user, {
      githubRepo: 'org/repo',
      issueNumber: 123,
      issueTitle: 'Issue title',
    });

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.select).toHaveBeenCalled();
    expect(githubTasks.findOrCreateTaskForIssue).toHaveBeenCalledWith(tx, {
      workspaceId: user.workspaceId,
      projectId: 'project-1',
      issueKey: 'org/repo#123',
      issueTitle: 'Issue title',
      defaultBillableForTimeEntries: false,
    });
    expect(timeEntryValues).toHaveBeenCalledWith(
      expect.objectContaining({
        isBillable: false,
      }),
    );
  });

  it('rejects GitHub timers for closed tasks', async () => {
    const tx = {
      select: vi.fn().mockReturnValue(
        selectRowsForUpdate([
          {
            id: 'task-1',
            isActive: true,
            projectId: 'project-1',
            status: 'closed',
            workspaceId: user.workspaceId,
          },
        ]),
      ),
      insert: vi.fn(),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const members = {
      requireActiveMembership: vi.fn().mockResolvedValue({ role: 'admin' }),
    };
    const githubTasks = {
      findOrCreateProjectForRepo: vi.fn().mockResolvedValue({
        project: {
          id: 'project-1',
          defaultBillableForTasks: true,
          isActive: true,
        },
        created: true,
      }),
      findOrCreateTaskForIssue: vi.fn().mockResolvedValue({
        id: 'task-1',
        isActive: true,
        status: 'closed',
      }),
    };
    const service = new TimeEntriesService(
      db as never,
      members as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      githubTasks as never,
    );

    await expect(
      service.startTimerFromGitHub(user, {
        githubRepo: 'org/repo',
        issueNumber: 123,
        issueTitle: 'Issue title',
      }),
    ).rejects.toThrow('Task is closed');
    expect(tx.insert).not.toHaveBeenCalled();
  });
});
