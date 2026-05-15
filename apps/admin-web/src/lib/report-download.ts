import type { ReportsCsvExport } from '@/services/admin-reports-client';

export function downloadReportExport(exportResult: ReportsCsvExport): string {
  const url = URL.createObjectURL(exportResult.blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = exportResult.filename;
  link.click();
  URL.revokeObjectURL(url);

  return exportResult.filename;
}
