import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { timeEntries } from '../schemas/time-entries.schema';
import {
  calculateDurationSeconds,
  TimeEntriesService,
} from './time-entries.service';

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

  it('rejects updates to running entries', async () => {
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
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
    );

    await expect(
      service.updateOwnEntry(user, completedEntry.id, { description: 'x' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects mixed running-entry updates before validating the task', async () => {
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
      requireTrackableTask: vi.fn(),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
    );

    await expect(
      service.updateOwnEntry(user, completedEntry.id, {
        taskId: 'task-2',
        description: 'x',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tasks.requireTrackableTask).not.toHaveBeenCalled();
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
      requireTrackableTask: vi
        .fn()
        .mockResolvedValue({ task: { id: 'task-2' } }),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
    );
    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue({ ...runningEntry, taskId: 'task-2' }),
    });

    await service.updateOwnEntry(user, runningEntry.id, { taskId: 'task-2' });

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tasks.requireTrackableTask).toHaveBeenCalledWith(user, 'task-2');
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
    const db = { insert: vi.fn().mockReturnValue({ values }) };
    const tasks = {
      requireTrackableTask: vi.fn().mockResolvedValue({
        task: { id: 'task-1' },
        project: { id: 'project-1', isActive: true },
      }),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
    );

    await expect(
      service.startTimer(user, { taskId: 'task-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
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
    );

    await expect(service.stopTimer(user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates manual entries with computed duration and source', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: completedEntry.id }]);
    const values = vi.fn().mockReturnValue({ returning });
    const db = {
      insert: vi.fn().mockReturnValue({ values }),
      select: vi.fn().mockReturnValue(selectRows([])),
    };
    const tasks = {
      requireTrackableTask: vi.fn().mockResolvedValue({
        task: { id: 'task-1' },
        project: { id: 'project-1', isActive: true },
      }),
    };
    const service = new TimeEntriesService(
      db as never,
      {} as never,
      {} as never,
      tasks as never,
      mockUsersActivity as never,
    );
    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue(completedEntry),
    });

    await service.createManualEntry(user, {
      taskId: 'task-1',
      startedAt: '2026-01-01T10:00:00.000Z',
      endedAt: '2026-01-01T11:00:00.000Z',
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        durationSeconds: 3600,
        source: 'manual',
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
      requireTrackableTask: vi.fn().mockResolvedValue({
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
    );
    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue({ ...completedEntry, taskId: 'task-2' }),
    });

    await service.updateOwnEntry(user, completedEntry.id, { taskId: 'task-2' });

    expect(tasks.requireTrackableTask).toHaveBeenCalledWith(user, 'task-2');
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
      requireTrackableTask: vi
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
    );

    await expect(
      service.updateOwnEntry(user, completedEntry.id, { taskId: 'task-2' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('starts GitHub timer transactionally', async () => {
    const tx = {
      select: vi.fn().mockReturnValue(selectRows([])),
      insert: vi.fn((table) => {
        if (table === timeEntries) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: completedEntry.id }]),
            }),
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
    const service = new TimeEntriesService(
      db as never,
      members as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
    );
    Object.defineProperty(service, 'findOrCreateGitHubProject', {
      value: vi.fn().mockResolvedValue({
        project: { id: 'project-1', isActive: true },
        created: true,
      }),
    });
    Object.defineProperty(service, 'findOrCreateGitHubTask', {
      value: vi.fn().mockResolvedValue({
        id: 'task-1',
        isActive: true,
      }),
    });
    Object.defineProperty(service, 'requireEntryResponse', {
      value: vi.fn().mockResolvedValue(completedEntry),
    });

    await service.startTimerFromGitHub(user, {
      githubRepo: 'org/repo',
      issueNumber: 123,
      issueTitle: 'Issue title',
    });

    expect(db.transaction).toHaveBeenCalledOnce();
  });
});
