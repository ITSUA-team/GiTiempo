import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { tasks } from '../schemas/tasks.schema';
import { TasksService } from './tasks.service';

const user: AuthUser = {
  sub: 'user-1',
  email: 'user@example.com',
  firebaseUid: 'user-uid',
  workspaceId: 'workspace-1',
  role: 'member',
};

const projectRow = {
  id: 'project-1',
  workspaceId: 'workspace-1',
  name: 'Project',
  color: null,
  visibility: 'private' as const,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const taskRow = {
  id: 'task-1',
  workspaceId: 'workspace-1',
  projectId: 'project-1',
  title: 'Task',
  status: 'open' as const,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
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
  return { from };
}

describe('TasksService', () => {
  it('rejects task creation in an inactive project', async () => {
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue({
        ...projectRow,
        isActive: false,
      }),
    };
    const db = { insert: vi.fn() };
    const service = new TasksService(db as never, projects as never);

    await expect(
      service.createTask(user, projectRow.id, { title: 'Task' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('checks project visibility before updating a task', async () => {
    const updatedTask = {
      ...taskRow,
      title: 'Renamed',
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    };
    const returning = vi.fn().mockResolvedValue([updatedTask]);
    const whereUpdate = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where: whereUpdate });
    const db = {
      select: vi.fn().mockReturnValue(selectRows([taskRow])),
      update: vi.fn().mockReturnValue({ set }),
    };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const service = new TasksService(db as never, projects as never);

    const result = await service.updateTask(user, taskRow.id, {
      title: 'Renamed',
    });

    expect(projects.requireVisibleProject).toHaveBeenCalledWith(
      user,
      taskRow.projectId,
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Renamed',
      }),
    );
    expect(result.title).toBe('Renamed');
  });

  it('rejects task updates in an inactive project', async () => {
    const db = {
      select: vi.fn().mockReturnValue(selectRows([taskRow])),
      update: vi.fn(),
    };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue({
        ...projectRow,
        isActive: false,
      }),
    };
    const service = new TasksService(db as never, projects as never);

    await expect(
      service.updateTask(user, taskRow.id, { title: 'Renamed' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('stops running time entries when closing a task', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T11:00:00.000Z'));

    try {
      const closedAt = new Date('2026-01-01T11:00:00.000Z');
      const taskReturning = vi.fn().mockResolvedValue([
        {
          ...taskRow,
          status: 'closed',
          updatedAt: closedAt,
        },
      ]);
      const taskSet = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: taskReturning }),
      });
      const entryWhere = vi.fn().mockResolvedValue(undefined);
      const entrySet = vi.fn().mockReturnValue({ where: entryWhere });
      const tx = {
        select: vi.fn().mockReturnValue(selectRowsForUpdate([taskRow])),
        update: vi.fn((table) =>
          table === tasks ? { set: taskSet } : { set: entrySet },
        ),
      };
      const db = {
        select: vi.fn().mockReturnValue(selectRows([taskRow])),
        transaction: vi.fn((callback) => callback(tx)),
      };
      const projects = {
        requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
      };
      const service = new TasksService(db as never, projects as never);

      const result = await service.updateTask(user, taskRow.id, {
        status: 'closed',
      });

      expect(result.status).toBe('closed');
      expect(db.transaction).toHaveBeenCalledOnce();
      expect(tx.update).toHaveBeenCalledWith(tasks);
      expect(tx.update).toHaveBeenCalledWith(timeEntries);
      expect(taskSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'closed', updatedAt: closedAt }),
      );
      expect(entrySet).toHaveBeenCalledWith(
        expect.objectContaining({
          durationSeconds: expect.anything(),
          endedAt: expect.anything(),
          updatedAt: expect.anything(),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects closed tasks as untrackable', async () => {
    const db = {
      select: vi.fn().mockReturnValue(
        selectRows([
          {
            ...taskRow,
            status: 'closed',
          },
        ]),
      ),
    };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const service = new TasksService(db as never, projects as never);

    await expect(
      service.requireTrackableTask(user, taskRow.id),
    ).rejects.toThrow('Task is closed');
  });
});
