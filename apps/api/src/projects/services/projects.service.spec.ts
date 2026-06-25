import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { tasks } from '../../tasks/schemas/tasks.schema';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { projectAssignments } from '../schemas/project-assignments.schema';
import { projects } from '../schemas/projects.schema';
import { ProjectsService } from './projects.service';

const pmUser: AuthUser = {
  sub: 'pm-1',
  email: 'pm@example.com',
  firebaseUid: 'pm-uid',
  workspaceId: 'workspace-1',
  role: 'pm',
};

const adminUser: AuthUser = {
  ...pmUser,
  sub: 'admin-1',
  email: 'admin@example.com',
  firebaseUid: 'admin-uid',
  role: 'admin',
};

const projectRow = {
  id: 'project-1',
  workspaceId: 'workspace-1',
  name: 'Project',
  description: 'Project description',
  color: null,
  visibility: 'private' as const,
  defaultBillableForTasks: true,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const projectResponseRow = {
  ...projectRow,
  source: 'manual' as const,
  totalSeconds: 0,
  members: [
    {
      userId: '00000000-0000-4000-8000-000000000001',
      displayName: 'User One',
      email: 'user1@example.com',
      avatarUrl: null,
      role: 'pm' as const,
    },
  ],
};

type UpdateCountExecutorMock = {
  update: ReturnType<typeof vi.fn>;
};

type ProjectBackfillTestHarness = {
  updateProjectTasksBillableDefault(
    db: UpdateCountExecutorMock,
    workspaceId: string,
    projectId: string,
    isBillable: boolean,
    updatedAt: Date,
  ): Promise<number>;
  updateProjectTimeEntriesBillableDefault(
    db: UpdateCountExecutorMock,
    workspaceId: string,
    projectId: string,
    isBillable: boolean,
    updatedAt: Date,
  ): Promise<number>;
};

function selectRows(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

function selectJoinedRows(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const leftJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ leftJoin });
  return { from };
}

function updateRowCount(rowCount: number | null) {
  const where = vi.fn().mockResolvedValue({ rowCount });
  const from = vi.fn().mockReturnValue({ where });
  const set = vi.fn().mockReturnValue({ from, where });

  return { query: { set }, set, from, where };
}

function collectDateParams(value: unknown): string[] {
  const dates: string[] = [];
  const seen = new WeakSet<object>();

  const visit = (candidate: unknown): void => {
    if (candidate instanceof Date) {
      dates.push(candidate.toISOString());
      return;
    }
    if (candidate === null || typeof candidate !== 'object') return;
    if (seen.has(candidate)) return;

    seen.add(candidate);
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if ('queryChunks' in candidate) {
      visit((candidate as { queryChunks: unknown }).queryChunks);
    }
    if ('value' in candidate) {
      visit((candidate as { value: unknown }).value);
    }
    if (Object.getPrototypeOf(candidate) === Object.prototype) {
      for (const item of Object.values(candidate as Record<string, unknown>)) {
        visit(item);
      }
    }
  };

  visit(value);

  return dates;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ProjectsService', () => {
  it('auto-assigns a PM to a project created by that PM', async () => {
    const assignmentValues = vi.fn().mockResolvedValue(undefined);
    const tx = {
      insert: vi.fn((table) => {
        if (table === projects) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([projectRow]),
            }),
          };
        }
        if (table === projectAssignments) {
          return { values: assignmentValues };
        }
        throw new Error('Unexpected insert table');
      }),
    };
    const db = {
      transaction: vi.fn((callback) => callback(tx)),
      select: vi.fn().mockReturnValue(selectRows([projectResponseRow])),
    };
    const members = {
      requireRole: vi.fn().mockResolvedValue({ role: 'pm' }),
    };
    const service = new ProjectsService(db as never, members as never);

    const result = await service.createProject(pmUser, { name: 'Project' });

    expect(result.id).toBe(projectRow.id);
    expect(result.totalSeconds).toBe(0);
    expect(result.defaultBillableForTasks).toBe(true);
    expect(result.members).toHaveLength(1);
    expect(result.members[0]?.userId).toBe(
      '00000000-0000-4000-8000-000000000001',
    );
    expect(assignmentValues).toHaveBeenCalledWith({
      workspaceId: pmUser.workspaceId,
      projectId: projectRow.id,
      userId: pmUser.sub,
      assignedBy: pmUser.sub,
    });
  });

  it('stores explicit project billable defaults on create', async () => {
    const createdRow = { ...projectRow, defaultBillableForTasks: false };
    const returning = vi.fn().mockResolvedValue([createdRow]);
    const values = vi.fn().mockReturnValue({ returning });
    const db = {
      insert: vi.fn().mockReturnValue({ values }),
      select: vi.fn().mockReturnValue(
        selectRows([
          {
            ...projectResponseRow,
            defaultBillableForTasks: false,
          },
        ]),
      ),
    };
    const members = {
      requireRole: vi.fn().mockResolvedValue({ role: 'admin' }),
    };
    const service = new ProjectsService(db as never, members as never);

    const result = await service.createProject(adminUser, {
      name: 'Project',
      defaultBillableForTasks: false,
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultBillableForTasks: false,
      }),
    );
    expect(result.defaultBillableForTasks).toBe(false);
  });

  it('rejects assignment targets with admin role', async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectRows([projectRow]))
        .mockReturnValueOnce(selectRows([{ role: 'admin' }])),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const members = { requireAdmin: vi.fn().mockResolvedValue(undefined) };
    const service = new ProjectsService(db as never, members as never);

    await expect(
      service.createAssignment(adminUser, projectRow.id, { userId: 'admin-2' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects duplicate assignments before insert', async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectRows([projectRow]))
        .mockReturnValueOnce(selectRows([{ role: 'member' }]))
        .mockReturnValueOnce(selectRows([{ id: 'assignment-1' }])),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const members = { requireAdmin: vi.fn().mockResolvedValue(undefined) };
    const service = new ProjectsService(db as never, members as never);

    await expect(
      service.createAssignment(adminUser, projectRow.id, { userId: 'user-2' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects PM project active state updates', async () => {
    const db = { update: vi.fn() };
    const members = {
      requireRole: vi.fn().mockResolvedValue({ role: 'pm' }),
    };
    const service = new ProjectsService(db as never, members as never);
    vi.spyOn(service, 'requireVisibleProject').mockResolvedValue(projectRow);

    await expect(
      service.updateProject(pmUser, projectRow.id, { isActive: false }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('allows admins to archive and unarchive with single-field updates', async () => {
    const archivedRow = { ...projectRow, isActive: false };
    const unarchivedRow = { ...projectRow, isActive: true };
    const returning = vi
      .fn()
      .mockResolvedValueOnce([archivedRow])
      .mockResolvedValueOnce([unarchivedRow]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const db = { update: vi.fn().mockReturnValue({ set }) };
    const members = {
      requireRole: vi.fn().mockResolvedValue({ role: 'admin' }),
    };
    const service = new ProjectsService(db as never, members as never);
    Object.defineProperty(service, 'requireProjectInWorkspace', {
      value: vi.fn().mockResolvedValue(projectRow),
    });
    Object.defineProperty(service, 'findProjectResponseInWorkspace', {
      value: vi
        .fn()
        .mockResolvedValueOnce({
          ...archivedRow,
          source: 'manual',
          totalSeconds: 0,
          members: [],
        })
        .mockResolvedValueOnce({
          ...unarchivedRow,
          source: 'manual',
          totalSeconds: 0,
          members: [],
        }),
    });

    const archived = await service.updateProject(adminUser, projectRow.id, {
      isActive: false,
    });
    const unarchived = await service.updateProject(adminUser, projectRow.id, {
      isActive: true,
    });

    expect(archived.isActive).toBe(false);
    expect(archived.totalSeconds).toBe(0);
    expect(unarchived.isActive).toBe(true);
    expect(unarchived.totalSeconds).toBe(0);
    expect(set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ isActive: false }),
    );
    expect(set).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ isActive: true }),
    );
  });

  it('saves project billable defaults without backfilling downstream rows', async () => {
    const updatedRow = { ...projectRow, defaultBillableForTasks: false };
    const returning = vi.fn().mockResolvedValue([updatedRow]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const db = { update: vi.fn().mockReturnValue({ set }) };
    const members = {
      requireRole: vi.fn().mockResolvedValue({ role: 'admin' }),
    };
    const service = new ProjectsService(db as never, members as never);
    Object.defineProperty(service, 'requireProjectInWorkspace', {
      value: vi.fn().mockResolvedValue(projectRow),
    });
    Object.defineProperty(service, 'findProjectResponseInWorkspace', {
      value: vi.fn().mockResolvedValue({
        ...projectResponseRow,
        defaultBillableForTasks: false,
      }),
    });

    const result = await service.updateProject(adminUser, projectRow.id, {
      defaultBillableForTasks: false,
    });

    expect(result.defaultBillableForTasks).toBe(false);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultBillableForTasks: false,
      }),
    );
  });

  it('backfills selected project downstream billable defaults', async () => {
    const taskUpdate = updateRowCount(2);
    const timeEntryUpdate = updateRowCount(1);
    const tx = {
      update: vi
        .fn()
        .mockReturnValueOnce(taskUpdate.query)
        .mockReturnValueOnce(timeEntryUpdate.query),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const members = {
      requireRole: vi.fn().mockResolvedValue({ role: 'admin' }),
    };
    const service = new ProjectsService(db as never, members as never);
    Object.defineProperty(service, 'requireProjectForUpdate', {
      value: vi.fn().mockResolvedValue({
        project: { ...projectRow, defaultBillableForTasks: false },
        role: 'admin',
      }),
    });

    const result = await service.backfillBillableDefault(
      adminUser,
      projectRow.id,
      { updateTasks: true, updateTimeEntries: true },
    );

    expect(result).toEqual({ tasksUpdated: 2, timeEntriesUpdated: 1 });
    expect(tx.update).toHaveBeenNthCalledWith(1, tasks);
    expect(taskUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ defaultBillableForTimeEntries: false }),
    );
    expect(taskUpdate.where).toHaveBeenCalledOnce();
    expect(tx.update).toHaveBeenNthCalledWith(2, timeEntries);
    expect(timeEntryUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({ isBillable: false }),
    );
    expect(timeEntryUpdate.from).toHaveBeenCalledWith(tasks);
    expect(timeEntryUpdate.where).toHaveBeenCalledOnce();
  });

  it('returns the updated task count from the tasks billable backfill', async () => {
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const taskUpdate = updateRowCount(2);
    const db = { update: vi.fn().mockReturnValue(taskUpdate.query) };
    const service = new ProjectsService(
      {} as never,
      {} as never,
    ) as unknown as ProjectBackfillTestHarness;

    const result = await service.updateProjectTasksBillableDefault(
      db,
      adminUser.workspaceId,
      projectRow.id,
      false,
      updatedAt,
    );

    expect(result).toBe(2);
    expect(db.update).toHaveBeenCalledWith(tasks);
    expect(taskUpdate.set).toHaveBeenCalledWith({
      defaultBillableForTimeEntries: false,
      updatedAt,
    });
    expect(taskUpdate.where).toHaveBeenCalledOnce();
  });

  it('returns the updated entry count from the time entry billable backfill', async () => {
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const timeEntryUpdate = updateRowCount(1);
    const db = { update: vi.fn().mockReturnValue(timeEntryUpdate.query) };
    const service = new ProjectsService(
      {} as never,
      {} as never,
    ) as unknown as ProjectBackfillTestHarness;

    const result = await service.updateProjectTimeEntriesBillableDefault(
      db,
      adminUser.workspaceId,
      projectRow.id,
      false,
      updatedAt,
    );

    expect(result).toBe(1);
    expect(db.update).toHaveBeenCalledWith(timeEntries);
    expect(timeEntryUpdate.set).toHaveBeenCalledWith({
      isBillable: false,
      updatedAt,
    });
    expect(timeEntryUpdate.from).toHaveBeenCalledWith(tasks);
    expect(timeEntryUpdate.where).toHaveBeenCalledOnce();
  });

  it('uses the provided selector when checking project visibility', async () => {
    const db = { select: vi.fn() };
    const tx = {
      select: vi
        .fn()
        .mockReturnValue(selectJoinedRows([{ project: projectRow }])),
    };
    const members = {
      requireActiveMembership: vi.fn().mockResolvedValue({ role: 'pm' }),
    };
    const service = new ProjectsService(db as never, members as never);

    const result = await service.requireVisibleProject(
      pmUser,
      projectRow.id,
      tx as never,
    );

    expect(tx.select).toHaveBeenCalledOnce();
    expect(db.select).not.toHaveBeenCalled();
    expect(result).toEqual(projectRow);
  });

  it('uses UTC ISO-week and month starts for my tracked-hour summary', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-17T12:34:56.000Z'));
    const visibleWhere = vi.fn().mockResolvedValue([{ value: 4 }]);
    const visibleFrom = vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({ where: visibleWhere }),
    });
    const hoursWhere = vi
      .fn()
      .mockResolvedValue([{ trackedHoursWeek: 2, trackedHoursMonth: '5.5' }]);
    const hoursFrom = vi.fn().mockReturnValue({ where: hoursWhere });
    const select = vi
      .fn()
      .mockReturnValueOnce({ from: visibleFrom })
      .mockReturnValueOnce({ from: hoursFrom });
    const db = { select };
    const members = {
      requireActiveMembership: vi.fn().mockResolvedValue({ role: 'admin' }),
    };
    const service = new ProjectsService(db as never, members as never);

    const result = await service.getMySummary(adminUser);

    expect(result).toEqual({
      visibleProjects: 4,
      trackedHoursWeek: 2,
      trackedHoursMonth: 5.5,
    });
    expect(collectDateParams(select.mock.calls[1]?.[0])).toEqual([
      '2026-05-11T00:00:00.000Z',
      '2026-05-01T00:00:00.000Z',
    ]);
    expect(collectDateParams(hoursWhere.mock.calls[0]?.[0])).toEqual([
      '2026-05-01T00:00:00.000Z',
      '2026-05-17T12:34:56.000Z',
    ]);
  });
});
