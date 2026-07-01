import { type ComputedRef, type Ref } from 'vue';

import { useExportTimeReportMutation } from '@/composables/query';
import { toTimeReportExportQuery, type ReportSetupFilters } from '@/lib/report-view-model';
import type { AdminServerStateScope } from '@/lib/query-keys';
import type {
  AdminReportsClient,
  ReportsCsvExport,
} from '@/services/admin-reports-client';

interface UseReportExportOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  reportsClient: AdminReportsClient;
  scope: Ref<AdminServerStateScope> | ComputedRef<AdminServerStateScope>;
}

export function useReportExport({
  accessToken,
  reportsClient,
  scope,
}: UseReportExportOptions) {
  const exportReportMutation = useExportTimeReportMutation({
    accessToken,
    client: reportsClient,
    scope,
  });

  async function exportCurrentReport(
    filters: ReportSetupFilters,
  ): Promise<ReportsCsvExport | null> {
    if (!accessToken.value) {
      return null;
    }

    return exportReportMutation.mutateAsync(toTimeReportExportQuery(filters));
  }

  return { exportCurrentReport };
}
