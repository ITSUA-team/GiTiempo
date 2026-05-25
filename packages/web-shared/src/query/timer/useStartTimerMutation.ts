import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { TimeEntryResponse } from "@gitiempo/shared";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";
import { timeEntryQueryKeys, timerQueryKeys } from "../keys";

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
        queryClient.invalidateQueries({ queryKey: timerQueryKeys.current }),
        queryClient.invalidateQueries({ queryKey: timeEntryQueryKeys.ownTimeEntriesRoot }),
        queryClient.invalidateQueries({ queryKey: timeEntryQueryKeys.recentOwnTimeEntries }),
      ]);
    },
  });
};
