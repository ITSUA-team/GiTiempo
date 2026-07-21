import type { ReportExport } from '@/services/admin-reports-client';

export function downloadReportExport(exportResult: ReportExport): string {
  const url = URL.createObjectURL(exportResult.blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = exportResult.filename;
  link.click();
  URL.revokeObjectURL(url);

  return exportResult.filename;
}
