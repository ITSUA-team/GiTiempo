import { type ComputedRef, type Ref } from 'vue';
import type { ReportDocument } from '@gitiempo/shared';

import type { AdminReportsClient } from '@/services/admin-reports-client';

interface UseReportExportOptions {
  enabled: Ref<boolean> | ComputedRef<boolean>;
  reportsClient: AdminReportsClient;
}

export function useReportExport({
  enabled,
  reportsClient,
}: UseReportExportOptions) {
  // The client builds the on-screen report document and the server only styles
  // it into a PDF. CSV is built entirely client-side (see report-csv.ts) and
  // never reaches the backend, so both formats match the screen exactly.
  async function exportReportPdf(
    document: ReportDocument,
  ): Promise<Blob | null> {
    if (!enabled.value) {
      return null;
    }

    return reportsClient.exportReportPdf(document);
  }

  return { exportReportPdf };
}
