import { type ComputedRef, type Ref } from 'vue';
import type { TimeReportExportFormat } from '@gitiempo/shared';

import { useExportTimeReportMutation } from '@/composables/query';
import { toTimeReportExportQuery, type ReportSetupFilters } from '@/lib/report-view-model';
import type { AdminServerStateScope } from '@/lib/query-keys';
import type {
  AdminReportsClient,
  ReportsCsvExport,
} from '@/services/admin-reports-client';

interface UseReportExportOptions {
  enabled: Ref<boolean> | ComputedRef<boolean>;
  reportsClient: AdminReportsClient;
  scope: Ref<AdminServerStateScope> | ComputedRef<AdminServerStateScope>;
}

export function useReportExport({
  enabled,
  reportsClient,
  scope,
}: UseReportExportOptions) {
  const exportReportMutation = useExportTimeReportMutation({
    client: reportsClient,
    scope,
  });

  async function exportCurrentReport(
    filters: ReportSetupFilters,
    format: TimeReportExportFormat = 'csv',
  ): Promise<ReportsCsvExport | null> {
    if (!enabled.value) {
      return null;
    }

    return exportReportMutation.mutateAsync({
      ...toTimeReportExportQuery(filters),
      format,
    });
  }

  return { exportCurrentReport };
}
