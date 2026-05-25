import { useQuery } from "@tanstack/vue-query";
import type { TimeReportQuery, TimeReportResponse } from "@gitiempo/shared";
import { computed, toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";
import { isQueryEnabled, type QueryAccessOptions } from "../query-options";

/* eslint-disable no-unused-vars */
interface TimeReportClient {
  getTimeReport(
    accessToken: string,
    query?: Partial<TimeReportQuery>,
  ): Promise<TimeReportResponse>;
}
/* eslint-enable no-unused-vars */

interface UseTimeReportQueryOptions extends QueryAccessOptions {
  client: TimeReportClient;
  query: MaybeRefOrGetter<Partial<TimeReportQuery>>;
}

export const useTimeReportQuery = (options: UseTimeReportQueryOptions) =>
  useQuery({
    queryKey: computed(() => ["time_report", toValue(options.query)]),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.getTimeReport(
        requireAccessToken(toValue(options.accessToken)),
        toValue(options.query),
      ),
  });
