import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { TimeEntryResponse } from "@gitiempo/shared";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";

/* eslint-disable no-unused-vars */
interface StartTimerClient {
  startTimer(accessToken: string, taskId: string): Promise<TimeEntryResponse>;
}
/* eslint-enable no-unused-vars */

interface UseStartTimerMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: StartTimerClient;
}

export const useStartTimerMutation = (options: UseStartTimerMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      options.client.startTimer(
        requireAccessToken(toValue(options.accessToken)),
        taskId,
      ),
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
