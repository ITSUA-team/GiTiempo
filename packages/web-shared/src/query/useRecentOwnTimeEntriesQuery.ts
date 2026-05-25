import { useQuery } from "@tanstack/vue-query";
import type { TimeEntryListResponse } from "@gitiempo/shared";
import { computed, toValue } from "vue";

import { requireAccessToken } from "./access-token";
import { isQueryEnabled, type QueryAccessOptions } from "./query-options";

/* eslint-disable no-unused-vars */
interface RecentOwnTimeEntriesClient {
  listOwnEntries(
    accessToken: string,
    query: { limit: 10; page: 1 },
  ): Promise<TimeEntryListResponse>;
}
/* eslint-enable no-unused-vars */

interface UseRecentOwnTimeEntriesQueryOptions extends QueryAccessOptions {
  client: RecentOwnTimeEntriesClient;
}

const recentOwnTimeEntriesQuery = { limit: 10, page: 1 } as const;

export const useRecentOwnTimeEntriesQuery = (
  options: UseRecentOwnTimeEntriesQueryOptions,
) =>
  useQuery({
    queryKey: ["recent_own_time_entries"],
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.listOwnEntries(
        requireAccessToken(toValue(options.accessToken)),
        recentOwnTimeEntriesQuery,
      ),
  });
