import type { TimeEntryListQuery } from "@gitiempo/shared";

export interface UserServerStateScope {
  userId?: string | null;
  workspaceId?: string | null;
}

type QueryKey = readonly unknown[];

function normalizeString(value: string | null | undefined): string | null {
  const next = value?.trim();
  return next ? next : null;
}

function normalizeScope(scope: UserServerStateScope = {}) {
  return {
    userId: normalizeString(scope.userId),
    workspaceId: normalizeString(scope.workspaceId),
  };
}

export function normalizeTimeEntryListQuery(
  query: Partial<TimeEntryListQuery> = {},
) {
  return {
    dateFrom: query.dateFrom ?? null,
    dateTo: query.dateTo ?? null,
    limit: query.limit ?? null,
    page: query.page ?? null,
    projectId: query.projectId ?? null,
    search: query.search ?? null,
    taskId: query.taskId ?? null,
  };
}

export type NormalizedTimeEntryListQuery = ReturnType<typeof normalizeTimeEntryListQuery>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readTimeEntryListQueryKey(
  queryKey: QueryKey,
): NormalizedTimeEntryListQuery | null {
  const [, , feature, queryType, maybeQuery] = queryKey;

  if (
    feature !== "time-entries" ||
    (queryType !== "list" && queryType !== "list-all") ||
    !isRecord(maybeQuery)
  ) {
    return null;
  }

  return normalizeTimeEntryListQuery(maybeQuery as Partial<TimeEntryListQuery>);
}

export const timeEntriesKeys = {
  all: (scope?: UserServerStateScope) =>
    ["user-web", normalizeScope(scope), "time-entries"] as const,
  allList: (scope: UserServerStateScope, query?: Partial<TimeEntryListQuery>) =>
    [...timeEntriesKeys.all(scope), "list-all", normalizeTimeEntryListQuery(query)] as const,
  detail: (scope: UserServerStateScope, entryId: string | null | undefined) =>
    [...timeEntriesKeys.all(scope), "detail", normalizeString(entryId)] as const,
  list: (scope: UserServerStateScope, query?: Partial<TimeEntryListQuery>) =>
    [...timeEntriesKeys.all(scope), "list", normalizeTimeEntryListQuery(query)] as const,
};

export const timerKeys = {
  all: (scope?: UserServerStateScope) =>
    ["user-web", normalizeScope(scope), "top-bar-timer"] as const,
  current: (scope: UserServerStateScope) => [...timerKeys.all(scope), "current"] as const,
  eligibleLastEntry: (
    scope: UserServerStateScope,
    query?: Partial<TimeEntryListQuery>,
  ) => [...timerKeys.all(scope), "eligible-last-entry", normalizeTimeEntryListQuery(query)] as const,
  githubConnection: (scope: UserServerStateScope) =>
    [...timerKeys.all(scope), "github-connection"] as const,
  githubOwners: (scope: UserServerStateScope) =>
    [...timerKeys.all(scope), "github-owners"] as const,
  githubProjectIssues: (
    scope: UserServerStateScope,
    projectId: string | null | undefined,
  ) => [...timerKeys.all(scope), "github-project-issues", normalizeString(projectId)] as const,
  githubProjects: (
    scope: UserServerStateScope,
    ownerType: string,
    owner?: string | null,
  ) => [...timerKeys.all(scope), "github-projects", ownerType, normalizeString(owner)] as const,
  githubRepositories: (
    scope: UserServerStateScope,
    ownerType: string,
    owner?: string | null,
  ) => [...timerKeys.all(scope), "github-repositories", ownerType, normalizeString(owner)] as const,
  githubRepositoryIssues: (
    scope: UserServerStateScope,
    owner: string | null | undefined,
    repo: string | null | undefined,
  ) => [
    ...timerKeys.all(scope),
    "github-repository-issues",
    normalizeString(owner),
    normalizeString(repo),
  ] as const,
  projectTasks: (scope: UserServerStateScope, projectId: string | null | undefined) =>
    [...timerKeys.all(scope), "project-tasks", normalizeString(projectId)] as const,
  visibleProjects: (scope: UserServerStateScope) =>
    [...timerKeys.all(scope), "visible-projects"] as const,
};

export const userProjectsKeys = {
  all: (scope?: UserServerStateScope) =>
    ["user-web", normalizeScope(scope), "projects"] as const,
  page: (scope: UserServerStateScope) =>
    [...userProjectsKeys.all(scope), "page"] as const,
  projectTasks: (scope: UserServerStateScope, projectId: string | null | undefined) =>
    [...userProjectsKeys.all(scope), "project-tasks", normalizeString(projectId)] as const,
  visibleProjects: (scope: UserServerStateScope) =>
    [...userProjectsKeys.all(scope), "visible-projects"] as const,
};

export const userMutationInvalidationKeys = {
  afterTaskMutation(scope: UserServerStateScope, projectId: string): QueryKey[] {
    return [
      userProjectsKeys.all(scope),
      userProjectsKeys.projectTasks(scope, projectId),
      timerKeys.all(scope),
    ];
  },
  afterTimeEntryMutation(scope: UserServerStateScope): QueryKey[] {
    return [
      timeEntriesKeys.all(scope),
      timerKeys.all(scope),
    ];
  },
  afterTimerMutation(scope: UserServerStateScope): QueryKey[] {
    return [
      timerKeys.all(scope),
      timeEntriesKeys.all(scope),
    ];
  },
};
