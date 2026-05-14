import {
  timeEntryListQuerySchema,
  timeEntryListResponseSchema,
  timeReportExportQuerySchema,
  timeReportQuerySchema,
  timeReportResponseSchema,
  type TimeEntryListQuery,
  type TimeEntryListResponse,
  type TimeReportExportQuery,
  type TimeReportQuery,
  type TimeReportResponse,
} from '@gitiempo/shared';
import {
  getRequestUrl,
  getResponseErrorMessage,
  requestJson,
} from '@gitiempo/web-shared/http';

/* eslint-disable no-unused-vars */

interface AdminReportsClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface ReportsCsvExport {
  blob: Blob;
  filename: string;
}

export interface AdminReportsClient {
  exportTimeReport(
    accessToken: string,
    query?: Partial<TimeReportExportQuery>,
  ): Promise<ReportsCsvExport>;
  getTimeReport(
    accessToken: string,
    query?: Partial<TimeReportQuery>,
  ): Promise<TimeReportResponse>;
  listProjectEntries(
    accessToken: string,
    projectId: string,
    query?: Partial<TimeEntryListQuery>,
  ): Promise<TimeEntryListResponse>;
}

/* eslint-enable no-unused-vars */

const fallbackExportFilename = 'time-report.csv';

function setIfDefined(
  searchParams: URLSearchParams,
  key: string,
  value: string | number | undefined,
): void {
  if (value !== undefined) {
    searchParams.set(key, String(value));
  }
}

export function buildTimeReportQuery(
  query: Partial<TimeReportQuery> | undefined,
): string {
  const parsed = timeReportQuerySchema.parse(query ?? {});
  const searchParams = new URLSearchParams();

  searchParams.set('page', String(parsed.page));
  searchParams.set('limit', String(parsed.limit));
  searchParams.set('groupBy', parsed.groupBy);
  searchParams.set('sortBy', parsed.sortBy);
  searchParams.set('sortOrder', parsed.sortOrder);
  setIfDefined(searchParams, 'dateFrom', parsed.dateFrom);
  setIfDefined(searchParams, 'dateTo', parsed.dateTo);
  setIfDefined(searchParams, 'projectId', parsed.projectId);
  setIfDefined(searchParams, 'userId', parsed.userId);
  setIfDefined(searchParams, 'search', parsed.search);

  return searchParams.toString();
}

export function buildTimeReportExportQuery(
  query: Partial<TimeReportExportQuery> | undefined,
): string {
  const parsed = timeReportExportQuerySchema.parse(query ?? {});
  const searchParams = new URLSearchParams();

  searchParams.set('groupBy', parsed.groupBy);
  searchParams.set('sortBy', parsed.sortBy);
  searchParams.set('sortOrder', parsed.sortOrder);
  setIfDefined(searchParams, 'dateFrom', parsed.dateFrom);
  setIfDefined(searchParams, 'dateTo', parsed.dateTo);
  setIfDefined(searchParams, 'projectId', parsed.projectId);
  setIfDefined(searchParams, 'userId', parsed.userId);
  setIfDefined(searchParams, 'search', parsed.search);

  return searchParams.toString();
}

export function buildProjectTimeEntriesQuery(
  query: Partial<TimeEntryListQuery> | undefined,
): string {
  const parsed = timeEntryListQuerySchema.parse(query ?? {});
  const searchParams = new URLSearchParams();

  searchParams.set('page', String(parsed.page));
  searchParams.set('limit', String(parsed.limit));
  setIfDefined(searchParams, 'dateFrom', parsed.dateFrom);
  setIfDefined(searchParams, 'dateTo', parsed.dateTo);
  setIfDefined(searchParams, 'projectId', parsed.projectId);
  setIfDefined(searchParams, 'taskId', parsed.taskId);
  setIfDefined(searchParams, 'search', parsed.search);

  return searchParams.toString();
}

function getFilenameFromContentDisposition(value: string | null): string {
  if (!value) {
    return fallbackExportFilename;
  }

  const filenameMatch = /filename="?([^";]+)"?/i.exec(value);
  return filenameMatch?.[1]?.trim() || fallbackExportFilename;
}

export function createAdminReportsClient({
  apiBaseUrl,
  fetchFn = fetch,
}: AdminReportsClientOptions = {}): AdminReportsClient {
  return {
    async exportTimeReport(accessToken, query) {
      const search = buildTimeReportExportQuery(query);
      const response = await fetchFn(
        getRequestUrl(apiBaseUrl, `/reports/time/export?${search}`),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          method: 'GET',
        },
      );

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      return {
        blob: await response.blob(),
        filename: getFilenameFromContentDisposition(
          response.headers.get('Content-Disposition'),
        ),
      };
    },

    getTimeReport(accessToken, query) {
      const search = buildTimeReportQuery(query);

      return requestJson({
        accessToken,
        apiBaseUrl,
        fetchFn,
        path: `/reports/time?${search}`,
        responseSchema: timeReportResponseSchema,
      });
    },

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
