import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { timeEntries } from '../../time-entries/schemas/time-entries.schema';
import { taskAssignees } from '../schemas/task-assignees.schema';
import { tasks } from '../schemas/tasks.schema';
import { TasksService } from './tasks.service';

const user: AuthUser = {
  sub: 'user-1',
  email: 'user@example.com',
  firebaseUid: 'user-uid',
  workspaceId: 'workspace-1',
  role: 'member',
};

type TaskPriorityFixture = 'low' | 'medium' | 'high';
type TaskStatusFixture = 'open' | 'closed';
type WorkspaceRoleFixture = 'admin' | 'pm' | 'member';

type TaskRowFixture = {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: TaskPriorityFixture;
  status: TaskStatusFixture;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TaskResponseRowFixture = TaskRowFixture & {
  assignees: unknown;
};

type TaskAssigneeFixture = {
  avatarUrl: string | null;
  displayName: string | null;
  email: string;
  role: WorkspaceRoleFixture;
  userId: string;
};

const projectRow = {
  id: 'project-1',
  workspaceId: 'workspace-1',
  name: 'Project',
  description: null,
  color: null,
  visibility: 'private' as const,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const taskRow: TaskRowFixture = {
  id: 'task-1',
  workspaceId: 'workspace-1',
  projectId: 'project-1',
  title: 'Task',
  description: null,
  priority: 'medium',
  status: 'open',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const taskAssignee: TaskAssigneeFixture = {
  avatarUrl: null,
  displayName: 'Assigned User',
  email: 'assignee@example.com',
  role: 'member',
  userId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003',
};

const secondTaskAssignee: TaskAssigneeFixture = {
  avatarUrl: null,
  displayName: 'Second User',
  email: 'second@example.com',
  role: 'pm',
  userId: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004',
};

const unassignedTaskResponseRow: TaskResponseRowFixture = {
  ...taskRow,
  assignees: [],
};

function selectRows(rows: unknown[]) {
  const promise = Promise.resolve(rows);
  const chain = {} as {
    from: ReturnType<typeof vi.fn>;
    leftJoin: ReturnType<typeof vi.fn>;
    innerJoin: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    for: ReturnType<typeof vi.fn>;
    then: typeof promise.then;
  };

  chain.from = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.for = vi.fn().mockResolvedValue(rows);
  chain.then = promise.then.bind(promise);
  return chain;
}

function insertRows(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  return { values, returning };
}

function updateRows(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  return { set, where, returning };
}

function deleteRows() {
  const where = vi.fn().mockResolvedValue(undefined);
  return { where };
}

function taskResponseRow(overrides: Partial<TaskResponseRowFixture> = {}) {
  return { ...unassignedTaskResponseRow, ...overrides };
}

describe('TasksService', () => {
  it('rejects task creation in an inactive project', async () => {
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue({
        ...projectRow,
        isActive: false,
      }),
    };
    const db = { transaction: vi.fn() };
    const service = new TasksService(db as never, projects as never);

    await expect(
      service.createTask(user, projectRow.id, { title: 'Task' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('creates a task with metadata and assignee summaries', async () => {
    const insert = insertRows([{ id: taskRow.id }]);
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectRows([
            { userId: taskAssignee.userId },
            { userId: secondTaskAssignee.userId },
          ]),
        )
        .mockReturnValueOnce(
          selectRows([
            taskResponseRow({
              description: 'Plan the release',
              priority: 'high',
              status: 'closed',
              assignees: [taskAssignee, secondTaskAssignee],
            }),
          ]),
        ),
      insert: vi.fn().mockReturnValue(insert),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const service = new TasksService(db as never, projects as never);

    const result = await service.createTask(user, projectRow.id, {
      title: 'Task',
      description: 'Plan the release',
      priority: 'high',
      status: 'closed',
      assigneeIds: [taskAssignee.userId, secondTaskAssignee.userId],
    });

    expect(insert.values).toHaveBeenCalledWith({
      workspaceId: user.workspaceId,
      projectId: projectRow.id,
      title: 'Task',
      description: 'Plan the release',
      priority: 'high',
      status: 'closed',
    });
    expect(insert.values).toHaveBeenCalledWith([
      {
        workspaceId: user.workspaceId,
        projectId: projectRow.id,
        taskId: taskRow.id,
        userId: taskAssignee.userId,
      },
      {
        workspaceId: user.workspaceId,
        projectId: projectRow.id,
        taskId: taskRow.id,
        userId: secondTaskAssignee.userId,
      },
    ]);
    expect(result).toMatchObject({
      description: 'Plan the release',
      priority: 'high',
      status: 'closed',
      assignees: [taskAssignee, secondTaskAssignee],
    });
  });

  it('applies default metadata when creating a task', async () => {
    const insert = insertRows([{ id: taskRow.id }]);
    const tx = {
      select: vi.fn().mockReturnValue(selectRows([unassignedTaskResponseRow])),
      insert: vi.fn().mockReturnValue(insert),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const service = new TasksService(db as never, projects as never);

    const result = await service.createTask(user, projectRow.id, {
      title: 'Task',
    });

    expect(insert.values).toHaveBeenCalledWith({
      workspaceId: user.workspaceId,
      projectId: projectRow.id,
      title: 'Task',
      description: null,
      priority: 'medium',
      status: 'open',
    });
    expect(result).toMatchObject({
      description: null,
      priority: 'medium',
      status: 'open',
      assignees: [],
    });
  });

  it('rejects task creation with invalid assignees', async () => {
    const tx = {
      select: vi.fn().mockReturnValue(selectRows([])),
      insert: vi.fn(),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const service = new TasksService(db as never, projects as never);

    await expect(
      service.createTask(user, projectRow.id, {
        title: 'Task',
        assigneeIds: [taskAssignee.userId],
      }),
    ).rejects.toThrow('Assignees must be assigned to project');
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('checks project visibility before updating a task', async () => {
    const updatedTask = {
      ...taskRow,
      title: 'Renamed',
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    };
    const update = updateRows([{ id: updatedTask.id }]);
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectRows([taskRow]))
        .mockReturnValueOnce(
          selectRows([taskResponseRow({ title: 'Renamed' })]),
        ),
      update: vi.fn().mockReturnValue({ set: update.set }),
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
      title: 'Renamed',
    });

    expect(projects.requireVisibleProject).toHaveBeenCalledWith(
      user,
      taskRow.projectId,
    );
    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Renamed',
      }),
    );
    expect(result.title).toBe('Renamed');
  });

  it('rejects task updates in an inactive project', async () => {
    const db = {
      select: vi.fn().mockReturnValue(selectRows([taskRow])),
      transaction: vi.fn(),
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
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('updates task metadata and hydrates the assignees', async () => {
    const update = updateRows([{ id: taskRow.id }]);
    const assignmentDelete = deleteRows();
    const assignmentInsert = { values: vi.fn().mockResolvedValue(undefined) };
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectRows([
            { userId: taskAssignee.userId },
            { userId: secondTaskAssignee.userId },
          ]),
        )
        .mockReturnValueOnce(selectRows([taskRow]))
        .mockReturnValueOnce(
          selectRows([
            taskResponseRow({
              description: 'Updated description',
              priority: 'low',
              assignees: [taskAssignee, secondTaskAssignee],
            }),
          ]),
        ),
      update: vi.fn().mockReturnValue({ set: update.set }),
      delete: vi.fn().mockReturnValue({ where: assignmentDelete.where }),
      insert: vi.fn().mockReturnValue(assignmentInsert),
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
      description: 'Updated description',
      priority: 'low',
      assigneeIds: [taskAssignee.userId, secondTaskAssignee.userId],
    });

    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Updated description',
        priority: 'low',
      }),
    );
    expect(tx.delete).toHaveBeenCalledWith(taskAssignees);
    expect(assignmentInsert.values).toHaveBeenCalledWith([
      expect.objectContaining({ userId: taskAssignee.userId }),
      expect.objectContaining({ userId: secondTaskAssignee.userId }),
    ]);
    expect(result.assignees).toEqual([taskAssignee, secondTaskAssignee]);
  });

  it('clears nullable task metadata', async () => {
    const assignedTaskRow = {
      ...taskRow,
      description: 'Existing description',
    };
    const update = updateRows([{ id: taskRow.id }]);
    const assignmentDelete = deleteRows();
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectRows([assignedTaskRow]))
        .mockReturnValueOnce(selectRows([unassignedTaskResponseRow])),
      update: vi.fn().mockReturnValue({ set: update.set }),
      delete: vi.fn().mockReturnValue({ where: assignmentDelete.where }),
      insert: vi.fn(),
    };
    const db = {
      select: vi.fn().mockReturnValue(selectRows([assignedTaskRow])),
      transaction: vi.fn((callback) => callback(tx)),
    };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const service = new TasksService(db as never, projects as never);

    const result = await service.updateTask(user, taskRow.id, {
      description: null,
      assigneeIds: [],
    });

    expect(tx.select).toHaveBeenCalledTimes(2);
    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
      }),
    );
    expect(tx.delete).toHaveBeenCalledWith(taskAssignees);
    expect(tx.insert).not.toHaveBeenCalled();
    expect(result.description).toBeNull();
    expect(result.assignees).toEqual([]);
  });

  it('stops running time entries when closing a task', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T11:00:00.000Z'));

    try {
      const closedAt = new Date('2026-01-01T11:00:00.000Z');
      const taskUpdate = updateRows([{ id: taskRow.id }]);
      const entryWhere = vi.fn().mockResolvedValue(undefined);
      const entrySet = vi.fn().mockReturnValue({ where: entryWhere });
      const tx = {
        select: vi
          .fn()
          .mockReturnValueOnce(selectRows([taskRow]))
          .mockReturnValueOnce(
            selectRows([
              taskResponseRow({
                description: 'Closed with context',
                priority: 'high',
                status: 'closed',
                updatedAt: closedAt,
              }),
            ]),
          ),
        update: vi.fn((table) =>
          table === tasks ? { set: taskUpdate.set } : { set: entrySet },
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
        description: 'Closed with context',
        priority: 'high',
      });

      expect(result.status).toBe('closed');
      expect(result.description).toBe('Closed with context');
      expect(result.priority).toBe('high');
      expect(db.transaction).toHaveBeenCalledOnce();
      expect(tx.update).toHaveBeenCalledWith(tasks);
      expect(tx.update).toHaveBeenCalledWith(timeEntries);
      expect(taskUpdate.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'closed',
          description: 'Closed with context',
          priority: 'high',
          updatedAt: closedAt,
        }),
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

  it('uses the transactional selector for project visibility during update checks', async () => {
    const tx = {
      select: vi.fn().mockReturnValue(selectRows([taskRow])),
    };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const service = new TasksService({} as never, projects as never);

    const result = await service.requireTrackableTaskForUpdate(
      user,
      taskRow.id,
      tx as never,
    );

    expect(projects.requireVisibleProject).toHaveBeenCalledWith(
      user,
      taskRow.projectId,
      tx,
    );
    expect(result).toEqual({ task: taskRow, project: projectRow });
  });
});
