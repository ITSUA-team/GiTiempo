import { useMutation } from "@tanstack/vue-query";
import type { TimeReportExportQuery } from "@gitiempo/shared";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";

interface ReportsCsvExport {
  blob: Blob;
  filename: string;
}

/* eslint-disable no-unused-vars */
interface ExportTimeReportClient {
  exportTimeReport(
    accessToken: string,
    query?: Partial<TimeReportExportQuery>,
  ): Promise<ReportsCsvExport>;
}
/* eslint-enable no-unused-vars */

interface UseExportTimeReportMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: ExportTimeReportClient;
}

export const useExportTimeReportMutation = (
  options: UseExportTimeReportMutationOptions,
) =>
  useMutation({
    mutationFn: (query: Partial<TimeReportExportQuery>) =>
      options.client.exportTimeReport(
        requireAccessToken(toValue(options.accessToken)),
        query,
      ),
  });
