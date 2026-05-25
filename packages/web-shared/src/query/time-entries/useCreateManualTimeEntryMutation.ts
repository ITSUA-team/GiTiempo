import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { CreateManualTimeEntryInput, TimeEntryResponse } from "@gitiempo/shared";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";

/* eslint-disable no-unused-vars */
interface CreateManualTimeEntryClient {
  createManualEntry(
    accessToken: string,
    input: CreateManualTimeEntryInput,
  ): Promise<TimeEntryResponse>;
}
/* eslint-enable no-unused-vars */

interface UseCreateManualTimeEntryMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: CreateManualTimeEntryClient;
}

export const useCreateManualTimeEntryMutation = (
  options: UseCreateManualTimeEntryMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateManualTimeEntryInput) =>
      options.client.createManualEntry(
        requireAccessToken(toValue(options.accessToken)),
        input,
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
