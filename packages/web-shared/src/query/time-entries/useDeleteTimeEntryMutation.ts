import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";

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
        queryClient.invalidateQueries({ queryKey: ["own_time_entries"] }),
        queryClient.invalidateQueries({ queryKey: ["recent_own_time_entries"] }),
        queryClient.invalidateQueries({ queryKey: ["all_own_time_entries"] }),
        queryClient.invalidateQueries({ queryKey: ["current_timer"] }),
      ]);
    },
  });
};
