import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";
import { timeEntryQueryKeys, timerQueryKeys } from "../keys";

/* eslint-disable no-unused-vars */
interface DeleteTimeEntryClient {
  deleteEntry(accessToken: string, entryId: string): Promise<void>;
}
/* eslint-enable no-unused-vars */

interface UseDeleteTimeEntryMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: DeleteTimeEntryClient;
}

export const useDeleteTimeEntryMutation = (options: UseDeleteTimeEntryMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) =>
      options.client.deleteEntry(
        requireAccessToken(toValue(options.accessToken)),
        entryId,
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
