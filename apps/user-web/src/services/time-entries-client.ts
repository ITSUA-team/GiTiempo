import {
  createManualTimeEntrySchema,
  createTaskSchema,
  currentTimeEntryResponseSchema,
  projectListResponseSchema,
  startTimerSchema,
  taskListResponseSchema,
  timeEntryListQuerySchema,
  timeEntryListResponseSchema,
  timeEntryResponseSchema,
  updateTimeEntrySchema,
  type CreateManualTimeEntryInput,
  type CreateTaskInput,
  type CurrentTimeEntryResponse,
  type ProjectResponse,
  type TaskResponse,
  type TimeEntryListQuery,
  type TimeEntryListResponse,
  type TimeEntryResponse,
  type UpdateTimeEntryInput,
} from "@gitiempo/shared";
import {
  getRequestUrl,
  getResponseErrorMessage,
  requestJson,
} from "@gitiempo/web-shared/http";

/* eslint-disable no-unused-vars */

interface TimeEntriesClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface TimeEntriesClient {
  createManualEntry(
    accessToken: string,
    input: CreateManualTimeEntryInput,
  ): Promise<TimeEntryResponse>;
  createTask(
    accessToken: string,
    projectId: string,
    input: CreateTaskInput,
  ): Promise<TaskResponse>;
  deleteEntry(accessToken: string, entryId: string): Promise<void>;
  getCurrentTimer(accessToken: string): Promise<CurrentTimeEntryResponse>;
  listOwnEntries(
    accessToken: string,
    query?: Partial<TimeEntryListQuery>,
  ): Promise<TimeEntryListResponse>;
  listProjectTasks(accessToken: string, projectId: string): Promise<TaskResponse[]>;
  listVisibleProjects(accessToken: string): Promise<ProjectResponse[]>;
  startTimer(accessToken: string, taskId: string): Promise<TimeEntryResponse>;
  stopTimer(accessToken: string): Promise<TimeEntryResponse>;
  updateEntry(
    accessToken: string,
    entryId: string,
    input: UpdateTimeEntryInput,
  ): Promise<TimeEntryResponse>;
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
  apiBaseUrl,
  fetchFn = fetch,
}: TimeEntriesClientOptions = {}): TimeEntriesClient {
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
    createTask(accessToken, projectId, input) {
      return requestJson({
        accessToken,
        apiBaseUrl,
        body: createTaskSchema.parse(input),
        fetchFn,
        method: "POST",
        path: `/projects/${projectId}/tasks`,
        responseSchema: taskListResponseSchema.element,
      });
    },
    async deleteEntry(accessToken, entryId) {
      const response = await fetchFn(getRequestUrl(apiBaseUrl, `/time-entries/${entryId}`), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }
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
    listOwnEntries(accessToken, query) {
      const search = buildTimeEntryListQuery(query);

      return requestJson({
        accessToken,
        apiBaseUrl,
        fetchFn,
        path: `/time-entries?${search}`,
        responseSchema: timeEntryListResponseSchema,
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
    updateEntry(accessToken, entryId, input) {
      return requestJson({
        accessToken,
        apiBaseUrl,
        body: updateTimeEntrySchema.parse(input),
        fetchFn,
        method: "PATCH",
        path: `/time-entries/${entryId}`,
        responseSchema: timeEntryResponseSchema,
      });
    },
  };
}
