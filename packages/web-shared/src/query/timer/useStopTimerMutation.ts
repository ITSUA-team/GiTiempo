import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { TimeEntryResponse } from "@gitiempo/shared";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";
import { timeEntryQueryKeys, timerQueryKeys } from "../keys";

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
        queryClient.invalidateQueries({ queryKey: timerQueryKeys.current }),
        queryClient.invalidateQueries({ queryKey: timeEntryQueryKeys.ownTimeEntriesRoot }),
        queryClient.invalidateQueries({ queryKey: timeEntryQueryKeys.recentOwnTimeEntries }),
      ]);
    },
  });
};
