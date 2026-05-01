import {
  createManualTimeEntrySchema,
  currentTimeEntryResponseSchema,
  projectListResponseSchema,
  startTimerSchema,
  taskListResponseSchema,
  timeEntryResponseSchema,
  type CreateManualTimeEntryInput,
  type CurrentTimeEntryResponse,
  type ProjectResponse,
  type TaskResponse,
  type TimeEntryResponse,
} from "@gitiempo/shared";
import { requestJson } from "@gitiempo/web-shared/http";

/* eslint-disable no-unused-vars */

interface TimerPageClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface TimerPageClient {
  createManualEntry(
    accessToken: string,
    input: CreateManualTimeEntryInput,
  ): Promise<TimeEntryResponse>;
  getCurrentTimer(accessToken: string): Promise<CurrentTimeEntryResponse>;
  listProjectTasks(accessToken: string, projectId: string): Promise<TaskResponse[]>;
  listVisibleProjects(accessToken: string): Promise<ProjectResponse[]>;
  startTimer(accessToken: string, taskId: string): Promise<TimeEntryResponse>;
  stopTimer(accessToken: string): Promise<TimeEntryResponse>;
}

/* eslint-enable no-unused-vars */

export function createTimerPageClient({
  apiBaseUrl,
  fetchFn = fetch,
}: TimerPageClientOptions = {}): TimerPageClient {
  return {
    createManualEntry(accessToken, input) {
      return requestJson({
        accessToken,
        apiBaseUrl,
        body: createManualTimeEntrySchema.parse(input),
        fetchFn,
        method: "POST",
        path: "/time-entries",
        responseSchema: timeEntryResponseSchema,
      });
    },
    getCurrentTimer(accessToken) {
      return requestJson({
        accessToken,
        apiBaseUrl,
        fetchFn,
        path: "/time-entries/current",
        responseSchema: currentTimeEntryResponseSchema,
      });
    },
    listProjectTasks(accessToken, projectId) {
      return requestJson({
        accessToken,
        apiBaseUrl,
        fetchFn,
        path: `/projects/${projectId}/tasks`,
        responseSchema: taskListResponseSchema,
      });
    },
    listVisibleProjects(accessToken) {
      return requestJson({
        accessToken,
        apiBaseUrl,
        fetchFn,
        path: "/projects",
        responseSchema: projectListResponseSchema,
      });
    },
    startTimer(accessToken, taskId) {
      return requestJson({
        accessToken,
        apiBaseUrl,
        body: startTimerSchema.parse({ taskId }),
        fetchFn,
        method: "POST",
        path: "/time-entries/timer/start",
        responseSchema: timeEntryResponseSchema,
      });
    },
    stopTimer(accessToken) {
      return requestJson({
        accessToken,
        apiBaseUrl,
        fetchFn,
        method: "POST",
        path: "/time-entries/timer/stop",
        responseSchema: timeEntryResponseSchema,
      });
    },
  };
}
