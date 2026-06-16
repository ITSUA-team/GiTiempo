import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { projectAssignments } from '../../projects/schemas/project-assignments.schema';
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

const projectRow = {
  id: 'project-1',
  workspaceId: user.workspaceId,
  name: 'org/repo',
  description: null,
  color: null,
  visibility: 'private' as const,
  isActive: true,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-01T10:00:00.000Z'),
};

const taskRow = {
  id: 'task-1',
  workspaceId: user.workspaceId,
  projectId: projectRow.id,
  title: 'Issue title',
  status: 'open' as const,
  isActive: true,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-01T10:00:00.000Z'),
};

const projectResponse = {
  id: projectRow.id,
  workspaceId: user.workspaceId,
  name: 'org/repo',
  description: null,
  color: null,
  visibility: 'private' as const,
  source: 'github' as const,
  totalSeconds: 0,
  members: [],
  isActive: true,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

const projectDetailResponse = {
  ...projectResponse,
  providerSummary: {
    source: 'github' as const,
    externalType: 'repository',
    externalKey: 'org/repo',
    externalUrl: 'https://github.com/org/repo',
  },
  trackedSummary: {
    totalSeconds: 0,
    billableSeconds: 0,
    billableShare: null,
    lastActivityAt: null,
  },
  assignedMembersSummary: {
    count: 0,
    previewMembers: [],
    remainingCount: 0,
  },
};

const taskResponse = {
  id: taskRow.id,
  workspaceId: user.workspaceId,
  projectId: projectRow.id,
  title: 'Issue title',
  status: 'open' as const,
  isActive: true,
  githubIssue: { githubRepo: 'org/repo', issueNumber: 123 },
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

const visibleGitHubIssue = {
  id: 'issue-1',
  nodeId: 'I_kwDO',
  repository: { owner: 'org', name: 'repo', fullName: 'org/repo' },
  number: 123,
  title: 'Issue title',
  state: 'open' as const,
  url: 'https://github.com/org/repo/issues/123',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

const materializeInput = {
  githubRepo: 'org/repo',
  issueNumber: 123,
  issueTitle: 'Issue title',
  sourceType: 'repository' as const,
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

  it('starts web timers with an optional description', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: completedEntry.id }]);
    const values = vi.fn().mockReturnValue({ returning });
    const tx = { insert: vi.fn().mockReturnValue({ values }) };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const tasks = {
      requireTrackableTaskForUpdate: vi.fn().mockResolvedValue({
        project: { id: 'project-1', isActive: true },
        task: { id: 'task-1', isActive: true },
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

    expect(tasks.requireTrackableTaskForUpdate).toHaveBeenCalledWith(
      user,
      'task-1',
      tx,
    );
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
    );

    await expect(
      service.updateOwnEntry(user, completedEntry.id, { taskId: 'task-2' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('starts GitHub timer transactionally', async () => {
    const tx = {
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
    Object.defineProperty(service, 'materializeGitHubTaskTarget', {
      value: vi.fn().mockResolvedValue({
        project: { id: 'project-1', isActive: true },
        task: { id: 'task-1', isActive: true, status: 'open' },
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
    expect(tx.insert).toHaveBeenCalledWith(timeEntries);
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
    const service = new TimeEntriesService(
      db as never,
      members as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
    );
    Object.defineProperty(service, 'materializeGitHubTaskTarget', {
      value: vi
        .fn()
        .mockRejectedValue(new UnprocessableEntityException('Task is closed')),
    });

    await expect(
      service.startTimerFromGitHub(user, {
        githubRepo: 'org/repo',
        issueNumber: 123,
        issueTitle: 'Issue title',
      }),
    ).rejects.toThrow('Task is closed');
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('materializes a connected GitHub issue without time-entry side effects', async () => {
    const usersActivity = {
      touchLastActive: vi.fn().mockResolvedValue(undefined),
    };
    const tx = {
      insert: vi.fn((table) => {
        if (table === timeEntries) throw new Error('unexpected time entry');
        return {
          values: vi.fn().mockReturnValue({
            onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
          }),
        };
      }),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const members = {
      requireActiveMembership: vi.fn().mockResolvedValue({ role: 'admin' }),
    };
    const projects = {
      getProject: vi.fn().mockResolvedValue(projectDetailResponse),
      requireVisibleProject: vi.fn(),
    };
    const tasks = { getTask: vi.fn().mockResolvedValue(taskResponse) };
    const github = {
      requireVisibleIssue: vi.fn().mockResolvedValue(visibleGitHubIssue),
    };
    const service = new TimeEntriesService(
      db as never,
      members as never,
      projects as never,
      tasks as never,
      usersActivity as never,
      github as never,
    );
    Object.defineProperty(service, 'findGitHubTaskRef', {
      value: vi.fn().mockResolvedValue(null),
    });
    Object.defineProperty(service, 'findOrCreateGitHubProject', {
      value: vi.fn().mockResolvedValue({ project: projectRow, created: false }),
    });
    Object.defineProperty(service, 'findOrCreateGitHubTask', {
      value: vi.fn().mockResolvedValue(taskRow),
    });
    Object.defineProperty(service, 'requireTaskRowForUpdate', {
      value: vi.fn().mockResolvedValue(taskRow),
    });

    await expect(
      service.materializeGitHubIssueTimerTarget(user, materializeInput),
    ).resolves.toEqual({ project: projectResponse, task: taskResponse });

    expect(github.requireVisibleIssue).toHaveBeenCalledWith(
      user,
      materializeInput,
    );
    expect(tx.insert).not.toHaveBeenCalledWith(timeEntries);
    expect(usersActivity.touchLastActive).not.toHaveBeenCalled();
  });

  it('reuses an existing GitHub issue task mapping', async () => {
    const db = { transaction: vi.fn((callback) => callback({})) };
    const members = {
      requireActiveMembership: vi.fn().mockResolvedValue({ role: 'admin' }),
    };
    const projects = {
      getProject: vi.fn().mockResolvedValue(projectDetailResponse),
      requireVisibleProject: vi.fn(),
    };
    const tasks = { getTask: vi.fn().mockResolvedValue(taskResponse) };
    const github = {
      requireVisibleIssue: vi.fn().mockResolvedValue(visibleGitHubIssue),
    };
    const service = new TimeEntriesService(
      db as never,
      members as never,
      projects as never,
      tasks as never,
      mockUsersActivity as never,
      github as never,
    );
    const createProject = vi.fn();
    const createTask = vi.fn();
    Object.defineProperty(service, 'findGitHubTaskRef', {
      value: vi
        .fn()
        .mockResolvedValue({ taskId: taskRow.id, projectId: projectRow.id }),
    });
    Object.defineProperty(service, 'requireTaskRowForUpdate', {
      value: vi.fn().mockResolvedValue(taskRow),
    });
    Object.defineProperty(service, 'requireProjectRow', {
      value: vi.fn().mockResolvedValue(projectRow),
    });
    Object.defineProperty(service, 'findOrCreateGitHubProject', {
      value: createProject,
    });
    Object.defineProperty(service, 'findOrCreateGitHubTask', {
      value: createTask,
    });

    await service.materializeGitHubIssueTimerTarget(user, materializeInput);

    expect(createProject).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
    expect(tasks.getTask).toHaveBeenCalledWith(user, taskRow.id);
  });

  it('preserves non-admin visibility for a newly created GitHub project', async () => {
    const assignmentInsert = {
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    };
    const tx = {
      insert: vi.fn((table) => {
        if (table === projectAssignments) return assignmentInsert;
        throw new Error('unexpected insert');
      }),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const members = {
      requireActiveMembership: vi.fn().mockResolvedValue({ role: 'member' }),
    };
    const projects = {
      getProject: vi.fn().mockResolvedValue(projectDetailResponse),
      requireVisibleProject: vi.fn(),
    };
    const tasks = { getTask: vi.fn().mockResolvedValue(taskResponse) };
    const github = {
      requireVisibleIssue: vi.fn().mockResolvedValue(visibleGitHubIssue),
    };
    const service = new TimeEntriesService(
      db as never,
      members as never,
      projects as never,
      tasks as never,
      mockUsersActivity as never,
      github as never,
    );
    Object.defineProperty(service, 'findGitHubTaskRef', {
      value: vi.fn().mockResolvedValue(null),
    });
    Object.defineProperty(service, 'findOrCreateGitHubProject', {
      value: vi.fn().mockResolvedValue({ project: projectRow, created: true }),
    });
    Object.defineProperty(service, 'findOrCreateGitHubTask', {
      value: vi.fn().mockResolvedValue(taskRow),
    });
    Object.defineProperty(service, 'requireTaskRowForUpdate', {
      value: vi.fn().mockResolvedValue(taskRow),
    });

    await service.materializeGitHubIssueTimerTarget(user, materializeInput);

    expect(tx.insert).toHaveBeenCalledWith(projectAssignments);
    expect(assignmentInsert.values).toHaveBeenCalledWith({
      workspaceId: user.workspaceId,
      projectId: projectRow.id,
      userId: user.sub,
      assignedBy: user.sub,
    });
  });

  it('rejects disconnected GitHub materialization before creating work', async () => {
    const db = { transaction: vi.fn() };
    const members = {
      requireActiveMembership: vi.fn().mockResolvedValue({ role: 'member' }),
    };
    const github = {
      requireVisibleIssue: vi
        .fn()
        .mockRejectedValue(
          new NotFoundException('GitHub connection not found'),
        ),
    };
    const service = new TimeEntriesService(
      db as never,
      members as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      github as never,
    );

    await expect(
      service.materializeGitHubIssueTimerTarget(user, materializeInput),
    ).rejects.toThrow('GitHub connection not found');
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('rejects invisible GitHub issues before creating work', async () => {
    const db = { transaction: vi.fn() };
    const members = {
      requireActiveMembership: vi.fn().mockResolvedValue({ role: 'member' }),
    };
    const github = {
      requireVisibleIssue: vi
        .fn()
        .mockRejectedValue(new NotFoundException('GitHub issue not found')),
    };
    const service = new TimeEntriesService(
      db as never,
      members as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      github as never,
    );

    await expect(
      service.materializeGitHubIssueTimerTarget(user, materializeInput),
    ).rejects.toThrow('GitHub issue not found');
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('rejects closed mapped tasks as timer targets', async () => {
    const db = { transaction: vi.fn((callback) => callback({})) };
    const members = {
      requireActiveMembership: vi.fn().mockResolvedValue({ role: 'admin' }),
    };
    const github = {
      requireVisibleIssue: vi.fn().mockResolvedValue(visibleGitHubIssue),
    };
    const service = new TimeEntriesService(
      db as never,
      members as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      github as never,
    );
    Object.defineProperty(service, 'findGitHubTaskRef', {
      value: vi
        .fn()
        .mockResolvedValue({ taskId: taskRow.id, projectId: projectRow.id }),
    });
    Object.defineProperty(service, 'requireTaskRowForUpdate', {
      value: vi.fn().mockResolvedValue({ ...taskRow, status: 'closed' }),
    });
    Object.defineProperty(service, 'requireProjectRow', {
      value: vi.fn().mockResolvedValue(projectRow),
    });

    await expect(
      service.materializeGitHubIssueTimerTarget(user, materializeInput),
    ).rejects.toThrow('Task is closed');
  });

  it('rejects inactive mapped work as a timer target', async () => {
    const db = { transaction: vi.fn((callback) => callback({})) };
    const members = {
      requireActiveMembership: vi.fn().mockResolvedValue({ role: 'admin' }),
    };
    const github = {
      requireVisibleIssue: vi.fn().mockResolvedValue(visibleGitHubIssue),
    };
    const service = new TimeEntriesService(
      db as never,
      members as never,
      {} as never,
      {} as never,
      mockUsersActivity as never,
      github as never,
    );
    Object.defineProperty(service, 'findGitHubTaskRef', {
      value: vi
        .fn()
        .mockResolvedValue({ taskId: taskRow.id, projectId: projectRow.id }),
    });
    Object.defineProperty(service, 'requireTaskRowForUpdate', {
      value: vi.fn().mockResolvedValue(taskRow),
    });
    Object.defineProperty(service, 'requireProjectRow', {
      value: vi.fn().mockResolvedValue({ ...projectRow, isActive: false }),
    });

    await expect(
      service.materializeGitHubIssueTimerTarget(user, materializeInput),
    ).rejects.toThrow('Project is inactive');
  });
});
