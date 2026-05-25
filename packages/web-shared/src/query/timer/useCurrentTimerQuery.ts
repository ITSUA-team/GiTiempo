import { useQuery } from "@tanstack/vue-query";
import type { CurrentTimeEntryResponse } from "@gitiempo/shared";
import { computed, toValue } from "vue";

import { requireAccessToken } from "../access-token";
import { isQueryEnabled, type QueryAccessOptions } from "../query-options";

/* eslint-disable no-unused-vars */
interface CurrentTimerClient {
  getCurrentTimer(accessToken: string): Promise<CurrentTimeEntryResponse>;
}
/* eslint-enable no-unused-vars */

interface UseCurrentTimerQueryOptions extends QueryAccessOptions {
  client: CurrentTimerClient;
}

export const useCurrentTimerQuery = (options: UseCurrentTimerQueryOptions) =>
  useQuery({
    queryKey: ["current_timer"],
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.getCurrentTimer(
        requireAccessToken(toValue(options.accessToken)),
      ),
  });
