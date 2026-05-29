import {
  createManualTimeEntrySchema,
  createTaskSchema,
  currentTimeEntryResponseSchema,
  projectListResponseSchema,
  taskResponseSchema,
  startTimerSchema,
  taskListResponseSchema,
  timeEntryListQuerySchema,
  timeEntryListResponseSchema,
  timeEntryResponseSchema,
  updateTaskSchema,
  updateTimeEntrySchema,
  type CreateManualTimeEntryInput,
  type CreateTaskInput,
  type CurrentTimeEntryResponse,
  type ProjectResponse,
  type TaskResponse,
  type TimeEntryListQuery,
  type TimeEntryListResponse,
  type TimeEntryResponse,
  type UpdateTaskInput,
  type UpdateTimeEntryInput,
} from "@gitiempo/shared";
import type { AuthenticatedApiClient } from "@gitiempo/web-shared/http";

/* eslint-disable no-unused-vars */

interface TimeEntriesClientOptions {
  apiClient: Pick<AuthenticatedApiClient, "requestJson" | "requestNoContent">;
}

export interface TimeEntriesClient {
  createManualEntry(
    input: CreateManualTimeEntryInput,
  ): Promise<TimeEntryResponse>;
  createTask(
    projectId: string,
    input: CreateTaskInput,
  ): Promise<TaskResponse>;
  deleteTask(taskId: string): Promise<void>;
  deleteEntry(entryId: string): Promise<void>;
  getCurrentTimer(): Promise<CurrentTimeEntryResponse>;
  listOwnEntries(
    query?: Partial<TimeEntryListQuery>,
  ): Promise<TimeEntryListResponse>;
  listProjectTasks(projectId: string): Promise<TaskResponse[]>;
  listVisibleProjects(): Promise<ProjectResponse[]>;
  startTimer(taskId: string): Promise<TimeEntryResponse>;
  stopTimer(): Promise<TimeEntryResponse>;
  updateEntry(
    entryId: string,
    input: UpdateTimeEntryInput,
  ): Promise<TimeEntryResponse>;
  updateTask(
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskResponse>;
}

/* eslint-enable no-unused-vars */

function buildTimeEntryListQuery(query: Partial<TimeEntryListQuery> | undefined): string {
  const parsed = timeEntryListQuerySchema.parse(query ?? {});
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(parsed.page));
  searchParams.set("limit", String(parsed.limit));

  if (parsed.dateFrom) {
    searchParams.set("dateFrom", parsed.dateFrom);
  }

  if (parsed.dateTo) {
    searchParams.set("dateTo", parsed.dateTo);
  }

  if (parsed.projectId) {
    searchParams.set("projectId", parsed.projectId);
  }

  if (parsed.taskId) {
    searchParams.set("taskId", parsed.taskId);
  }

  if (parsed.search) {
    searchParams.set("search", parsed.search);
  }

  return searchParams.toString();
}

export function createTimeEntriesClient({
  apiClient,
}: TimeEntriesClientOptions): TimeEntriesClient {
  return {
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
    getCurrentTimer() {
      return apiClient.requestJson({
        path: "/time-entries/current",
        responseSchema: currentTimeEntryResponseSchema,
      });
    },
    listOwnEntries(query) {
      const search = buildTimeEntryListQuery(query);

      return apiClient.requestJson({
        path: `/time-entries?${search}`,
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
    startTimer(taskId) {
      return apiClient.requestJson({
        body: startTimerSchema.parse({ taskId }),
        method: "POST",
        path: "/time-entries/timer/start",
        responseSchema: timeEntryResponseSchema,
      });
    },
    stopTimer() {
      return apiClient.requestJson({
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
