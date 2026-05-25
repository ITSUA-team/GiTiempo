import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { TimeEntryResponse } from "@gitiempo/shared";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";

/* eslint-disable no-unused-vars */
interface StopTimerClient {
  stopTimer(accessToken: string): Promise<TimeEntryResponse>;
}
/* eslint-enable no-unused-vars */

interface UseStopTimerMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: StopTimerClient;
}

export const useStopTimerMutation = (options: UseStopTimerMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      options.client.stopTimer(requireAccessToken(toValue(options.accessToken))),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["current_timer"] }),
        queryClient.invalidateQueries({ queryKey: ["own_time_entries"] }),
        queryClient.invalidateQueries({ queryKey: ["recent_own_time_entries"] }),
        queryClient.invalidateQueries({ queryKey: ["all_own_time_entries"] }),
      ]);
    },
  });
};
