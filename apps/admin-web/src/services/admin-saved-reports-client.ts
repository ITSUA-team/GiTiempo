import {
  createSavedReportSchema,
  savedReportListResponseSchema,
  savedReportSchema,
  updateSavedReportSchema,
  type CreateSavedReportInput,
  type SavedReport,
  type SavedReportListResponse,
  type UpdateSavedReportInput,
} from '@gitiempo/shared';
import type { AuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { getAuthenticatedAppApiClient } from '@/services/api-client';

interface AdminSavedReportsClientOptions {
  apiClient: Pick<AuthenticatedApiClient, 'requestJson' | 'requestNoContent'>;
}

export interface AdminSavedReportsClient {
  createSavedReport(input: CreateSavedReportInput): Promise<SavedReport>;
  deleteSavedReport(id: string): Promise<void>;
  listSavedReports(): Promise<SavedReportListResponse>;
  updateSavedReport(
    id: string,
    input: UpdateSavedReportInput,
  ): Promise<SavedReport>;
}

const basePath = '/reports/saved';

export function createAdminSavedReportsClient({
  apiClient,
}: AdminSavedReportsClientOptions): AdminSavedReportsClient {
  return {
    createSavedReport(input) {
      return apiClient.requestJson({
        body: createSavedReportSchema.parse(input),
        method: 'POST',
        path: basePath,
        responseSchema: savedReportSchema,
      });
    },

    async deleteSavedReport(id) {
      await apiClient.requestNoContent({
        method: 'DELETE',
        path: `${basePath}/${id}`,
      });
    },

    listSavedReports() {
      return apiClient.requestJson({
        path: basePath,
        responseSchema: savedReportListResponseSchema,
      });
    },

    updateSavedReport(id, input) {
      return apiClient.requestJson({
        body: updateSavedReportSchema.parse(input),
        method: 'PATCH',
        path: `${basePath}/${id}`,
        responseSchema: savedReportSchema,
      });
    },
  };
}

let defaultAdminSavedReportsClient: AdminSavedReportsClient | null = null;

export function getAdminSavedReportsClient(): AdminSavedReportsClient {
  defaultAdminSavedReportsClient ??= createAdminSavedReportsClient({
    apiClient: getAuthenticatedAppApiClient(),
  });

  return defaultAdminSavedReportsClient;
}
