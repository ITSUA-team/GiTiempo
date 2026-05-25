import { useMutation } from '@tanstack/vue-query';
import type { TimeReportExportQuery } from '@gitiempo/shared';

import type { AdminReportsClient } from '@/services/admin-reports-client';

type ReportsExportClient = Pick<AdminReportsClient, 'exportTimeReport'>;

interface UseReportsExportMutationOptions {
  reportsClient: ReportsExportClient;
  token: () => string;
}

export function useReportsExportMutation(options: UseReportsExportMutationOptions) {
  const exportReportMutation = useMutation({
    mutationFn: (query: Partial<TimeReportExportQuery>) =>
      options.reportsClient.exportTimeReport(options.token(), query),
  });

  return {
    exportReport: exportReportMutation.mutateAsync,
    exportReportMutation,
  };
}
