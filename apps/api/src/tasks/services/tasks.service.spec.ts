import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
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
});
