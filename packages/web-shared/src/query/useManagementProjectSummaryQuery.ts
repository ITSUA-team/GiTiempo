import { useQuery } from "@tanstack/vue-query";
import type { ManagementProjectSummaryResponse } from "@gitiempo/shared";
import { computed, toValue } from "vue";

import { requireAccessToken } from "./access-token";
import { isQueryEnabled, type QueryAccessOptions } from "./query-options";

/* eslint-disable no-unused-vars */
interface ManagementProjectSummaryClient {
  getManagementSummary(accessToken: string): Promise<ManagementProjectSummaryResponse>;
}
/* eslint-enable no-unused-vars */

interface UseManagementProjectSummaryQueryOptions extends QueryAccessOptions {
  client: ManagementProjectSummaryClient;
}

export const useManagementProjectSummaryQuery = (
  options: UseManagementProjectSummaryQueryOptions,
) =>
  useQuery({
    queryKey: ["management_project_summary"],
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.getManagementSummary(
        requireAccessToken(toValue(options.accessToken)),
      ),
  });
