import type {
  ProjectResponse,
  TaskResponse,
  TimeEntryResponse,
} from '@gitiempo/shared';

import type { TimeEntriesClient } from '@/services/time-entries-client';

import type { SelectedTaskContext } from './top-bar-timer-helpers';

interface ResolveEligibleLastTrackedContextInput {
  entry: TimeEntryResponse | null;
  projectTasks: TaskResponse[];
  visibleProjects: ProjectResponse[];
}

type LastTrackedContextClient = Pick<
  TimeEntriesClient,
  'listOwnEntries' | 'listProjectTasks' | 'listVisibleProjects'
>;

export function resolveEligibleLastTrackedContext({
  entry,
  projectTasks,
  visibleProjects,
}: ResolveEligibleLastTrackedContextInput): SelectedTaskContext | null {
  if (!entry) {
    return null;
  }

  const project = visibleProjects.find(
    (candidate) => candidate.id === entry.project.id && candidate.isActive,
  );

  if (!project) {
    return null;
  }

  const task = projectTasks.find(
    (candidate) =>
      candidate.id === entry.task.id &&
      candidate.isActive &&
      candidate.status === 'open',
  );

  if (!task) {
    return null;
  }

  return {
    githubIssue: task.githubIssue,
    projectId: project.id,
    projectName: project.name,
    source: 'local',
    taskId: task.id,
    taskTitle: task.title,
  };
}

export async function loadEligibleLastTrackedContext(
  client: LastTrackedContextClient,
): Promise<SelectedTaskContext | null> {
  const response = await client.listOwnEntries({ limit: 1 });
  const entry = response.items[0] ?? null;

  if (!entry) {
    return null;
  }

  const visibleProjects = await client.listVisibleProjects();
  const project = visibleProjects.find(
    (candidate) => candidate.id === entry.project.id && candidate.isActive,
  );

  if (!project) {
    return null;
  }

  const projectTasks = await client.listProjectTasks(project.id);

  return resolveEligibleLastTrackedContext({
    entry,
    projectTasks,
    visibleProjects,
  });
}
