import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { TimeEntryResponse, UpdateTimeEntryInput } from "@gitiempo/shared";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";
import { timeEntryQueryKeys, timerQueryKeys } from "../keys";

/* eslint-disable no-unused-vars */
interface UpdateTimeEntryClient {
  updateEntry(
    accessToken: string,
    entryId: string,
    input: UpdateTimeEntryInput,
  ): Promise<TimeEntryResponse>;
}
/* eslint-enable no-unused-vars */

interface UseUpdateTimeEntryMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: UpdateTimeEntryClient;
}

export const useUpdateTimeEntryMutation = (options: UseUpdateTimeEntryMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, input }: { entryId: string; input: UpdateTimeEntryInput }) =>
      options.client.updateEntry(
        requireAccessToken(toValue(options.accessToken)),
        entryId,
        input,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: timeEntryQueryKeys.ownTimeEntriesRoot }),
        queryClient.invalidateQueries({ queryKey: timeEntryQueryKeys.recentOwnTimeEntries }),
        queryClient.invalidateQueries({ queryKey: timerQueryKeys.current }),
      ]);
    },
  });
};
