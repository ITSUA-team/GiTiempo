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
  defaultBillableForTasks: true,
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
  defaultBillableForTimeEntries: true,
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

function collectSqlParamValues(value: unknown): unknown[] {
  const values: unknown[] = [];
  const seen = new WeakSet<object>();

  const visit = (candidate: unknown): void => {
    if (candidate === null || candidate === undefined) return;
    if (typeof candidate !== 'object') {
      values.push(candidate);
      return;
    }
    if (seen.has(candidate)) return;

    seen.add(candidate);
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if ('queryChunks' in candidate) {
      visit((candidate as { queryChunks: unknown }).queryChunks);
      return;
    }
    if ('value' in candidate) {
      visit((candidate as { value: unknown }).value);
    }
  };

  visit(value);

  return values;
}

function createService(
  db: unknown,
  projects: { requireVisibleProject?: ReturnType<typeof vi.fn> },
  overrides: {
    github?: Partial<{
      getRepositoryIssue: ReturnType<typeof vi.fn>;
      listRepositoryIssues: ReturnType<typeof vi.fn>;
    }>;
    githubTasks?: Partial<{
      findOrCreateTaskForIssue: ReturnType<typeof vi.fn>;
      findProjectRepoKey: ReturnType<typeof vi.fn>;
    }>;
  } = {},
): TasksService {
  return new TasksService(
    db as never,
    {
      getRepositoryIssue: vi.fn(),
      listRepositoryIssues: vi.fn(),
      ...overrides.github,
    } as never,
    {
      findOrCreateTaskForIssue: vi.fn(),
      findProjectRepoKey: vi.fn(),
      ...overrides.githubTasks,
    } as never,
    projects as never,
  );
}

describe('TasksService', () => {
  it('includes synced github issue linkage in project task lists', async () => {
    const listRows = [
      {
        ...taskRow,
        githubIssueExternalKey: 'octo/repo#184',
      },
      {
        ...taskRow,
        id: 'task-2',
        githubIssueExternalKey: null,
      },
    ];
    const where = vi.fn().mockResolvedValue(listRows);
    const leftJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ leftJoin });
    const db = {
      select: vi.fn().mockReturnValue({ from }),
    };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const service = createService(db, projects);

    const result = await service.listProjectTasks(user, projectRow.id);

    expect(result).toEqual([
      expect.objectContaining({
        id: taskRow.id,
        githubIssue: {
          githubRepo: 'octo/repo',
          issueNumber: 184,
        },
      }),
      expect.objectContaining({
        id: 'task-2',
        githubIssue: null,
      }),
    ]);
    expect(projects.requireVisibleProject).toHaveBeenCalledWith(
      user,
      projectRow.id,
    );
    expect(collectSqlParamValues(where.mock.calls[0]?.[0])).toEqual(
      expect.arrayContaining([user.workspaceId, projectRow.id]),
    );
    expect(collectSqlParamValues(where.mock.calls[0]?.[0])).toContain(true);
  });

  it('can include inactive historical tasks for backfill detection', async () => {
    const listRows = [
      {
        ...taskRow,
        githubIssueExternalKey: null,
        isActive: false,
      },
    ];
    const where = vi.fn().mockResolvedValue(listRows);
    const leftJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ leftJoin });
    const db = {
      select: vi.fn().mockReturnValue({ from }),
    };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const service = createService(db, projects);

    const result = await service.listProjectTasks(user, projectRow.id, {
      includeInactive: true,
    });

    expect(result[0]?.isActive).toBe(false);
    expect(collectSqlParamValues(where.mock.calls[0]?.[0])).toEqual(
      expect.arrayContaining([user.workspaceId, projectRow.id]),
    );
    expect(collectSqlParamValues(where.mock.calls[0]?.[0])).not.toContain(true);
  });

  it('rejects task creation in an inactive project', async () => {
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue({
        ...projectRow,
        isActive: false,
      }),
    };
    const db = { insert: vi.fn() };
    const service = createService(db, projects);

    await expect(
      service.createTask(user, projectRow.id, { title: 'Task' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('inherits the project billable default when creating a task', async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        ...taskRow,
        defaultBillableForTimeEntries: false,
      },
    ]);
    const values = vi.fn().mockReturnValue({ returning });
    const db = { insert: vi.fn().mockReturnValue({ values }) };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue({
        ...projectRow,
        defaultBillableForTasks: false,
      }),
    };
    const service = createService(db, projects);

    const result = await service.createTask(user, projectRow.id, {
      title: 'Task',
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultBillableForTimeEntries: false,
      }),
    );
    expect(result.defaultBillableForTimeEntries).toBe(false);
  });

  it('allows task creates to override the inherited billable default', async () => {
    const returning = vi.fn().mockResolvedValue([taskRow]);
    const values = vi.fn().mockReturnValue({ returning });
    const db = { insert: vi.fn().mockReturnValue({ values }) };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue({
        ...projectRow,
        defaultBillableForTasks: false,
      }),
    };
    const service = createService(db, projects);

    const result = await service.createTask(user, projectRow.id, {
      title: 'Task',
      defaultBillableForTimeEntries: true,
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultBillableForTimeEntries: true,
      }),
    );
    expect(result.defaultBillableForTimeEntries).toBe(true);
  });

  it('lists project github issues through the local project mapping', async () => {
    const github = {
      listRepositoryIssues: vi.fn().mockResolvedValue({
        items: [],
        pagination: { limit: 30, hasNextPage: false, nextPageToken: null },
      }),
    };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue({
        ...projectRow,
        name: 'Visible project',
      }),
    };
    const service = createService({}, projects, {
      github,
      githubTasks: {
        findProjectRepoKey: vi.fn().mockResolvedValue('octo-org/repo-name'),
      },
    });

    const result = await service.listProjectGitHubIssues(user, projectRow.id, {
      limit: 30,
      state: 'open',
    });

    expect(result.pagination.limit).toBe(30);
    expect(github.listRepositoryIssues).toHaveBeenCalledWith(
      user,
      'octo-org',
      'repo-name',
      { limit: 30, state: 'open' },
    );
  });

  it('rejects project github issue browsing without a repository mapping', async () => {
    const github = {
      listRepositoryIssues: vi.fn(),
    };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue({
        ...projectRow,
        name: 'Project without repository mapping',
      }),
    };
    const service = createService({}, projects, {
      github,
      githubTasks: {
        findProjectRepoKey: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.listProjectGitHubIssues(user, projectRow.id, {
        limit: 30,
        state: 'open',
      }),
    ).rejects.toThrow('GitHub project not found');
    expect(github.listRepositoryIssues).not.toHaveBeenCalled();
  });

  it('materializes a github issue task from the visible project mapping', async () => {
    const github = {
      getRepositoryIssue: vi.fn().mockResolvedValue({
        id: 'issue-184',
        nodeId: 'node-184',
        repository: {
          owner: 'octo-org',
          name: 'repo-name',
          fullName: 'octo-org/repo-name',
        },
        number: 184,
        title: 'Provider title',
        state: 'open',
        url: 'https://github.com/octo-org/repo-name/issues/184',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    };
    const githubTasks = {
      findProjectRepoKey: vi.fn().mockResolvedValue('octo-org/repo-name'),
      findOrCreateTaskForIssue: vi.fn().mockResolvedValue({
        ...taskRow,
        title: 'Provider title',
      }),
    };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue({
        ...projectRow,
        defaultBillableForTasks: false,
      }),
    };
    const db = {
      transaction: vi.fn((callback) => callback({})),
    };
    const service = createService(db, projects, { github, githubTasks });

    const result = await service.ensureGitHubIssueTask(user, {
      projectId: projectRow.id,
      issueNumber: 184,
    });

    expect(github.getRepositoryIssue).toHaveBeenCalledWith(
      user,
      'octo-org',
      'repo-name',
      184,
    );
    expect(githubTasks.findOrCreateTaskForIssue).toHaveBeenCalledWith(
      {},
      {
        workspaceId: user.workspaceId,
        projectId: projectRow.id,
        issueKey: 'octo-org/repo-name#184',
        issueTitle: 'Provider title',
        defaultBillableForTimeEntries: false,
      },
    );
    expect(result.title).toBe('Provider title');
    expect(result.githubIssue).toEqual({
      githubRepo: 'octo-org/repo-name',
      issueNumber: 184,
    });
  });

  it('rejects closed github issues before creating a local task', async () => {
    const github = {
      getRepositoryIssue: vi.fn().mockResolvedValue({
        id: 'issue-184',
        nodeId: 'node-184',
        repository: {
          owner: 'octo-org',
          name: 'repo-name',
          fullName: 'octo-org/repo-name',
        },
        number: 184,
        title: 'Closed provider issue',
        state: 'closed',
        url: 'https://github.com/octo-org/repo-name/issues/184',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    };
    const githubTasks = {
      findProjectRepoKey: vi.fn().mockResolvedValue('octo-org/repo-name'),
      findOrCreateTaskForIssue: vi.fn(),
    };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const db = {
      transaction: vi.fn((callback) => callback({})),
    };
    const service = createService(db, projects, { github, githubTasks });

    await expect(
      service.ensureGitHubIssueTask(user, {
        projectId: projectRow.id,
        issueNumber: 184,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(githubTasks.findOrCreateTaskForIssue).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
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
    const service = createService(db, projects);

    const result = await service.updateTask(user, taskRow.id, {
      title: 'Renamed',
    });

    expect(projects.requireVisibleProject).toHaveBeenCalledWith(
      user,
      taskRow.projectId,
      db,
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Renamed',
      }),
    );
    expect(result.title).toBe('Renamed');
  });

  it('saves task billable defaults without backfilling time entries', async () => {
    const updatedTask = {
      ...taskRow,
      defaultBillableForTimeEntries: false,
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
    const service = createService(db, projects);

    const result = await service.updateTask(user, taskRow.id, {
      defaultBillableForTimeEntries: false,
    });

    expect(db.update).toHaveBeenCalledWith(tasks);
    expect(db.update).not.toHaveBeenCalledWith(timeEntries);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultBillableForTimeEntries: false,
      }),
    );
    expect(result.defaultBillableForTimeEntries).toBe(false);
  });

  it('backfills a task billable default to existing time entries', async () => {
    const updatedEntries = [{ id: 'entry-1' }, { id: 'entry-2' }];
    const returning = vi.fn().mockResolvedValue(updatedEntries);
    const set = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning }),
    });
    const tx = {
      select: vi.fn().mockReturnValue(
        selectRows([
          {
            ...taskRow,
            defaultBillableForTimeEntries: false,
          },
        ]),
      ),
      update: vi.fn().mockReturnValue({ set }),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const service = createService(db, projects);

    const result = await service.backfillBillableDefault(user, taskRow.id, {
      updateTimeEntries: true,
    });

    expect(result).toEqual({ timeEntriesUpdated: 2 });
    expect(tx.update).toHaveBeenCalledWith(timeEntries);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        isBillable: false,
      }),
    );
  });

  it('rejects task billable default backfill when time entries are unselected', async () => {
    const tx = {
      select: vi.fn().mockReturnValue(selectRows([{ ...taskRow }])),
      update: vi.fn(),
    };
    const db = { transaction: vi.fn((callback) => callback(tx)) };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const service = new TasksService(db as never, projects as never);

    await expect(
      service.backfillBillableDefault(user, taskRow.id, {
        updateTimeEntries: false,
      } as never),
    ).rejects.toThrow('Task backfill requires selected time entries');
    expect(tx.update).not.toHaveBeenCalled();
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
    const service = createService(db, projects);

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
      const service = createService(db, projects);

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
    const service = createService(db, projects);

    await expect(
      service.requireTrackableTask(user, taskRow.id),
    ).rejects.toThrow('Task is closed');
  });

  it('uses the transactional selector for project visibility during update checks', async () => {
    const tx = {
      select: vi.fn().mockReturnValue(selectRowsForUpdate([taskRow])),
    };
    const projects = {
      requireVisibleProject: vi.fn().mockResolvedValue(projectRow),
    };
    const service = createService({}, projects);

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
