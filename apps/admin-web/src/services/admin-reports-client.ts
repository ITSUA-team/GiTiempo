import {
  reportPdfExportRequestSchema,
  timeReportRequestSchema,
  timeReportResponseSchema,
  type ReportDocument,
  type TimeReportRequest,
  type TimeReportResponse,
} from '@gitiempo/shared';
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from '@/services/api-client';

interface AdminReportsClientOptions {
  apiClient: Pick<AuthenticatedApiClient, 'request' | 'requestJson'>;
}

/** A downloaded report blob and the filename the caller should save it as. */
export interface ReportExport {
  blob: Blob;
  filename: string;
}

export interface AdminReportsClient {
  // Renders the on-screen report document to a PDF; the caller names the file.
  exportReportPdf(document: ReportDocument): Promise<Blob>;
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

export function createAdminReportsClient({
  apiClient,
}: AdminReportsClientOptions): AdminReportsClient {
  return {
    async exportReportPdf(document) {
      const body = reportPdfExportRequestSchema.parse({ document });
      const response = await apiClient.request({
        body,
        method: 'POST',
        path: '/reports/time/export/pdf',
      });

      return response.blob();
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
  exportReportPdf(document) {
    return createDefaultAdminReportsClient().exportReportPdf(document);
  },
  getTimeReport(query) {
    return createDefaultAdminReportsClient().getTimeReport(query);
  },
};
