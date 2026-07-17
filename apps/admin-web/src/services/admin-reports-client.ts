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

/**
 * The download name must never depend on response headers: cross-origin
 * responses can hide Content-Disposition entirely, and a hardcoded .csv
 * fallback used to relabel real PDF documents as CSV files. Prefer the
 * server-sent name when readable, otherwise rebuild the same
 * `time-report-<from>_<to>.<ext>` convention from the request dates and the
 * actual content type of the downloaded blob.
 */
function getExportFilename(
  contentDisposition: string | null,
  query: Pick<TimeReportExportQuery, 'dateFrom' | 'dateTo' | 'format'>,
  blobType: string,
): string {
  const filenameMatch = contentDisposition
    ? /filename="?([^";]+)"?/i.exec(contentDisposition)
    : null;
  const serverFilename = filenameMatch?.[1]?.trim();
  if (serverFilename) {
    return serverFilename;
  }

  const extension =
    blobType.includes('pdf') || query.format === 'pdf' ? 'pdf' : 'csv';
  const dates =
    query.dateFrom && query.dateTo
      ? `-${query.dateFrom.slice(0, 10)}_${query.dateTo.slice(0, 10)}`
      : '';

  return `time-report${dates}.${extension}`;
}

export function createAdminReportsClient({
  apiClient,
}: AdminReportsClientOptions): AdminReportsClient {
  return {
    async exportTimeReport(query) {
      const parsed = timeReportExportQuerySchema.parse(query ?? {});
      const search = buildTimeReportExportQuery(parsed);
      const response = await apiClient.request({
        method: 'GET',
        path: `/reports/time/export?${search}`,
      });
      const blob = await response.blob();

      return {
        blob,
        filename: getExportFilename(
          response.headers.get('Content-Disposition'),
          parsed,
          blob.type,
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
