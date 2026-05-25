import { useQuery } from "@tanstack/vue-query";
import type { TimeEntryListQuery, TimeEntryListResponse } from "@gitiempo/shared";
import { computed, toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "./access-token";
import { isQueryEnabled, type QueryAccessOptions } from "./query-options";

/* eslint-disable no-unused-vars */
interface OwnTimeEntriesClient {
  listOwnEntries(
    accessToken: string,
    query?: Partial<TimeEntryListQuery>,
  ): Promise<TimeEntryListResponse>;
}
/* eslint-enable no-unused-vars */

interface UseOwnTimeEntriesQueryOptions extends QueryAccessOptions {
  client: OwnTimeEntriesClient;
  query: MaybeRefOrGetter<Partial<TimeEntryListQuery>>;
}

export const useOwnTimeEntriesQuery = (options: UseOwnTimeEntriesQueryOptions) =>
  useQuery({
    queryKey: computed(() => ["own_time_entries", toValue(options.query)]),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () =>
      options.client.listOwnEntries(
        requireAccessToken(toValue(options.accessToken)),
        toValue(options.query),
      ),
  });
