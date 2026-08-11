import {
  backfillTaskBillableDefaultSchema,
  createManualTimeEntrySchema,
  createTaskSchema,
  currentTimeEntryResponseSchema,
  ensureGitHubIssueTaskSchema,
  githubOwnerListResponseSchema,
  githubRepositoryIssueListResponseSchema,
  githubProjectIssueListResponseSchema,
  githubProjectListResponseSchema,
  projectListResponseSchema,
  type StartTimerFromGitHubInput,
  type StartTimerInput,
  type StopTimerInput,
  taskResponseSchema,
  taskBillableDefaultBackfillResponseSchema,
  startTimerFromGitHubSchema,
  startTimerSchema,
  stopTimerSchema,
  taskListResponseSchema,
  timeEntryListResponseSchema,
  timeEntryResponseSchema,
  updateTaskSchema,
  updateTimeEntrySchema,
  type BackfillTaskBillableDefaultInput,
  type CreateManualTimeEntryInput,
  type CreateTaskInput,
  type CurrentTimeEntryResponse,
  type EnsureGitHubIssueTaskInput,
  type GitHubIssueListQuery,
  type GitHubOwnerListResponse,
  type GitHubProjectIssueListResponse,
  type GitHubProjectListResponse,
  type GitHubRepositoryIssueListResponse,
  type ProjectResponse,
  type TaskBillableDefaultBackfillResponse,
  type TaskResponse,
  type TimeEntryListQuery,
  type TimeEntryListResponse,
  type TimeEntryResponse,
  type UpdateTaskInput,
  type UpdateTimeEntryInput,
} from "@gitiempo/shared";
import type { AuthenticatedApiClient } from "@gitiempo/web-shared/http";
import { buildTimeEntryListQueryString } from "@gitiempo/web-shared/query";


interface TimeEntriesClientOptions {
  apiClient: Pick<AuthenticatedApiClient, "requestJson" | "requestNoContent">;
}

export interface TimeEntriesClient {
  backfillTaskBillableDefault(
    taskId: string,
    input: BackfillTaskBillableDefaultInput,
  ): Promise<TaskBillableDefaultBackfillResponse>;
  createManualEntry(
    input: CreateManualTimeEntryInput,
  ): Promise<TimeEntryResponse>;
  createTask(
    projectId: string,
    input: CreateTaskInput,
  ): Promise<TaskResponse>;
  deleteTask(taskId: string): Promise<void>;
  deleteEntry(entryId: string): Promise<void>;
  ensureGitHubIssueTask(input: EnsureGitHubIssueTaskInput): Promise<TaskResponse>;
  getCurrentTimer(): Promise<CurrentTimeEntryResponse>;
  listGitHubOwners(): Promise<GitHubOwnerListResponse>;
  listGitHubProjects(
    owner: string,
    query?: { limit?: number; pageToken?: string },
  ): Promise<GitHubProjectListResponse>;
  listGitHubProjectIssues(
    githubProjectId: string,
    query?: Partial<GitHubIssueListQuery>,
  ): Promise<GitHubProjectIssueListResponse>;
  listProjectGitHubIssues(
    projectId: string,
    query?: Partial<GitHubIssueListQuery>,
  ): Promise<GitHubRepositoryIssueListResponse>;
  listOwnEntries(
    query?: Partial<TimeEntryListQuery>,
    options?: { signal?: AbortSignal },
  ): Promise<TimeEntryListResponse>;
  listProjectTimeEntries(
    projectId: string,
    query?: Partial<TimeEntryListQuery>,
  ): Promise<TimeEntryListResponse>;
  listProjectTasks(projectId: string): Promise<TaskResponse[]>;
  listVisibleProjects(): Promise<ProjectResponse[]>;
  startTimer(input: StartTimerInput): Promise<TimeEntryResponse>;
  startTimerFromGitHub(
    input: StartTimerFromGitHubInput,
  ): Promise<TimeEntryResponse>;
  stopTimer(input: StopTimerInput): Promise<TimeEntryResponse>;
  updateEntry(
    entryId: string,
    input: UpdateTimeEntryInput,
  ): Promise<TimeEntryResponse>;
  updateTask(
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskResponse>;
}


const GITHUB_PROJECT_PAGE_SIZE = 50;

export function createTimeEntriesClient({
  apiClient,
}: TimeEntriesClientOptions): TimeEntriesClient {
  return {
    backfillTaskBillableDefault(taskId, input) {
      return apiClient.requestJson({
        body: backfillTaskBillableDefaultSchema.parse(input),
        method: "POST",
        path: `/tasks/${taskId}/billable-default/backfill`,
        responseSchema: taskBillableDefaultBackfillResponseSchema,
      });
    },
    createManualEntry(input) {
      return apiClient.requestJson({
        body: createManualTimeEntrySchema.parse(input),
        method: "POST",
        path: "/time-entries",
        responseSchema: timeEntryResponseSchema,
      });
    },
    createTask(projectId, input) {
      return apiClient.requestJson({
        body: createTaskSchema.parse(input),
        method: "POST",
        path: `/projects/${projectId}/tasks`,
        responseSchema: taskListResponseSchema.element,
      });
    },
    async deleteTask(taskId) {
      await apiClient.requestNoContent({
        method: "DELETE",
        path: `/tasks/${taskId}`,
      });
    },
    async deleteEntry(entryId) {
      await apiClient.requestNoContent({
        method: "DELETE",
        path: `/time-entries/${entryId}`,
      });
    },
    ensureGitHubIssueTask(input) {
      return apiClient.requestJson({
        body: ensureGitHubIssueTaskSchema.parse(input),
        method: "POST",
        path: "/tasks/from-github",
        responseSchema: taskResponseSchema,
      });
    },
    getCurrentTimer() {
      return apiClient.requestJson({
        path: "/time-entries/current",
        responseSchema: currentTimeEntryResponseSchema,
      });
    },
    listGitHubOwners() {
      return apiClient.requestJson({
        path: "/github/owners?type=organization",
        responseSchema: githubOwnerListResponseSchema,
      });
    },
    listGitHubProjects(owner, query) {
      const search = new URLSearchParams({
        ownerType: "organization",
        owner,
        limit: String(query?.limit ?? GITHUB_PROJECT_PAGE_SIZE),
      });
      if (query?.pageToken !== undefined) {
        search.set("pageToken", query.pageToken);
      }

      return apiClient.requestJson({
        path: `/github/projects?${search.toString()}`,
        responseSchema: githubProjectListResponseSchema,
      });
    },
    listGitHubProjectIssues(githubProjectId, query) {
      const search = buildGitHubIssueQueryString(query);

      return apiClient.requestJson({
        path: `/github/projects/${encodeURIComponent(githubProjectId)}/issues?${search}`,
        responseSchema: githubProjectIssueListResponseSchema,
      });
    },
    listProjectGitHubIssues(projectId, query) {
      const search = buildGitHubIssueQueryString(query);

      return apiClient.requestJson({
        path: `/projects/${projectId}/github/issues?${search}`,
        responseSchema: githubRepositoryIssueListResponseSchema,
      });
    },
    listOwnEntries(query, options) {
      const search = buildTimeEntryListQueryString(query);

      return apiClient.requestJson({
        path: `/time-entries?${search}`,
        responseSchema: timeEntryListResponseSchema,
        signal: options?.signal,
      });
    },
    listProjectTimeEntries(projectId, query) {
      const search = buildTimeEntryListQueryString(query);

      return apiClient.requestJson({
        path: `/projects/${projectId}/time-entries?${search}`,
        responseSchema: timeEntryListResponseSchema,
      });
    },
    listProjectTasks(projectId) {
      return apiClient.requestJson({
        path: `/projects/${projectId}/tasks`,
        responseSchema: taskListResponseSchema,
      });
    },
    listVisibleProjects() {
      return apiClient.requestJson({
        path: "/projects",
        responseSchema: projectListResponseSchema,
      });
    },
    startTimer(input) {
      return apiClient.requestJson({
        body: startTimerSchema.parse(input),
        method: "POST",
        path: "/time-entries/timer/start",
        responseSchema: timeEntryResponseSchema,
      });
    },
    startTimerFromGitHub(input) {
      return apiClient.requestJson({
        body: startTimerFromGitHubSchema.parse(input),
        method: "POST",
        path: "/time-entries/timer/start-from-github",
        responseSchema: timeEntryResponseSchema,
      });
    },
    stopTimer(input) {
      return apiClient.requestJson({
        body: stopTimerSchema.parse(input),
        method: "POST",
        path: "/time-entries/timer/stop",
        responseSchema: timeEntryResponseSchema,
      });
    },
    updateEntry(entryId, input) {
      return apiClient.requestJson({
        body: updateTimeEntrySchema.parse(input),
        method: "PATCH",
        path: `/time-entries/${entryId}`,
        responseSchema: timeEntryResponseSchema,
      });
    },
    updateTask(taskId, input) {
      return apiClient.requestJson({
        body: updateTaskSchema.parse(input),
        method: "PATCH",
        path: `/tasks/${taskId}`,
        responseSchema: taskResponseSchema,
      });
    },
  };
}

function buildGitHubIssueQueryString(
  query: Partial<GitHubIssueListQuery> | undefined,
): string {
  const search = new URLSearchParams();

  search.set("limit", String(query?.limit ?? 30));
  search.set("state", query?.state ?? "open");

  if (query?.pageToken) {
    search.set("pageToken", query.pageToken);
  }

  if (query?.q) {
    search.set("q", query.q);
  }

  return search.toString();
}
