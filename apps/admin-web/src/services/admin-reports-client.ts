import {
  timeEntryListQuerySchema,
  timeEntryListResponseSchema,
  type TimeEntryListQuery,
  type TimeEntryListResponse,
} from '@gitiempo/shared';
import { requestJson } from '@gitiempo/web-shared/http';

/* eslint-disable no-unused-vars */

interface AdminReportsClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface AdminReportsClient {
  listProjectEntries(
    accessToken: string,
    projectId: string,
    query?: Partial<TimeEntryListQuery>,
  ): Promise<TimeEntryListResponse>;
}

/* eslint-enable no-unused-vars */

export function buildProjectTimeEntriesQuery(
  query: Partial<TimeEntryListQuery> | undefined,
): string {
  const parsed = timeEntryListQuerySchema.parse(query ?? {});
  const searchParams = new URLSearchParams();

  searchParams.set('page', String(parsed.page));
  searchParams.set('limit', String(parsed.limit));

  if (parsed.dateFrom) {
    searchParams.set('dateFrom', parsed.dateFrom);
  }

  if (parsed.dateTo) {
    searchParams.set('dateTo', parsed.dateTo);
  }

  if (parsed.projectId) {
    searchParams.set('projectId', parsed.projectId);
  }

  if (parsed.taskId) {
    searchParams.set('taskId', parsed.taskId);
  }

  if (parsed.search) {
    searchParams.set('search', parsed.search);
  }

  return searchParams.toString();
}

export function createAdminReportsClient({
  apiBaseUrl,
  fetchFn = fetch,
}: AdminReportsClientOptions = {}): AdminReportsClient {
  return {
    listProjectEntries(accessToken, projectId, query) {
      const search = buildProjectTimeEntriesQuery(query);

      return requestJson({
        accessToken,
        apiBaseUrl,
        fetchFn,
        path: `/projects/${projectId}/time-entries?${search}`,
        responseSchema: timeEntryListResponseSchema,
      });
    },
  };
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const adminReportsClient = createAdminReportsClient({
  apiBaseUrl,
  fetchFn: fetch,
});
