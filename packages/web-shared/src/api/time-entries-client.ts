import {
  timeEntryListResponseSchema,
  type TimeEntryListResponse,
  type TimeEntryListQuery,
} from '@gitiempo/shared';
import { requestJson } from '../http';

/* eslint-disable no-unused-vars */

interface TimeEntriesClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface TimeEntriesClient {
  listTimeEntries(
    query: TimeEntryListQuery,
    accessToken: string,
  ): Promise<TimeEntryListResponse>;
}

/* eslint-enable no-unused-vars */

export function createTimeEntriesClient({
  apiBaseUrl,
  fetchFn = fetch,
}: TimeEntriesClientOptions = {}): TimeEntriesClient {
  function buildQueryString(query: TimeEntryListQuery): string {
    const params = new URLSearchParams();
    params.set('page', String(query.page ?? 1));
    params.set('limit', String(query.limit ?? 20));
    if (query.dateFrom) params.set('dateFrom', query.dateFrom);
    if (query.dateTo) params.set('dateTo', query.dateTo);
    if (query.projectId) params.set('projectId', query.projectId);
    if (query.taskId) params.set('taskId', query.taskId);
    return params.toString();
  }

  return {
    async listTimeEntries(query, accessToken) {
      const queryString = buildQueryString(query);
      const path = `/time-entries${queryString ? `?${queryString}` : ''}`;
      return requestJson({
        fetchFn,
        apiBaseUrl,
        path,
        responseSchema: timeEntryListResponseSchema,
        accessToken,
      });
    },
  };
}
