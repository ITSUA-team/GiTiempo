import {
  backfillTaskBillableDefaultSchema,
  createManualTimeEntrySchema,
  createTaskSchema,
  currentTimeEntryResponseSchema,
  projectListResponseSchema,
  type StartTimerInput,
  taskResponseSchema,
  taskBillableDefaultBackfillResponseSchema,
  startTimerSchema,
  taskListResponseSchema,
  timeEntryListResponseSchema,
  timeEntryResponseSchema,
  updateTaskSchema,
  updateTimeEntrySchema,
  type BackfillTaskBillableDefaultInput,
  type CreateManualTimeEntryInput,
  type CreateTaskInput,
  type CurrentTimeEntryResponse,
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

/* eslint-disable no-unused-vars */

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
  getCurrentTimer(): Promise<CurrentTimeEntryResponse>;
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
    getCurrentTimer() {
      return apiClient.requestJson({
        path: "/time-entries/current",
        responseSchema: currentTimeEntryResponseSchema,
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
