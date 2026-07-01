import type {
  ProjectResponse,
  TaskResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from '@gitiempo/shared';
import { describe, expect, it, vi } from 'vitest';

import {
  loadEligibleLastTrackedContext,
  resolveEligibleLastTrackedContext,
} from './top-bar-timer-last-context';
import type { TimeEntriesClient } from '@/services/time-entries-client';

const TEST_IDS = {
  project: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9101',
  task: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9201',
  user: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9301',
  workspace: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9401',
} as const;

function createProject(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    color: null,
    createdAt: '2026-04-20T12:00:00.000Z',
    defaultBillableForTasks: true,
    description: null,
    id: TEST_IDS.project,
    isActive: true,
    members: [],
    name: 'Project Orion',
    source: 'manual',
    totalSeconds: 43200,
    updatedAt: '2026-04-20T12:00:00.000Z',
    visibility: 'public',
    workspaceId: TEST_IDS.workspace,
    ...overrides,
  };
}

function createTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    createdAt: '2026-04-20T12:00:00.000Z',
    defaultBillableForTimeEntries: true,
    githubIssue: null,
    id: TEST_IDS.task,
    isActive: true,
    projectId: TEST_IDS.project,
    status: 'open',
    title: 'Improve reports filters',
    updatedAt: '2026-04-20T12:00:00.000Z',
    workspaceId: TEST_IDS.workspace,
    ...overrides,
  };
}

function createCompletedEntry(
  overrides: Partial<TimeEntryResponse> = {},
): TimeEntryResponse {
  return {
    createdAt: '2026-04-21T09:00:00.000Z',
    description: null,
    durationSeconds: 3600,
    endedAt: '2026-04-21T10:00:00.000Z',
    githubIssue: null,
    id: '018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001',
    isBillable: true,
    project: { id: TEST_IDS.project, name: 'Project Orion' },
    projectId: TEST_IDS.project,
    source: 'manual',
    startedAt: '2026-04-21T09:00:00.000Z',
    task: { id: TEST_IDS.task, title: 'Improve reports filters' },
    taskId: TEST_IDS.task,
    updatedAt: '2026-04-21T10:00:00.000Z',
    user: {
      avatarUrl: null,
      displayName: 'Alexey Tsukanov',
      email: 'alexey@example.com',
      id: TEST_IDS.user,
    },
    userId: TEST_IDS.user,
    workspaceId: TEST_IDS.workspace,
    ...overrides,
  };
}

function createOwnEntriesResponse(
  items: TimeEntryResponse[],
): TimeEntryListResponse {
  return {
    items,
    meta: {
      limit: 1,
      page: 1,
      total: items.length,
      totalPages: 1,
    },
  };
}

function createClientMock(overrides?: {
  entries?: TimeEntryResponse[];
  projects?: ProjectResponse[];
  tasks?: TaskResponse[];
}): Pick<
  TimeEntriesClient,
  'listOwnEntries' | 'listProjectTasks' | 'listVisibleProjects'
> & {
  listOwnEntries: ReturnType<typeof vi.fn<TimeEntriesClient['listOwnEntries']>>;
  listProjectTasks: ReturnType<
    typeof vi.fn<TimeEntriesClient['listProjectTasks']>
  >;
  listVisibleProjects: ReturnType<
    typeof vi.fn<TimeEntriesClient['listVisibleProjects']>
  >;
} {
  return {
    listOwnEntries: vi.fn(async () =>
      createOwnEntriesResponse(overrides?.entries ?? []),
    ),
    listProjectTasks: vi.fn(async () => overrides?.tasks ?? []),
    listVisibleProjects: vi.fn(async () => overrides?.projects ?? []),
  };
}

describe('resolveEligibleLastTrackedContext', () => {
  it('returns the selected task context for the last visible open task', () => {
    const context = resolveEligibleLastTrackedContext({
      entry: createCompletedEntry(),
      projectTasks: [
        createTask({
          githubIssue: { githubRepo: 'octo/repo', issueNumber: 184 },
        }),
      ],
      visibleProjects: [createProject()],
    });

    expect(context).toEqual({
      githubIssue: { githubRepo: 'octo/repo', issueNumber: 184 },
      projectId: TEST_IDS.project,
      projectName: 'Project Orion',
      source: 'local',
      taskId: TEST_IDS.task,
      taskTitle: 'Improve reports filters',
    });
  });

  it('rejects hidden or inactive projects', () => {
    expect(
      resolveEligibleLastTrackedContext({
        entry: createCompletedEntry(),
        projectTasks: [createTask()],
        visibleProjects: [createProject({ isActive: false })],
      }),
    ).toBeNull();
  });

  it('rejects inactive or closed tasks', () => {
    expect(
      resolveEligibleLastTrackedContext({
        entry: createCompletedEntry(),
        projectTasks: [createTask({ status: 'closed' })],
        visibleProjects: [createProject()],
      }),
    ).toBeNull();
  });
});

describe('loadEligibleLastTrackedContext', () => {
  it('loads only the most recent own entry before resolving context', async () => {
    const client = createClientMock({
      entries: [createCompletedEntry()],
      projects: [createProject()],
      tasks: [createTask()],
    });

    const context = await loadEligibleLastTrackedContext(client);

    expect(client.listOwnEntries).toHaveBeenCalledWith({ limit: 1 });
    expect(client.listVisibleProjects).toHaveBeenCalledWith();
    expect(client.listProjectTasks).toHaveBeenCalledWith(TEST_IDS.project);
    expect(context?.taskId).toBe(TEST_IDS.task);
  });

  it('skips project and task loading when no recent entry exists', async () => {
    const client = createClientMock();

    await expect(loadEligibleLastTrackedContext(client)).resolves.toBeNull();

    expect(client.listVisibleProjects).not.toHaveBeenCalled();
    expect(client.listProjectTasks).not.toHaveBeenCalled();
  });
});
