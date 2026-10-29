import type {
  ProjectResponse,
  TaskResponse,
  TimeEntryResponse,
} from '@gitiempo/shared';
import type { QueryClient } from '@tanstack/vue-query';

import {
  timeEntriesKeys,
  timerKeys,
  userProjectsKeys,
  type EligibleLastEntryRefreshWave,
  type UserServerStateScope,
} from '@/lib/query-keys';
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

interface LoadEligibleLastTrackedContextOptions {
  client: LastTrackedContextClient;
  queryClient: QueryClient;
  signal?: AbortSignal;
  scope: UserServerStateScope;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  }
}

function getExactQuery(queryClient: QueryClient, queryKey: readonly unknown[]) {
  return queryClient.getQueryCache().find({ exact: true, queryKey });
}

function isCurrentWave(
  queryClient: QueryClient,
  scope: UserServerStateScope,
  wave: EligibleLastEntryRefreshWave | null,
): boolean {
  if (!wave) {
    return false;
  }

  const currentQuery = getExactQuery(queryClient, timerKeys.currentRaw(scope));

  return (
    currentQuery?.state.isInvalidated === false &&
    currentQuery.state.dataUpdateCount === wave.currentRawDataUpdateCount + 1
  );
}

async function fetchAuthoritativeResource<T>({
  queryClient,
  queryFn,
  queryKey,
  scope,
  wave,
}: {
  queryClient: QueryClient;
  queryFn(): Promise<T>;
  queryKey: readonly unknown[];
  scope: UserServerStateScope;
  wave: EligibleLastEntryRefreshWave | null;
}): Promise<T> {
  const query = getExactQuery(queryClient, queryKey);
  const baseline =
    query && wave ? (wave.queryVersions[query.queryHash] ?? 0) : undefined;

  if (
    isCurrentWave(queryClient, scope, wave) &&
    baseline !== undefined &&
    query?.state.data !== undefined &&
    !query.state.isInvalidated &&
    query.state.dataUpdateCount > baseline
  ) {
    return query.state.data as T;
  }

  if (!isCurrentWave(queryClient, scope, wave)) {
    return queryFn();
  }

  if (query?.options.queryFn) {
    return query.fetch() as Promise<T>;
  }

  return queryClient.fetchQuery({ queryKey, queryFn });
}

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

export async function loadEligibleLastTrackedContext({
  client,
  queryClient,
  scope,
  signal,
}: LoadEligibleLastTrackedContextOptions): Promise<SelectedTaskContext | null> {
  const waveKey = timerKeys.eligibleLastEntryWave(scope);
  const wave =
    queryClient.getQueryData<EligibleLastEntryRefreshWave>(waveKey) ?? null;
  const response = await fetchAuthoritativeResource({
    queryClient,
    queryKey: timeEntriesKeys.list(scope, { limit: 1 }),
    queryFn: () => client.listOwnEntries({ limit: 1 }),
    scope,
    wave,
  });
  throwIfAborted(signal);
  const entry = response.items[0] ?? null;

  if (!entry) {
    return null;
  }

  const visibleProjects = await fetchAuthoritativeResource({
    queryClient,
    queryKey: userProjectsKeys.visibleProjects(scope),
    queryFn: () => client.listVisibleProjects(),
    scope,
    wave,
  });
  throwIfAborted(signal);
  const project = visibleProjects.find(
    (candidate) => candidate.id === entry.project.id && candidate.isActive,
  );

  if (!project) {
    return null;
  }

  const projectTasks = await fetchAuthoritativeResource({
    queryClient,
    queryKey: userProjectsKeys.projectTasks(
      scope,
      project.id,
      project.accessScope,
    ),
    queryFn: () => client.listProjectTasks(project.id),
    scope,
    wave,
  });
  throwIfAborted(signal);

  return resolveEligibleLastTrackedContext({
    entry,
    projectTasks,
    visibleProjects,
  });
}
