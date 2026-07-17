import {
  timeReportExportQuerySchema,
  timeReportQuerySchema,
  timeReportResponseSchema,
  type TimeReportExportQuery,
  type TimeReportQuery,
  type TimeReportResponse,
} from '@gitiempo/shared';
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from '@/services/api-client';


interface AdminReportsClientOptions {
  apiClient: Pick<AuthenticatedApiClient, 'request' | 'requestJson'>;
}

export interface ReportsCsvExport {
  blob: Blob;
  filename: string;
}

export interface AdminReportsClient {
  exportTimeReport(
    query?: Partial<TimeReportExportQuery>,
  ): Promise<ReportsCsvExport>;
  getTimeReport(
    query?: Partial<TimeReportQuery>,
  ): Promise<TimeReportResponse>;
}


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
  searchParams.set('groupBy', parsed.groupBy.join(','));
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

  searchParams.set('format', parsed.format);
  searchParams.set('groupBy', parsed.groupBy.join(','));
  searchParams.set('sortBy', parsed.sortBy);
  searchParams.set('sortOrder', parsed.sortOrder);
  setIfDefined(searchParams, 'dateFrom', parsed.dateFrom);
  setIfDefined(searchParams, 'dateTo', parsed.dateTo);
  setIfDefined(searchParams, 'projectId', parsed.projectId);
  setIfDefined(searchParams, 'userId', parsed.userId);
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
  apiClient,
}: AdminReportsClientOptions): AdminReportsClient {
  return {
    async exportTimeReport(query) {
      const search = buildTimeReportExportQuery(query);
      const response = await apiClient.request({
        method: 'GET',
        path: `/reports/time/export?${search}`,
      });

      return {
        blob: await response.blob(),
        filename: getFilenameFromContentDisposition(
          response.headers.get('Content-Disposition'),
        ),
      };
    },

    getTimeReport(query) {
      const search = buildTimeReportQuery(query);

      return apiClient.requestJson({
        path: `/reports/time?${search}`,
        responseSchema: timeReportResponseSchema,
      });
    },
  };
}

function createDefaultAdminReportsClient(): AdminReportsClient {
  return createAdminReportsClient({
    apiClient: getAuthenticatedAppApiClient(),
  });
}

export const adminReportsClient: AdminReportsClient = {
  exportTimeReport(query) {
    return createDefaultAdminReportsClient().exportTimeReport(query);
  },
  getTimeReport(query) {
    return createDefaultAdminReportsClient().getTimeReport(query);
  },
};
