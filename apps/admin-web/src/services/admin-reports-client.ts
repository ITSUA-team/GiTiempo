import {
  timeReportExportRequestSchema,
  timeReportRequestSchema,
  timeReportResponseSchema,
  type TimeReportExportRequest,
  type TimeReportRequest,
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
    query?: Partial<TimeReportExportRequest>,
  ): Promise<ReportsCsvExport>;
  getTimeReport(query?: Partial<TimeReportRequest>): Promise<TimeReportResponse>;
}

/**
 * Builds the validated report request body. Reports are requested with JSON,
 * so filters are named properties and the schema rejects anything not on the
 * contract.
 */
export function buildTimeReportBody(
  query: Partial<TimeReportRequest> | undefined,
): TimeReportRequest {
  return timeReportRequestSchema.parse(query ?? {});
}

/**
 * Builds the validated export request body. The export is a POST with JSON,
 * so filters travel as named properties instead of a query string and the
 * schema rejects anything not on the contract.
 */
export function buildTimeReportExportBody(
  query: Partial<TimeReportExportRequest> | undefined,
): TimeReportExportRequest {
  return timeReportExportRequestSchema.parse(query ?? {});
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
  query: Pick<TimeReportExportRequest, 'dateFrom' | 'dateTo' | 'format'>,
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
      const body = buildTimeReportExportBody(query);
      const response = await apiClient.request({
        body,
        method: 'POST',
        path: '/reports/time/export',
      });
      const blob = await response.blob();

      return {
        blob,
        filename: getExportFilename(
          response.headers.get('Content-Disposition'),
          body,
          blob.type,
        ),
      };
    },

    getTimeReport(query) {
      return apiClient.requestJson({
        body: buildTimeReportBody(query),
        method: 'POST',
        path: '/reports/time',
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
